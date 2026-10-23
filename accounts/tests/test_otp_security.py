"""Phase 1: OTP and password-reset hardening."""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch

from accounts.models import OTPToken, User
from accounts.otp_service import OTPService
from accounts.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

EMAIL = 'victim@example.com'
GOOD_PASSWORD = 'Tr0ub4dor-horse-battery'


def reset(client, code, password=GOOD_PASSWORD, email=EMAIL):
    return client.post(reverse('forgot-password-reset'),
                       {'email': email, 'otp_code': code, 'new_password': password}, format='json')


def wrong_code(real):
    return '000000' if real != '000000' else '111111'


class TestAttemptLimit:
    def test_code_dies_after_five_wrong_guesses(self):
        UserFactory(email=EMAIL)
        code, _ = OTPService.create_otp_for_email(EMAIL, purpose=OTPToken.RESET)
        c = APIClient()
        for _ in range(OTPService.MAX_ATTEMPTS):
            assert reset(c, wrong_code(code)).status_code == status.HTTP_400_BAD_REQUEST
        # The correct code no longer works: the attacker's guesses burned it.
        assert reset(c, code).status_code == status.HTTP_400_BAD_REQUEST
        assert User.objects.get(email=EMAIL).check_password(GOOD_PASSWORD) is False

    def test_registration_code_dies_after_five_wrong_guesses(self):
        code, _ = OTPService.create_otp_for_email('new@example.com')
        for _ in range(OTPService.MAX_ATTEMPTS):
            assert OTPService.verify_otp('new@example.com', wrong_code(code)) is False
        assert OTPService.verify_otp('new@example.com', code) is False


class TestReissueAndReuse:
    def test_new_code_invalidates_the_old_one(self):
        UserFactory(email=EMAIL)
        old, _ = OTPService.create_otp_for_email(EMAIL, purpose=OTPToken.RESET)
        new, _ = OTPService.create_otp_for_email(EMAIL, purpose=OTPToken.RESET)
        assert OTPToken.objects.filter(email=EMAIL, purpose=OTPToken.RESET).count() == 1
        if old != new:
            assert reset(APIClient(), old).status_code == status.HTTP_400_BAD_REQUEST
        with patch('accounts.token_service.DeviceTokenService.invalidate_all_user_tokens'):
            assert reset(APIClient(), new).status_code == status.HTTP_200_OK

    def test_reset_code_is_single_use(self):
        UserFactory(email=EMAIL)
        code, _ = OTPService.create_otp_for_email(EMAIL, purpose=OTPToken.RESET)
        c = APIClient()
        with patch('accounts.token_service.DeviceTokenService.invalidate_all_user_tokens'):
            assert reset(c, code).status_code == status.HTTP_200_OK
            assert reset(c, code, password='An0ther-long-passphrase').status_code == status.HTTP_400_BAD_REQUEST
        assert User.objects.get(email=EMAIL).check_password(GOOD_PASSWORD)


class TestPurposeSeparation:
    def test_registration_code_cannot_reset_a_password(self):
        UserFactory(email=EMAIL)
        code, _ = OTPService.create_otp_for_email(EMAIL, purpose=OTPToken.REGISTER)
        assert reset(APIClient(), code).status_code == status.HTTP_400_BAD_REQUEST

    def test_reset_code_cannot_verify_registration(self):
        code, _ = OTPService.create_otp_for_email('x@example.com', purpose=OTPToken.RESET)
        assert OTPService.verify_otp('x@example.com', code, purpose=OTPToken.REGISTER) is False


class TestPasswordPolicy:
    @pytest.mark.parametrize('weak', ['12345678', 'password', 'short1'])
    def test_reset_rejects_weak_passwords_without_burning_the_code(self, weak):
        UserFactory(email=EMAIL)
        code, _ = OTPService.create_otp_for_email(EMAIL, purpose=OTPToken.RESET)
        r = reset(APIClient(), code, password=weak)
        assert r.status_code == status.HTTP_400_BAD_REQUEST
        assert 'new_password' in r.json()
        token = OTPToken.objects.get(email=EMAIL, purpose=OTPToken.RESET)
        assert token.is_verified is False and token.attempts == 0

    def test_registration_rejects_weak_password(self):
        code, _ = OTPService.create_otp_for_email('new@example.com')
        assert OTPService.verify_otp('new@example.com', code)
        r = APIClient().post(reverse('register-general-user'), {
            'email': 'new@example.com', 'username': 'newbie',
            'password': '12345678', 'password_confirm': '12345678',
            'emergency_contacts': [
                {'name': 'A', 'phone': '9876543210', 'relationship': 'Mother'},
                {'name': 'B', 'phone': '9876543211', 'relationship': 'Friend'}],
        }, format='json')
        assert r.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in r.json()


class TestNoAccountEnumeration:
    @patch('accounts.otp_service.OTPService.send_account_exists_email')
    @patch('accounts.otp_service.OTPService.send_otp_email', return_value=True)
    def test_request_otp_looks_the_same_for_registered_email(self, mock_otp, mock_exists):
        UserFactory(email='taken@example.com')
        url = reverse('request-otp')
        a = APIClient().post(url, {'email': 'taken@example.com', 'role': 'GENERAL_USER'}, format='json')
        b = APIClient().post(url, {'email': 'fresh@example.com', 'role': 'GENERAL_USER'}, format='json')
        assert a.status_code == b.status_code == status.HTTP_200_OK
        assert set(a.json()) == set(b.json())
        assert not OTPToken.objects.filter(email='taken@example.com').exists()
        mock_exists.assert_called_once_with('taken@example.com')

    def test_reset_with_unknown_email_gives_same_error_as_wrong_code(self):
        UserFactory(email=EMAIL)
        code, _ = OTPService.create_otp_for_email(EMAIL, purpose=OTPToken.RESET)
        known = reset(APIClient(), wrong_code(code))
        unknown = reset(APIClient(), '123456', email='nobody@example.com')
        assert known.status_code == unknown.status_code == status.HTTP_400_BAD_REQUEST
        assert known.json() == unknown.json()


class TestThrottles:
    @patch('accounts.otp_service.OTPService.send_otp_email', return_value=True)
    def test_code_requests_are_limited_per_email_even_if_ip_changes(self, _mail):
        url = reverse('forgot-password-request')
        codes = []
        for i in range(6):
            r = APIClient().post(url, {'email': EMAIL}, format='json',
                                 HTTP_X_FORWARDED_FOR=f'10.0.0.{i}')
            codes.append(r.status_code)
        assert codes[:5] == [status.HTTP_200_OK] * 5
        assert codes[5] == status.HTTP_429_TOO_MANY_REQUESTS

    def test_verify_guesses_are_limited_per_email_even_if_ip_changes(self):
        url = reverse('verify-otp')
        results = []
        for i in range(22):
            r = APIClient().post(url, {'email': EMAIL, 'otp_code': '000000'}, format='json',
                                 HTTP_X_FORWARDED_FOR=f'10.0.1.{i}')
            results.append(r.status_code)
        assert status.HTTP_429_TOO_MANY_REQUESTS in results
