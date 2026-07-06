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
        assert OTPToken.objects.filter(email='test@example.com').exists()
        mock_send_email.assert_called_once()
        
    def test_forgot_password_request_invalid_email(self):
        url = reverse('forgot-password-request')
        response = self.api_client.post(url, {'email': 'nonexistent@example.com'})
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
    @patch('accounts.token_service.DeviceTokenService.invalidate_all_user_tokens')
    def test_forgot_password_reset_success(self, mock_clear_devices):
        user = UserFactory(email='test@example.com', password='oldpassword123')
        
        # Generate OTP manually
        from accounts.otp_service import OTPService
        otp_code, otp_token = OTPService.create_otp_for_email('test@example.com')
        
        url = reverse('forgot-password-reset')
        response = self.api_client.post(url, {
            'email': 'test@example.com',
            'otp_code': otp_code,
            'new_password': 'newpassword123'
        })
        
        assert response.status_code == status.HTTP_200_OK
        
        # Check password changed
        user.refresh_from_db()
        assert user.check_password('newpassword123')
        
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
