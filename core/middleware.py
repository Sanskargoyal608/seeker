import urllib.parse
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token):
    try:
        # Verify the token
        UntypedToken(token)
        # Decode manually to get user_id
        import jwt
        from django.conf import settings
        decoded_data = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = decoded_data['user_id']
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, jwt.DecodeError, User.DoesNotExist):
        return AnonymousUser()

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
