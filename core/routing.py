from django.urls import re_path
from . import consumers
from . import backchannel_consumer

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<session_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
    re_path(r'ws/backchannel/(?P<session_id>\w+)/$', backchannel_consumer.BackchannelConsumer.as_asgi()),
    re_path(r'ws/escalations/$', consumers.EscalationConsumer.as_asgi()),
]
