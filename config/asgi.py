import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

import core.routing

from core.middleware import JWTAuthMiddleware, OriginCheckMiddleware

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': OriginCheckMiddleware(
        JWTAuthMiddleware(
            URLRouter(
                core.routing.websocket_urlpatterns
            )
        )
    ),
})
