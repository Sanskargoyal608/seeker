# accounts/throttles.py
from rest_framework.throttling import SimpleRateThrottle


class LoginThrottle(SimpleRateThrottle):
    """Rate limit login attempts per client; rate comes from DEFAULT_THROTTLE_RATES['login']."""
    scope = 'login'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return None  # Don't throttle authenticated users

        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class RegisterThrottle(SimpleRateThrottle):
    """Rate limit registration attempts per client; rate comes from DEFAULT_THROTTLE_RATES['register']."""
    scope = 'register'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class RefreshTokenThrottle(SimpleRateThrottle):
    """Rate limit token refresh; rate comes from DEFAULT_THROTTLE_RATES['refresh_token']."""
    scope = 'refresh_token'

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


class _EmailScopedThrottle(SimpleRateThrottle):
    """
    Limits requests per target email address rather than per client IP, so an
    attacker cannot get fresh buckets by spoofing X-Forwarded-For or rotating IPs.
    """

    def get_cache_key(self, request, view):
        email = str(request.data.get('email', '')).strip().lower() if hasattr(request, 'data') else ''
        if not email:
            return None  # no email: the serializer rejects the request anyway
        return self.cache_format % {'scope': self.scope, 'ident': email}


class OTPRequestThrottle(_EmailScopedThrottle):
    """Limit how many codes can be requested (and emailed) for one address."""
    scope = 'otp_request'


class OTPVerifyThrottle(_EmailScopedThrottle):
    """Limit code guesses for one address (on top of the per-code attempt limit)."""
    scope = 'otp_verify'
