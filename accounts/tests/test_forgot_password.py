import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch
from accounts.models import User, OTPToken
from accounts.tests.factories import UserFactory

@pytest.mark.django_db
class TestForgotPassword:
    def setup_method(self):
        self.api_client = APIClient()

    @patch('accounts.otp_service.OTPService.send_otp_email')
    def test_forgot_password_request_success(self, mock_send_email):
        user = UserFactory(email='test@example.com')
        url = reverse('forgot-password-request')
        response = self.api_client.post(url, {'email': 'test@example.com'})
        
        assert response.status_code == status.HTTP_200_OK
        assert OTPToken.objects.filter(email='test@example.com', purpose=OTPToken.RESET).exists()
        mock_send_email.assert_called_once()

    @patch('accounts.otp_service.OTPService.send_otp_email')
    def test_forgot_password_request_unknown_email_looks_identical(self, mock_send_email):
        UserFactory(email='known@example.com')
        url = reverse('forgot-password-request')
        a = self.api_client.post(url, {'email': 'known@example.com'})
        b = self.api_client.post(url, {'email': 'nonexistent@example.com'})

        # Same status and body, so the endpoint cannot be used to find accounts
        assert a.status_code == b.status_code == status.HTTP_200_OK
        assert a.json() == b.json()
        # ...but no code is created or mailed for an unknown address
        assert not OTPToken.objects.filter(email='nonexistent@example.com').exists()
        assert mock_send_email.call_count == 1
        
    @patch('accounts.token_service.DeviceTokenService.invalidate_all_user_tokens')
    def test_forgot_password_reset_success(self, mock_clear_devices):
        user = UserFactory(email='test@example.com', password='oldpassword123')
        
        # Generate OTP manually
        from accounts.otp_service import OTPService
        otp_code, otp_token = OTPService.create_otp_for_email('test@example.com', purpose=OTPToken.RESET)

        url = reverse('forgot-password-reset')
        response = self.api_client.post(url, {
            'email': 'test@example.com',
            'otp_code': otp_code,
            'new_password': 'Tr0ub4dor-horse-battery'
        })

        assert response.status_code == status.HTTP_200_OK

        # Check password changed
        user.refresh_from_db()
        assert user.check_password('Tr0ub4dor-horse-battery')
        
        mock_clear_devices.assert_called_once_with(user.id)
        
    def test_forgot_password_reset_invalid_otp(self):
        user = UserFactory(email='test@example.com', password='oldpassword123')
        
        url = reverse('forgot-password-reset')
        response = self.api_client.post(url, {
            'email': 'test@example.com',
            'otp_code': '000000',
            'new_password': 'newpassword123'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'otp_code' in response.data or 'non_field_errors' in response.data
