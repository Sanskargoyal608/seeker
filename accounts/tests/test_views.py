import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, GraduateCounselor, LicensedTherapist
from accounts.otp_service import OTPService
from accounts.tests.factories import UserFactory

@pytest.mark.django_db
class TestLogoutViews:
    def setup_method(self):
        self.client = APIClient()

    def test_logout(self):
        user = UserFactory()
        login_response = self.client.post(
            reverse('login'),
            {'email_or_username': user.email, 'password': 'testpass123'},
            format='json'
        )
        assert login_response.status_code == 200
        access_token = login_response.data['access']
        refresh_token = login_response.data['refresh']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.post(reverse('logout'))
        
        assert response.status_code == 200
        assert 'Logged out' in response.data['detail']

        # Trying to refresh the token should now fail
        refresh_response = self.client.post(
            reverse('refresh-token'),
            {'refresh': refresh_token},
            format='json'
        )
        assert refresh_response.status_code == 401

    def test_logout_all(self):
        user = UserFactory()
        login_response = self.client.post(
            reverse('login'),
            {'email_or_username': user.email, 'password': 'testpass123'},
            format='json'
        )
        access_token = login_response.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.post(reverse('logout-all'))
        
        assert response.status_code == 200
        assert 'Logged out from all devices' in response.data['detail']

@pytest.mark.django_db
class TestRegistrationViews:
    def setup_method(self):
        self.client = APIClient()

    def test_register_therapist_unverified(self):
        email = 'therapist@example.com'
        otp_code, _ = OTPService.create_otp_for_email(email)
        OTPService.verify_otp(email, otp_code)

        data = {
            'email': email,
            'username': 'therapistuser',
            'password': 'strongpassword123',
            'password_confirm': 'strongpassword123',
            'first_name': 'Therapist',
            'last_name': 'Example',
            'license_number': 'LIC-12345',
            'modalities': ['CBT', 'DBT'],
            'languages': ['English'],
            'bio': 'Committed to wellness.',
            'per_minute_rate': '50.00',
            'per_session_rate': '150.00',
        }

        response = self.client.post(reverse('register-therapist'), data, format='json')
        assert response.status_code == 201
        
        user = User.objects.get(email=email)
        assert user.role == User.THERAPIST
        therapist_profile = LicensedTherapist.objects.get(user=user)
        assert not therapist_profile.is_verified
