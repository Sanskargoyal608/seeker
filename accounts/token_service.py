# accounts/token_service.py
import hashlib
import json
from django.core.cache import cache
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from datetime import timedelta


class DeviceTokenService:
    """
    Manages device-based token storage in Redis.
    Ensures tokens are device-specific and can be revoked per device.
    """

    TOKEN_EXPIRY_DAYS = 10
    REDIS_PREFIX = 'auth_token'

    @staticmethod
    def _get_device_hash(user_agent: str = None) -> str:
        """
        Generate a device hash from User-Agent.
        Falls back to a generic hash if User-Agent is not provided.
        """
        if not user_agent:
            user_agent = 'unknown-device'
        return hashlib.sha256(user_agent.encode()).hexdigest()[:16]

    @staticmethod
    def _get_redis_key(user_id: int, device_hash: str) -> str:
        """Generate Redis key for storing device tokens"""
        return f"{DeviceTokenService.REDIS_PREFIX}:{user_id}:{device_hash}"

    @classmethod
    def generate_tokens(cls, user, user_agent: str = None) -> dict:
        """
        Generate JWT tokens and store refresh token in Redis.
        Returns access token, refresh token, and device hash.
        """
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        device_hash = cls._get_device_hash(user_agent)
        redis_key = cls._get_redis_key(user.id, device_hash)

        # Store in Redis with 10-day expiry
        token_data = {
            'access': access_token,
            'refresh': refresh_token,
            'user_id': user.id,
            'device_hash': device_hash,
            'created_at': timezone.now().isoformat(),
        }

        cache.set(redis_key, json.dumps(token_data),
                  timeout=60*60*24*cls.TOKEN_EXPIRY_DAYS)

        return {
            'access': access_token,
            'refresh': refresh_token,
            'device_hash': device_hash,
        }

    @classmethod
    def verify_token_valid(cls, user_id: int, refresh_token: str, user_agent: str = None) -> bool:
        """
        Verify if a refresh token is valid for the given device.
        Returns True if valid, False otherwise.
        """
        device_hash = cls._get_device_hash(user_agent)
        redis_key = cls._get_redis_key(user_id, device_hash)

        token_data = cache.get(redis_key)
        if not token_data:
            return False

        try:
            stored_tokens = json.loads(token_data)
            return stored_tokens.get('refresh') == refresh_token
        except (json.JSONDecodeError, TypeError):
            return False

    @classmethod
    def invalidate_token(cls, user_id: int, user_agent: str = None) -> bool:
        """
        Invalidate a token for the given device (logout).
        Removes the token from Redis.
        """
        device_hash = cls._get_device_hash(user_agent)
        redis_key = cls._get_redis_key(user_id, device_hash)
        cache.delete(redis_key)
        return True

    @classmethod
    def invalidate_all_user_tokens(cls, user_id: int) -> bool:
        """
        Invalidate all tokens for a user across all devices.
        Use case: Force logout from all devices on password change.
        """
        # Since we don't have a way to query all Redis keys with a pattern
        # using Django cache, we store a blacklist key.
        blacklist_key = f"{cls.REDIS_PREFIX}:blacklist:{user_id}"
        cache.set(blacklist_key, timezone.now().isoformat(),
                  timeout=60*60*24*cls.TOKEN_EXPIRY_DAYS)
        return True

    @classmethod
    def is_user_globally_blacklisted(cls, user_id: int) -> bool:
        """Check if a user is globally blacklisted (all tokens invalidated)"""
        blacklist_key = f"{cls.REDIS_PREFIX}:blacklist:{user_id}"
        return cache.get(blacklist_key) is not None
