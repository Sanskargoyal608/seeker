"""Phase 1: WebSocket authentication goes through the same session checks as the REST API."""
import pytest
from channels.testing import WebsocketCommunicator
from django.test import override_settings

from accounts.models import User
from accounts.tests.factories import UserFactory
from accounts.token_service import DeviceTokenService
from core.models import Session

pytestmark = [pytest.mark.django_db(transaction=True), pytest.mark.asyncio]


def make_session_and_tokens():
    user = UserFactory(role=User.GENERAL_USER)
    session = Session.objects.create(user=user, status=Session.WAITING)
    tokens = DeviceTokenService.generate_tokens(user)
    return user, session, tokens


async def connect(session, token, origin=None):
    from config.asgi import application
    headers = [(b'origin', origin.encode())] if origin else []
    comm = WebsocketCommunicator(application, f'/ws/chat/{session.id}/?token={token}', headers=headers)
    connected, _ = await comm.connect()
    if connected:
        await comm.disconnect()
    return connected


async def test_valid_access_token_connects():
    from asgiref.sync import sync_to_async
    _, session, tokens = await sync_to_async(make_session_and_tokens)()
    assert await connect(session, tokens['access']) is True


async def test_refresh_token_is_refused():
    from asgiref.sync import sync_to_async
    _, session, tokens = await sync_to_async(make_session_and_tokens)()
    assert await connect(session, tokens['refresh']) is False


@pytest.mark.parametrize('bad', ['garbage', 'a.b.c', ''])
async def test_garbage_token_is_refused_without_crashing(bad):
    from asgiref.sync import sync_to_async
    _, session, _ = await sync_to_async(make_session_and_tokens)()
    assert await connect(session, bad) is False


async def test_logged_out_everywhere_is_refused():
    from asgiref.sync import sync_to_async
    user, session, tokens = await sync_to_async(make_session_and_tokens)()
    await sync_to_async(DeviceTokenService.invalidate_all_user_tokens)(user.id)
    assert await connect(session, tokens['access']) is False


async def test_logged_out_device_is_refused():
    from asgiref.sync import sync_to_async
    import jwt
    user, session, tokens = await sync_to_async(make_session_and_tokens)()
    device_id = jwt.decode(tokens['access'], options={'verify_signature': False})['device_id']
    await sync_to_async(DeviceTokenService.invalidate_device)(user.id, device_id)
    assert await connect(session, tokens['access']) is False


async def test_deactivated_user_is_refused():
    from asgiref.sync import sync_to_async
    user, session, tokens = await sync_to_async(make_session_and_tokens)()
    user.is_active = False
    await sync_to_async(user.save)()
    assert await connect(session, tokens['access']) is False


@override_settings(ALLOWED_HOSTS=['testserver'])
async def test_foreign_browser_origin_is_refused():
    from asgiref.sync import sync_to_async
    _, session, tokens = await sync_to_async(make_session_and_tokens)()
    assert await connect(session, tokens['access'], origin='http://evil.example') is False


@override_settings(ALLOWED_HOSTS=['testserver'])
async def test_own_origin_and_native_apps_are_allowed():
    from asgiref.sync import sync_to_async
    _, session, tokens = await sync_to_async(make_session_and_tokens)()
    assert await connect(session, tokens['access'], origin='http://testserver') is True
    assert await connect(session, tokens['access']) is True  # native app: no Origin header
