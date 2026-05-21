import pytest
from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User, GraduateCounselor, OTPToken
from accounts.otp_service import OTPService
from accounts.tests.factories import UserFactory


@pytest.mark.django_db
class TestOTPRegistration:
    def setup_method(self):
        self.client = APIClient()

    def test_request_otp_success(self, monkeypatch):
        monkeypatch.setattr(
            'accounts.otp_service.OTPService.send_otp_email',
            lambda email, otp_code, user_name=None: True
        )

        response = self.client.post(
            reverse('request-otp'),
            {'email': 'otpuser@example.com', 'role': 'GENERAL_USER'},
            format='json'
        )

        assert response.status_code == 200
        assert response.data['email'] == 'otpuser@example.com'
        assert response.data['role'] == 'GENERAL_USER'
        assert OTPToken.objects.filter(
            email='otpuser@example.com', is_verified=False).exists()

    def test_verify_otp_invalid(self):
        OTPService.create_otp_for_email('invalidotp@example.com')

        response = self.client.post(
            reverse('verify-otp'),
            {'email': 'invalidotp@example.com', 'otp_code': '000000'},
            format='json'
        )

        assert response.status_code == 400
        assert 'Invalid or expired OTP' in response.data['detail']

    def test_verify_otp_expired(self):
        token = OTPToken.objects.create(
            email='expiredotp@example.com',
            otp_code='123456',
            expires_at=timezone.now() - timedelta(minutes=5),
            is_verified=False,
        )

        response = self.client.post(
            reverse('verify-otp'),
            {'email': token.email, 'otp_code': token.otp_code},
            format='json'
        )

        assert response.status_code == 400
        assert 'Invalid or expired OTP' in response.data['detail']

    def test_register_counselor_unverified(self):
        email = 'counselor@example.com'
        otp_code, _ = OTPService.create_otp_for_email(email)
        assert OTPService.verify_otp(email, otp_code)

        response = self.client.post(
            reverse('register-counselor'),
            {
                'email': email,
                'username': 'counseloruser',
                'password': 'strongpassword123',
                'password_confirm': 'strongpassword123',
                'first_name': 'Counselor',
                'last_name': 'Example',
                'graduation_year': 2022,
                'university': 'Test University',
                'specialization': 'Anxiety',
                'years_experience': 2,
                'bio': 'Committed to wellness support.',
                'per_minute_rate': '25.00',
            },
            format='json'
        )

        assert response.status_code == 201
        user = User.objects.get(email=email)
        assert user.role == User.COUNSELOR
        counselor_profile = GraduateCounselor.objects.get(user=user)
        assert counselor_profile.is_verified is False
        assert response.data['user']['counselor_profile']['is_verified'] is False

    def test_emergency_contacts_minimum_2(self):
        email = 'generaluser@example.com'
        otp_code, _ = OTPService.create_otp_for_email(email)
        assert OTPService.verify_otp(email, otp_code)

        response = self.client.post(
            reverse('register-general-user'),
            {
                'email': email,
                'username': 'generaluser',
                'password': 'strongpassword123',
                'password_confirm': 'strongpassword123',
                'first_name': 'General',
                'last_name': 'User',
                'phone': '555-555-5555',
                'emergency_contacts': [
                    {'name': 'Contact One', 'phone': '555-555-0001',
                        'relationship': 'Friend'},
                ],
            },
            format='json'
        )

        assert response.status_code == 400
        assert 'emergency_contacts' in response.data

        response = self.client.post(
            reverse('register-general-user'),
            {
                'email': email,
                'username': 'generaluser2',
                'password': 'strongpassword123',
                'password_confirm': 'strongpassword123',
                'first_name': 'General',
                'last_name': 'User',
                'phone': '555-555-5555',
                'emergency_contacts': [
                    {'name': 'Contact One', 'phone': '555-555-0001',
                        'relationship': 'Friend'},
                    {'name': 'Contact Two', 'phone': '555-555-0002',
                        'relationship': 'Family'},
                ],
            },
            format='json'
        )

        assert response.status_code == 201
        assert User.objects.filter(
            email=email, role=User.GENERAL_USER).exists()


@pytest.mark.django_db
class TestLoginAndPermissions:
    def setup_method(self):
        self.client = APIClient()

    def test_login_success(self):
        user = UserFactory(email='login@example.com', username='loginuser')

        response = self.client.post(
            reverse('login'),
            {'email_or_username': user.email, 'password': 'testpass123'},
            format='json'
        )

        assert response.status_code == 200
        assert response.data['user']['email'] == user.email
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_invalid_password(self):
        user = UserFactory(email='login2@example.com', username='loginuser2')

        response = self.client.post(
            reverse('login'),
            {'email_or_username': user.email, 'password': 'wrongpassword'},
            format='json'
        )

        assert response.status_code == 400
        assert 'Invalid email/username or password' in str(response.data)

    def test_token_refresh(self):
        user = UserFactory(email='refresh@example.com', username='refreshuser')
        login_response = self.client.post(
            reverse('login'),
            {'email_or_username': user.email, 'password': 'testpass123'},
            format='json'
        )

        assert login_response.status_code == 200
        refresh_token = login_response.data['refresh']

        response = self.client.post(
            reverse('refresh-token'),
            {'refresh': refresh_token},
            format='json'
        )

        assert response.status_code == 200
        assert 'access' in response.data

    def test_general_user_me_endpoint_returns_no_counselor_profile(self):
        user = UserFactory(email='me@example.com', username='meuser')
        login_response = self.client.post(
            reverse('login'),
            {'email_or_username': user.email, 'password': 'testpass123'},
            format='json'
        )

        assert login_response.status_code == 200
        access_token = login_response.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(reverse('me'))

        assert response.status_code == 200
        assert response.data['role'] == User.GENERAL_USER
        assert response.data['counselor_profile'] is None
