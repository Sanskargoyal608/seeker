import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from accounts.tests.factories import UserFactory
from core.models import Session, CrisisAlert
from unittest.mock import patch

@pytest.mark.django_db
class TestPanicButton:
    def setup_method(self):
        self.api_client = APIClient()

    @patch('core.views.send_mail')
    def test_panic_button_with_active_session(self, mock_send_mail):
        user = UserFactory(role=User.GENERAL_USER)
        session = Session.objects.create(user=user, status=Session.ACTIVE)
        
        self.api_client.force_authenticate(user=user)
        url = reverse('user-panic-button')
        
        response = self.api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        
        # Check session is flagged
        session.refresh_from_db()
        assert session.is_crisis_flagged is True
        
        # Check CrisisAlert is created
        assert CrisisAlert.objects.filter(session=session).exists()
        
        # Check email sent
        mock_send_mail.assert_called_once()
        args, kwargs = mock_send_mail.call_args
        assert 'CRITICAL: Panic Button Triggered by' in kwargs['subject']
        assert 'admin@seeker.app' in kwargs['recipient_list']
        assert str(session.id) in kwargs['message']

    @patch('core.views.send_mail')
    def test_panic_button_without_active_session(self, mock_send_mail):
        user = UserFactory(role=User.GENERAL_USER)
        
        self.api_client.force_authenticate(user=user)
        url = reverse('user-panic-button')
        
        response = self.api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        
        # Check email sent
        mock_send_mail.assert_called_once()
        args, kwargs = mock_send_mail.call_args
        assert 'CRITICAL: Panic Button Triggered by' in kwargs['subject']
        assert 'They do not currently have an active session' in kwargs['message']
        
        # No crisis alert created
        assert CrisisAlert.objects.count() == 0
