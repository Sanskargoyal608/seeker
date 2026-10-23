"""Phase 3, block B: a counselor escalates, a therapist accepts, the patient moves to a new session."""
import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, GraduateCounselor, LicensedTherapist
from accounts.tests.factories import UserFactory
from accounts.token_service import DeviceTokenService
from core.models import EarningsRecord, EscalationRequest, Session, SessionNote
from notifications.models import Notification


def api(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def make_people():
    seeker = UserFactory(role=User.GENERAL_USER)
    cu = UserFactory(role=User.COUNSELOR)
    c = GraduateCounselor.objects.create(user=cu, is_verified=True, per_minute_rate=2)
    tu = UserFactory(role=User.THERAPIST)
    t = LicensedTherapist.objects.create(user=tu, is_verified=True, per_session_rate=1000)
    return seeker, cu, c, tu, t


def live_session(seeker, c):
    from django.utils import timezone
    from datetime import timedelta
    s = Session.objects.create(user=seeker, counselor=c, status=Session.MATCHED,
                               start_time=timezone.now() - timedelta(minutes=20))
    SessionNote.objects.create(session=s, note_text='Intake dossier text', is_private=True)  # no author = AI briefing
    return s


def escalate(cu, session, t, **extra):
    body = {'session_id': session.id, 'therapist_id': t.id, 'urgency': 'HIGH', 'reason': 'Risk of self harm'}
    body.update(extra)
    return api(cu).post(reverse('escalate-create'), body, format='json')


@pytest.mark.django_db
class TestCreate:
    def test_creates_a_pending_request(self):
        seeker, cu, c, tu, t = make_people()
        s = live_session(seeker, c)
        r = escalate(cu, s, t)
        assert r.status_code == status.HTTP_201_CREATED
        e = EscalationRequest.objects.get()
        assert (e.status, e.urgency, e.therapist_id, e.session_id) == ('PENDING', 'HIGH', t.id, s.id)
        s.refresh_from_db()
        assert s.status == Session.MATCHED            # nothing changes until the therapist accepts

    def test_rejects_unknown_urgency_and_empty_reason(self):
        seeker, cu, c, tu, t = make_people()
        s = live_session(seeker, c)
        assert escalate(cu, s, t, urgency='CRITICAL').status_code == status.HTTP_400_BAD_REQUEST
        assert escalate(cu, s, t, reason='  ').status_code == status.HTTP_400_BAD_REQUEST
        assert not EscalationRequest.objects.exists()

    def test_cannot_escalate_the_same_session_twice_while_one_is_waiting(self):
        seeker, cu, c, tu, t = make_people()
        s = live_session(seeker, c)
        assert escalate(cu, s, t).status_code == status.HTTP_201_CREATED
        assert escalate(cu, s, t).status_code == status.HTTP_409_CONFLICT

    def test_cannot_escalate_someone_elses_or_an_ended_session(self):
        seeker, cu, c, tu, t = make_people()
        other_cu = UserFactory(role=User.COUNSELOR)
        GraduateCounselor.objects.create(user=other_cu, is_verified=True)
        s = live_session(seeker, c)
        assert escalate(other_cu, s, t).status_code == status.HTTP_403_FORBIDDEN
        s.status = Session.ENDED
        s.save()
        assert escalate(cu, s, t).status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestAccept:
    def setup_flow(self):
        seeker, cu, c, tu, t = make_people()
        s = live_session(seeker, c)
        escalate(cu, s, t)
        e = EscalationRequest.objects.get()
        return seeker, cu, c, tu, t, s, e

    def respond(self, tu, e, action):
        return api(tu).post(reverse('escalation-respond', args=[e.id]), {'action': action}, format='json')

    def test_accept_starts_a_new_session_and_ends_the_counselors(self):
        seeker, cu, c, tu, t, s, e = self.setup_flow()
        r = self.respond(tu, e, 'ACCEPT')
        assert r.status_code == status.HTTP_200_OK, r.content
        body = r.json()

        s.refresh_from_db()
        new = Session.objects.get(id=body['session_id'])
        assert body['previous_session_id'] == s.id
        # the counselor's session is over
        assert s.status == Session.ENDED and s.end_time is not None and s.duration_minutes >= 19
        # the patient continues with the therapist in a fresh session
        assert (new.user_id, new.therapist_id, new.counselor_id) == (seeker.id, t.id, None)
        assert new.status == Session.ACTIVE and new.start_time is not None and new.escalated_from_id == s.id
        e.refresh_from_db()
        assert e.status == EscalationRequest.ACCEPTED

    def test_the_therapist_inherits_the_intake_briefing(self):
        seeker, cu, c, tu, t, s, e = self.setup_flow()
        new = Session.objects.get(id=self.respond(tu, e, 'ACCEPT').json()['session_id'])
        assert list(new.notes.values_list('note_text', flat=True)) == ['Intake dossier text']

    def test_each_provider_earns_for_their_own_session(self):
        seeker, cu, c, tu, t, s, e = self.setup_flow()
        self.respond(tu, e, 'ACCEPT')
        rec = EarningsRecord.objects.get(session=s)
        assert rec.counselor_id == c.id and rec.pricing == EarningsRecord.PER_MINUTE
        assert not EarningsRecord.objects.filter(therapist=t).exists()   # therapist earns when theirs ends

    def test_patient_and_counselor_are_told(self):
        seeker, cu, c, tu, t, s, e = self.setup_flow()
        new_id = self.respond(tu, e, 'ACCEPT').json()['session_id']
        n = Notification.objects.get(user=seeker, notification_type='session_moved')
        assert str(n.related_id) == str(new_id)
        assert Notification.objects.filter(user=cu, notification_type='escalation_update').exists()

    def test_cannot_answer_twice(self):
        seeker, cu, c, tu, t, s, e = self.setup_flow()
        assert self.respond(tu, e, 'ACCEPT').status_code == status.HTTP_200_OK
        assert self.respond(tu, e, 'ACCEPT').status_code == status.HTTP_409_CONFLICT
        assert self.respond(tu, e, 'DECLINE').status_code == status.HTTP_409_CONFLICT
        assert Session.objects.filter(escalated_from=s).count() == 1

    def test_a_declined_escalation_cannot_be_accepted_later(self):
        seeker, cu, c, tu, t, s, e = self.setup_flow()
        assert self.respond(tu, e, 'DECLINE').status_code == status.HTTP_200_OK
        assert self.respond(tu, e, 'ACCEPT').status_code == status.HTTP_409_CONFLICT
        s.refresh_from_db()
        assert s.status == Session.MATCHED            # the counselor's session carries on

    def test_decline_tells_the_counselor_who_can_pick_another_therapist(self):
        seeker, cu, c, tu, t, s, e = self.setup_flow()
        self.respond(tu, e, 'DECLINE')
        assert Notification.objects.filter(user=cu, notification_type='escalation_update').exists()
        tu2 = UserFactory(role=User.THERAPIST)
        t2 = LicensedTherapist.objects.create(user=tu2, is_verified=True)
        assert escalate(cu, s, t2).status_code == status.HTTP_201_CREATED

    def test_another_therapist_cannot_answer(self):
        seeker, cu, c, tu, t, s, e = self.setup_flow()
        other = UserFactory(role=User.THERAPIST)
        LicensedTherapist.objects.create(user=other, is_verified=True)
        assert self.respond(other, e, 'ACCEPT').status_code == status.HTTP_403_FORBIDDEN

    def test_session_detail_reports_the_hand_over(self):
        seeker, cu, c, tu, t, s, e = self.setup_flow()
        before = api(cu).get(reverse('session-detail', args=[s.id])).json()
        assert before['has_escalation'] is True and before['escalated_to_session_id'] is None
        new_id = self.respond(tu, e, 'ACCEPT').json()['session_id']
        after = api(seeker).get(reverse('session-detail', args=[s.id])).json()
        assert after['escalated_to_session_id'] == new_id


# ----------------------------------------------------------------------- live notices
def token(user):
    return DeviceTokenService.generate_tokens(user)['access']


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_open_chat_is_told_to_move_and_backchannel_opens_for_the_accepting_therapist():
    from config.asgi import application

    def setup():
        seeker, cu, c, tu, t = make_people()
        s = live_session(seeker, c)
        escalate(cu, s, t)
        return seeker, cu, tu, s, EscalationRequest.objects.get()
    seeker, cu, tu, s, e = await sync_to_async(setup)()

    # the patient has the old chat open
    patient = WebsocketCommunicator(application, f'/ws/chat/{s.id}/?token={await sync_to_async(token)(seeker)}')
    assert (await patient.connect())[0]
    await patient.receive_json_from()   # first timer update

    # before accepting, the therapist has no access to the backchannel
    before = WebsocketCommunicator(application, f'/ws/backchannel/{s.id}/?token={await sync_to_async(token)(tu)}')
    assert (await before.connect())[0] is False

    r = await sync_to_async(api(tu).post)(reverse('escalation-respond', args=[e.id]), {'action': 'ACCEPT'}, format='json')
    assert r.status_code == 200

    moved = None
    while not await patient.receive_nothing(timeout=1):
        frame = await patient.receive_json_from()
        if frame['type'] == 'session.moved':
            moved = frame
    assert moved and moved['new_session_id'] == r.json()['session_id']
    await patient.disconnect()

    # after accepting, the therapist and the counselor share the backchannel of the OLD session
    for user in (tu, cu):
        comm = WebsocketCommunicator(application, f'/ws/backchannel/{s.id}/?token={await sync_to_async(token)(user)}')
        assert (await comm.connect())[0] is True
        await comm.disconnect()

    # the patient is not allowed into the backchannel
    nope = WebsocketCommunicator(application, f'/ws/backchannel/{s.id}/?token={await sync_to_async(token)(seeker)}')
    assert (await nope.connect())[0] is False
