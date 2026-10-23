# accounts/token_service.py
"""
Per-device login sessions.

Every login creates its own session ("device") identified by a random id that is
carried as a claim in both the refresh and the access token. Several devices can
be logged in at once and do not affect each other.

  * logout            -> revokes that one device (refresh entry deleted, access
                         tokens for the device rejected)
  * logout everywhere -> bumps User.token_epoch; every token issued before the
    / password reset    bump carries an older epoch and is rejected
"""
import uuid

from django.conf import settings
from django.core.cache import cache
from django.db.models import F
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User


class DeviceTokenService:
    REDIS_PREFIX = 'auth_token'
    REVOKED_PREFIX = 'auth_revoked'

    # ---- keys / lifetimes -------------------------------------------------
    @classmethod
    def _session_key(cls, user_id: int, device_id: str) -> str:
        return f"{cls.REDIS_PREFIX}:{user_id}:{device_id}"

    @classmethod
    def _revoked_key(cls, user_id: int, device_id: str) -> str:
        return f"{cls.REVOKED_PREFIX}:{user_id}:{device_id}"

    @staticmethod
    def _refresh_lifetime_seconds() -> int:
        return int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())

    @staticmethod
    def _access_lifetime_seconds() -> int:
        return int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())

    # ---- issuing ----------------------------------------------------------
    @classmethod
    def generate_tokens(cls, user, user_agent: str = None) -> dict:
        """
        Start a new login session for `user` and return its tokens.
        `user_agent` is accepted for backwards compatibility and ignored: two
        phones with the same app build are two separate devices.
        """
        device_id = uuid.uuid4().hex

        refresh = RefreshToken.for_user(user)
        refresh['device_id'] = device_id
        refresh['epoch'] = user.token_epoch

        cache.set(cls._session_key(user.id, device_id), str(refresh),
                  timeout=cls._refresh_lifetime_seconds())

        return {
            'access': str(refresh.access_token),  # inherits device_id and epoch
            'refresh': str(refresh),
            'device_hash': device_id,  # name kept for the existing clients
        }

    # ---- checking ---------------------------------------------------------
    @classmethod
    def is_device_revoked(cls, user_id: int, device_id) -> bool:
        return bool(device_id) and cache.get(cls._revoked_key(user_id, device_id)) is not None

    @classmethod
    def claims_are_current(cls, user, payload) -> bool:
        """True if a token's claims still describe a live session for `user`."""
        if payload.get('epoch', 0) != user.token_epoch:
            return False
        return not cls.is_device_revoked(user.id, payload.get('device_id'))

    @classmethod
    def refresh_is_active(cls, user, refresh_token: str, payload) -> bool:
        """True if this exact refresh token is the live one for its device."""
        if not cls.claims_are_current(user, payload):
            return False
        device_id = payload.get('device_id')
        if not device_id:
            return False
        return cache.get(cls._session_key(user.id, device_id)) == refresh_token

    # ---- revoking ---------------------------------------------------------
    @classmethod
    def invalidate_device(cls, user_id: int, device_id) -> bool:
        """Log out one device."""
        if not device_id:
            return False
        cache.delete(cls._session_key(user_id, device_id))
        # Access tokens are stateless; reject the device's until they would expire anyway.
        cache.set(cls._revoked_key(user_id, device_id), 1,
                  timeout=cls._access_lifetime_seconds() + 60)
        return True

    @classmethod
    def invalidate_all_user_tokens(cls, user_id: int) -> bool:
        """
        Log a user out everywhere. Every token issued before this call carries an
        older epoch and stops working immediately. Stored in the database, so it
        survives a cache flush.
        """
        User.objects.filter(pk=user_id).update(token_epoch=F('token_epoch') + 1)
        return True
