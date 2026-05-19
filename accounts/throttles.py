# accounts/throttles.py
from rest_framework.throttling import SimpleRateThrottle


class LoginThrottle(SimpleRateThrottle):
    """Rate limit login attempts: 5 per minute"""
    scope = 'login'
    rate = '100/min'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return None  # Don't throttle authenticated users

        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class RegisterThrottle(SimpleRateThrottle):
    """Rate limit registration attempts: 10 per hour"""
    scope = 'register'
    rate = '100/hour'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class RefreshTokenThrottle(SimpleRateThrottle):
    """Rate limit token refresh: 30 per hour"""
    scope = 'refresh_token'
    rate = '30/hour'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return self.cache_format % {
                'scope': self.scope,
                'ident': request.user.id
            }

        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }
