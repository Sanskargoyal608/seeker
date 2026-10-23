"""Phase 2: a cry for help is noticed on every path and always reaches a human."""
import json
from datetime import timedelta
from unittest.mock import patch

import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, GraduateCounselor
from accounts.tests.factories import UserFactory
from accounts.token_service import DeviceTokenService
from core.models import (ChatMessage, CrisisAlert, EmergencyContact, Session, SessionTimer,
                         TriageSession)
from core.services.matching_service import MatchingService
from core.services.triage_service import TriageService
from core.tasks import auto_withdraw_stale_sessions

NORMAL_AI_REPLY = json.dumps({
    "message_to_user": "Thanks for sharing. What has been hardest?",
    "suggested_chips": ["Work", "Family"],
    "extracted_data": {},
    "is_complete": False,
})


@pytest.fixture(autouse=True)
def staff_list(db):
    EmergencyContact.objects.create(email='oncall@test.com', name='On-call', is_active=True)


def seeker_and_session(status_=Session.WAITING, **kwargs):
    user = UserFactory(role=User.GENERAL_USER)
    return user, Session.objects.create(user=user, status=status_, **kwargs)


# --------------------------------------------------------------------------- triage
@pytest.mark.django_db
class TestTriage:
    @patch('core.services.triage_service.TriageService._call_openai', return_value=NORMAL_AI_REPLY)
    def test_keyword_is_caught_even_when_the_ai_misses_it(self, _ai):
        user = UserFactory(role=User.GENERAL_USER)
        triage = TriageService().start_triage(user)
        triage = TriageService().process_response(triage.id, "honestly I want to end my life")

        assert any('keyword:SUICIDE' in f for f in triage.crisis_flags)
        assert triage.is_complete                          # handed on, not left chatting
        alert = CrisisAlert.objects.get()
        assert alert.source == CrisisAlert.TRIAGE and alert.user_id == user.id
        assert len(mail.outbox) == 1
        # the session staff will see is flagged and the alert points at it
        session = triage.resulting_session
        assert session.is_crisis_flagged and alert.session_id == session.id

    @patch('core.services.triage_service.TriageService._call_openai', return_value=NORMAL_AI_REPLY)
    def test_ordinary_triage_raises_nothing(self, _ai):
        user = UserFactory(role=User.GENERAL_USER)
        triage = TriageService().start_triage(user)
        TriageService().process_response(triage.id, "work has been stressful lately")
        assert CrisisAlert.objects.count() == 0 and len(mail.outbox) == 0

    @patch('core.services.triage_service.TriageService._call_openai', return_value=None)
    def test_ai_outage_hands_over_to_a_human_instead_of_looping(self, _ai):
        user = UserFactory(role=User.GENERAL_USER)
        triage = TriageService().start_triage(user)
        triage = TriageService().process_response(triage.id, "I have been feeling low")

        assert triage.is_complete
        assert triage.resulting_session is not None
        assert triage.resulting_session.status == Session.WAITING
        last = triage.messages.order_by('-id').first().content
        assert 'trouble' in last and 'person' in last      # honest, not a canned "I am here"

    @patch('core.services.triage_service.TriageService._call_openai', return_value=None)
    def test_ai_outage_does_not_hide_a_crisis(self, _ai):
        user = UserFactory(role=User.GENERAL_USER)
        triage = TriageService().start_triage(user)
        triage = TriageService().process_response(triage.id, "I am going to kill myself tonight")

        assert triage.resulting_session.is_crisis_flagged
        assert len(mail.outbox) == 1

    @patch('core.services.triage_service.TriageService._call_openai', return_value=NORMAL_AI_REPLY)
    def test_seeker_gets_helplines_with_the_crisis_response(self, _ai):
        user = UserFactory(role=User.GENERAL_USER)
        triage = TriageService().start_triage(user)
        TriageService().process_response(triage.id, "I want to die")
        c = APIClient()
        c.force_authenticate(user=user)
        # triage is complete now, so read it through the active/respond serializer path
        r = c.post(reverse('triage-respond'), {'triage_session_id': triage.id, 'response': 'hello'}, format='json')
        body = r.json()
        assert body['is_crisis'] is True
        phones = [h['phone'] for h in body['crisis_support']['helplines']]
        assert '112' in phones or '14416' in phones


