# accounts/authentication.py
from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from accounts.token_service import DeviceTokenService

User = get_user_model()


class SessionAwareJWTAuthentication(JWTAuthentication):
    """
    Standard JWT auth plus the session checks simplejwt does not do: a token is
    rejected once its device has logged out, or after the user logged out
    everywhere / reset their password.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)  # raises if missing or inactive
        if not DeviceTokenService.claims_are_current(user, validated_token):
            raise AuthenticationFailed('This session has ended. Please log in again.', code='session_ended')
        return user


def user_from_access_token(raw_token):
    """
    For non-DRF callers (the WebSocket middleware). Returns the active user for a
    valid, live ACCESS token, or None. Refresh tokens and tokens of ended
    sessions are refused.
    """
    try:
        token = AccessToken(raw_token)  # rejects wrong token_type, bad signature, expiry
        user = User.objects.get(id=token['user_id'])
    except (TokenError, KeyError, User.DoesNotExist):
        return None
    if not user.is_active or not DeviceTokenService.claims_are_current(user, token):
        return None
    return user
