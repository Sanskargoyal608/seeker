import urllib.parse

from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.http.request import validate_host

from accounts.authentication import user_from_access_token


@database_sync_to_async
def get_user_from_token(token):
    """
    The active user behind a valid, live ACCESS token, otherwise AnonymousUser.
    Refresh tokens, expired or tampered tokens, deactivated users and sessions
    that were logged out (this device, everywhere, or by a password reset) all
    end up anonymous, and the consumers then refuse the connection.
    """
    return user_from_access_token(token) or AnonymousUser()


class OriginCheckMiddleware:
    """
    Rejects WebSocket connections that come from a browser page on a host we do
    not serve. Native apps send no Origin header and are let through; they are
    authenticated by their token.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        origin = dict(scope.get('headers', [])).get(b'origin')
        if origin:
            host = urllib.parse.urlparse(origin.decode('latin1')).hostname
            if not host or not validate_host(host, settings.ALLOWED_HOSTS):
                # Consume the connect event and refuse the handshake.
                await receive()
                await send({'type': 'websocket.close', 'code': 4003})
                return
        return await self.inner(scope, receive, send)


class JWTAuthMiddleware:
    """
    Custom middleware that extracts the JWT from the query string.
    Expects ws://...?token=<jwt_access_token>
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = urllib.parse.parse_qs(query_string)

        token = query_params.get('token', [None])[0]

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await self.inner(scope, receive, send)
