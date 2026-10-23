"""Phase 1: login sessions are per device; logout everywhere and password reset really end them."""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import OTPToken, User
from accounts.otp_service import OTPService
from accounts.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

PASSWORD = 'Tr0ub4dor-horse-battery'
SAME_PHONE_MODEL = {'HTTP_USER_AGENT': 'okhttp/4.12.0'}  # every install of the app looks identical


@pytest.fixture
def user():
    u = UserFactory(email='sam@example.com')
    u.set_password(PASSWORD)
    u.save()
    return u


def login(user):
    r = APIClient().post(reverse('login'), {'email_or_username': user.email, 'password': PASSWORD},
                         format='json', **SAME_PHONE_MODEL)
    assert r.status_code == status.HTTP_200_OK, r.content
    return r.json()


def api(access):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
    return c


def refresh(refresh_token):
    return APIClient().post(reverse('refresh-token'), {'refresh': refresh_token}, format='json',
                            **SAME_PHONE_MODEL)


def can_call_api(access):
    return api(access).get(reverse('me')).status_code == status.HTTP_200_OK


class TestSeveralDevices:
    def test_second_login_does_not_end_the_first(self, user):
        phone = login(user)
        laptop = login(user)  # same user agent on purpose
        assert phone['device_hash'] != laptop['device_hash']
        assert can_call_api(phone['access']) and can_call_api(laptop['access'])
        assert refresh(phone['refresh']).status_code == status.HTTP_200_OK
        assert refresh(laptop['refresh']).status_code == status.HTTP_200_OK

    def test_logout_ends_only_that_device(self, user):
        phone, laptop = login(user), login(user)
        assert api(phone['access']).post(reverse('logout')).status_code == status.HTTP_200_OK
        # phone is finished: its access token and its refresh token are both dead
        assert not can_call_api(phone['access'])
        assert refresh(phone['refresh']).status_code == status.HTTP_401_UNAUTHORIZED
        # laptop is untouched
        assert can_call_api(laptop['access'])
        assert refresh(laptop['refresh']).status_code == status.HTTP_200_OK


class TestLogoutEverywhere:
    def test_all_devices_are_ended(self, user):
        phone, laptop = login(user), login(user)
        assert api(phone['access']).post(reverse('logout-all')).status_code == status.HTTP_200_OK
        for device in (phone, laptop):
            assert not can_call_api(device['access'])
            assert refresh(device['refresh']).status_code == status.HTTP_401_UNAUTHORIZED

    def test_can_log_in_again_afterwards(self, user):
        old = login(user)
        api(old['access']).post(reverse('logout-all'))
        fresh = login(user)
        assert can_call_api(fresh['access'])
        assert not can_call_api(old['access'])


class TestPasswordResetEndsSessions:
    def test_reset_ends_every_existing_session(self, user):
        phone, laptop = login(user), login(user)
        code, _ = OTPService.create_otp_for_email(user.email, purpose=OTPToken.RESET)
        r = APIClient().post(reverse('forgot-password-reset'),
                             {'email': user.email, 'otp_code': code, 'new_password': 'An0ther-long-passphrase'},
                             format='json')
        assert r.status_code == status.HTTP_200_OK
        for device in (phone, laptop):
            assert not can_call_api(device['access'])
            assert refresh(device['refresh']).status_code == status.HTTP_401_UNAUTHORIZED


class TestRefreshHardening:
    def test_garbage_token_gets_a_generic_error(self, db):
        r = refresh('not-a-token')
        assert r.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'Traceback' not in r.content.decode() and 'refresh failed:' not in r.content.decode()

    def test_access_token_cannot_be_used_to_refresh(self, user):
        tokens = login(user)
        assert refresh(tokens['access']).status_code == status.HTTP_401_UNAUTHORIZED

    def test_deleted_account_sessions_end(self, user):
        tokens = login(user)
        assert api(tokens['access']).delete(reverse('delete-account')).status_code == status.HTTP_200_OK
        assert not can_call_api(tokens['access'])
        assert refresh(tokens['refresh']).status_code == status.HTTP_401_UNAUTHORIZED