# --------------------------------------------------------------------- REST messages
@pytest.mark.django_db
class TestRestMessages:
    def post(self, user, session, text):
        c = APIClient()
        c.force_authenticate(user=user)
        return c.post(reverse('session-messages', args=[session.id]), {'message': text}, format='json')

    def test_crisis_message_via_rest_is_scanned(self):
        seeker, session = seeker_and_session(Session.ACTIVE)
        r = self.post(seeker, session, "I want to kill myself")
        assert r.status_code == status.HTTP_201_CREATED
        assert r.json()['crisis_support']['helplines']
        assert CrisisAlert.objects.filter(session=session).count() == 1
        assert len(mail.outbox) == 1

    def test_provider_asking_about_suicide_is_not_a_crisis(self):
        seeker, session = seeker_and_session(Session.ACTIVE)
        cu = UserFactory(role=User.COUNSELOR)
        session.counselor = GraduateCounselor.objects.create(user=cu, is_verified=True)
        session.save()
        r = self.post(cu, session, "Have you had thoughts of suicide?")
        assert r.status_code == status.HTTP_201_CREATED
        assert 'crisis_support' not in r.json()
        assert CrisisAlert.objects.count() == 0


# ------------------------------------------------------------------------ live chat
pytestmark_ws = [pytest.mark.django_db(transaction=True), pytest.mark.asyncio]


def _ws_setup(expired):
    seeker, session = seeker_and_session(Session.PAYMENT_PENDING if expired else Session.ACTIVE)
    if expired:
        SessionTimer.objects.create(session=session, end_time=timezone.now() - timedelta(minutes=1))
    token = DeviceTokenService.generate_tokens(seeker)['access']
    return seeker, session, token


async def _send(session, token, text):
    from config.asgi import application
    comm = WebsocketCommunicator(application, f'/ws/chat/{session.id}/?token={token}')
    connected, _ = await comm.connect()
    assert connected
    await comm.receive_json_from()  # first timer.update / payment.required
    await comm.send_json_to({'type': 'message', 'message': text})
    received = []
    # Drain whatever the server sends in response, without cancelling the connection.
    while not await comm.receive_nothing(timeout=1):
        received.append(await comm.receive_json_from())
    await comm.disconnect()
    return received


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_crisis_message_after_the_free_window_is_not_held_for_payment():
    seeker, session, token = await sync_to_async(_ws_setup)(expired=True)

    frames = await _send(session, token, "I want to end my life")
    types = [f['type'] for f in frames]

    assert 'crisis.support' in types
    support = next(f for f in frames if f['type'] == 'crisis.support')
    assert support['helplines'] and 'help is on the way' not in support['message'].lower()
    assert 'payment.required' not in types                 # not paywalled...
    held = await sync_to_async(ChatMessage.objects.filter(session=session, is_held_for_payment=True).count)()
    assert held == 0                                       # ...and not held back

    assert await sync_to_async(CrisisAlert.objects.filter(session=session).count)() == 1
    assert len(mail.outbox) == 1


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_ordinary_message_after_the_free_window_is_still_held():
    seeker, session, token = await sync_to_async(_ws_setup)(expired=True)
    frames = await _send(session, token, "what time works for you?")
    assert 'payment.required' in [f['type'] for f in frames]
    assert await sync_to_async(CrisisAlert.objects.count)() == 0


# ---------------------------------------------------------------- queue and withdrawal
@pytest.mark.django_db
class TestQueueAndWithdrawal:
    def old(self, session, minutes=90):
        Session.objects.filter(pk=session.pk).update(created_at=timezone.now() - timedelta(minutes=minutes))

    def test_crisis_sessions_jump_the_queue(self):
        _, first = seeker_and_session()
        _, urgent = seeker_and_session(is_crisis_flagged=True)
        assert list(MatchingService.get_waiting_sessions())[0].id == urgent.id

    def test_stale_crisis_session_is_never_withdrawn(self):
        _, crisis = seeker_and_session(is_crisis_flagged=True)
        self.old(crisis)
        auto_withdraw_stale_sessions()
        crisis.refresh_from_db()
        assert crisis.status == Session.WAITING

    def test_stale_directed_session_is_not_withdrawn(self):
        from accounts.models import LicensedTherapist
        tu = UserFactory(role=User.THERAPIST)
        t = LicensedTherapist.objects.create(user=tu, is_verified=True)
        _, directed = seeker_and_session(therapist=t)
        self.old(directed)
        auto_withdraw_stale_sessions()
        directed.refresh_from_db()
        assert directed.status == Session.WAITING

    def test_ordinary_stale_session_is_withdrawn_and_the_seeker_is_told(self):
        from notifications.models import Notification
        seeker, stale = seeker_and_session()
        self.old(stale)
        auto_withdraw_stale_sessions()
        stale.refresh_from_db()
        assert stale.status == Session.ENDED and stale.end_time is not None
        assert Notification.objects.filter(user=seeker, notification_type='session_withdrawn').exists()
