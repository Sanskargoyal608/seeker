# accounts/throttles.py
from rest_framework.throttling import SimpleRateThrottle


class LoginThrottle(SimpleRateThrottle):
    """Rate limit login attempts: 5 per minute"""
    scope = 'login'
    rate = '5/min'

    def get_cache_key(self):
        if self.request.user and self.request.user.is_authenticated:
            return None  # Don't throttle authenticated users

        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(self.request)
        }


class RegisterThrottle(SimpleRateThrottle):
    """Rate limit registration attempts: 10 per hour"""
    scope = 'register'
    rate = '10/hour'

    def get_cache_key(self):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(self.request)
        }


class RefreshTokenThrottle(SimpleRateThrottle):
    """Rate limit token refresh: 30 per hour"""
    scope = 'refresh_token'
    rate = '30/hour'

    def get_cache_key(self):
        if self.request.user and self.request.user.is_authenticated:
            return self.cache_format % {
                'scope': self.scope,
                'ident': self.request.user.id
            }

        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(self.request)
        }
