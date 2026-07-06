import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, GraduateCounselor, LicensedTherapist
from accounts.tests.factories import UserFactory

@pytest.mark.django_db
class TestProfileUpdate:
    def setup_method(self):
        self.api_client = APIClient()

    def test_update_user_fields(self):
        user = UserFactory(first_name='Old', phone='1234567890')
        self.api_client.force_authenticate(user=user)
        
        url = reverse('profile-update')
        response = self.api_client.patch(url, {
            'first_name': 'New',
            'phone': '0987654321'
        })
        
        assert response.status_code == status.HTTP_200_OK
        
        user.refresh_from_db()
        assert user.first_name == 'New'
        assert user.phone == '0987654321'
        
    def test_update_counselor_profile(self):
        user = UserFactory(role=User.COUNSELOR)
        GraduateCounselor.objects.create(user=user, bio='Old bio', per_minute_rate=0.0)
        
        self.api_client.force_authenticate(user=user)
        
        url = reverse('profile-update')
        response = self.api_client.patch(url, {
            'counselor_profile': {
                'bio': 'New bio',
                'per_minute_rate': 10.0
            }
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        user.counselor_profile.refresh_from_db()
        assert user.counselor_profile.bio == 'New bio'
        assert user.counselor_profile.per_minute_rate == 10.0
        
    def test_update_therapist_profile(self):
        user = UserFactory(role=User.THERAPIST)
        LicensedTherapist.objects.create(user=user, bio='Old', per_session_rate=0.0)
        
        self.api_client.force_authenticate(user=user)
        
        url = reverse('profile-update')
        response = self.api_client.patch(url, {
            'therapist_profile': {
                'bio': 'New',
                'per_session_rate': 50.0,
                'languages': ['English', 'Spanish']
            }
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        user.therapist_profile.refresh_from_db()
        assert user.therapist_profile.bio == 'New'
        assert user.therapist_profile.per_session_rate == 50.0
        assert 'Spanish' in user.therapist_profile.languages
