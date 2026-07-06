import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, LicensedTherapist
from accounts.tests.factories import UserFactory
from core.models import Session
from unittest.mock import patch

@pytest.mark.django_db
class TestRequestBudgetSession:
    def setup_method(self):
        self.api_client = APIClient()

    @patch('notifications.tasks.send_session_request_notification.delay')
    def test_request_budget_session_success(self, mock_send_notification):
        user = UserFactory(role=User.GENERAL_USER)
        
        t1_user = UserFactory(role=User.THERAPIST)
        t1 = LicensedTherapist.objects.create(
            user=t1_user, 
            is_verified=True, 
            per_session_rate=100.00
        )
        
        self.api_client.force_authenticate(user=user)
        url = reverse('request-budget-session')
        
        response = self.api_client.post(url, {'therapist_id': t1.id}, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        
        # Check session created
        session = Session.objects.get(user=user, therapist=t1)
        assert session.status == Session.WAITING
        assert session.counselor is None
        
        # Check notification triggered
        mock_send_notification.assert_called_once()
        args, kwargs = mock_send_notification.call_args
        assert kwargs['therapist_user_id'] == t1_user.id
        assert kwargs['patient_name'] == user.first_name or user.email
        assert kwargs['session_id'] == session.id

    def test_request_budget_session_missing_therapist_id(self):
        user = UserFactory(role=User.GENERAL_USER)
        self.api_client.force_authenticate(user=user)
        url = reverse('request-budget-session')
        
        response = self.api_client.post(url, {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_request_budget_session_invalid_therapist(self):
        user = UserFactory(role=User.GENERAL_USER)
        self.api_client.force_authenticate(user=user)
        url = reverse('request-budget-session')
        
        response = self.api_client.post(url, {'therapist_id': 9999}, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_request_budget_session_forbidden_for_counselor(self):
        counselor = UserFactory(role=User.COUNSELOR)
        self.api_client.force_authenticate(user=counselor)
        url = reverse('request-budget-session')
        
        response = self.api_client.post(url, {'therapist_id': 1}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN
