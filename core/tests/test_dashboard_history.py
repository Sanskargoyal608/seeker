import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, GraduateCounselor, LicensedTherapist
from accounts.tests.factories import UserFactory
from core.models import Session

@pytest.mark.django_db
class TestDashboardHistory:
    def setup_method(self):
        self.api_client = APIClient()

    def test_general_user_dashboard_history(self):
        user = UserFactory(role=User.GENERAL_USER)
        counselor_user = UserFactory(role=User.COUNSELOR)
        counselor = GraduateCounselor.objects.create(user=counselor_user, is_verified=True)
        
        # Create some sessions
        s1 = Session.objects.create(user=user, counselor=counselor, status=Session.ENDED)
        s2 = Session.objects.create(user=user, counselor=counselor, status=Session.ACTIVE)
        
        self.api_client.force_authenticate(user=user)
        url = reverse('user-dashboard')
        response = self.api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'recent_sessions' in data
        assert len(data['recent_sessions']) == 2
        assert data['recent_sessions'][0]['id'] in [s1.id, s2.id]

    def test_counselor_queue_history(self):
        counselor_user = UserFactory(role=User.COUNSELOR)
        counselor = GraduateCounselor.objects.create(user=counselor_user, is_verified=True)
        
        user1 = UserFactory(role=User.GENERAL_USER)
        user2 = UserFactory(role=User.GENERAL_USER)
        
        # Sessions for this counselor
        Session.objects.create(user=user1, counselor=counselor, status=Session.ENDED)
        Session.objects.create(user=user2, counselor=counselor, status=Session.ACTIVE)
        
        # Session for another counselor
        counselor_user2 = UserFactory(role=User.COUNSELOR)
        counselor2 = GraduateCounselor.objects.create(user=counselor_user2, is_verified=True)
        Session.objects.create(user=user1, counselor=counselor2, status=Session.ACTIVE)
        
        self.api_client.force_authenticate(user=counselor_user)
        url = reverse('counselor-queue')
        response = self.api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'recent_sessions' in data
        assert len(data['recent_sessions']) == 2

    def test_therapist_queue_history(self):
        therapist_user = UserFactory(role=User.THERAPIST)
        therapist = LicensedTherapist.objects.create(user=therapist_user, is_verified=True)
        
        user1 = UserFactory(role=User.GENERAL_USER)
        
        # Sessions for this therapist
        Session.objects.create(user=user1, therapist=therapist, status=Session.ENDED)
        
        self.api_client.force_authenticate(user=therapist_user)
        url = reverse('therapist-queue')
        response = self.api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'recent_sessions' in data
        assert len(data['recent_sessions']) == 1
