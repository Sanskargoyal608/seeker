import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from accounts.tests.factories import UserFactory
from core.models import Session
from unittest.mock import patch

@pytest.mark.django_db
class TestAdminTerminateSession:
    def setup_method(self):
        self.api_client = APIClient()

    @patch('accounts.token_service.DeviceTokenService.invalidate_all_user_tokens')
    @patch('core.tasks.calculate_earnings.delay')
    def test_admin_terminate_session_success(self, mock_calc_earnings, mock_invalidate_tokens):
        admin = UserFactory(is_staff=True, is_superuser=True)
        user = UserFactory(role=User.GENERAL_USER, is_active=True)
        session = Session.objects.create(user=user, status=Session.ACTIVE)
        
        self.api_client.force_authenticate(user=admin)
        url = reverse('admin-terminate-session', args=[session.id])
        
        response = self.api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        
        # Check session is ended
        session.refresh_from_db()
        assert session.status == Session.ENDED
        assert session.end_time is not None
        
        # Check user is suspended
        user.refresh_from_db()
        assert user.is_active is False
        
        # Check tokens invalidated
        mock_invalidate_tokens.assert_called_once_with(user.id)
        
        # Check celery task triggered
        mock_calc_earnings.assert_called_once_with(session.id)

    def test_admin_terminate_session_forbidden_for_regular_user(self):
        user = UserFactory(role=User.GENERAL_USER)
        session = Session.objects.create(user=user, status=Session.ACTIVE)
        
        self.api_client.force_authenticate(user=user)
        url = reverse('admin-terminate-session', args=[session.id])
        
        response = self.api_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
