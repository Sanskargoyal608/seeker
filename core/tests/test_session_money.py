"""Phase 3, block A: when a session starts, how long it ran, and who earns what."""
from datetime import timedelta
from decimal import Decimal

import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, GraduateCounselor, LicensedTherapist
from accounts.tests.factories import UserFactory
from accounts.token_service import DeviceTokenService
from core.models import ChatMessage, EarningsRecord, Session, SessionTimer
from core.tasks import calculate_earnings
from profiles.models import Booking


def api(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def counselor(rate='2.00'):
    u = UserFactory(role=User.COUNSELOR)
    return u, GraduateCounselor.objects.create(user=u, is_verified=True, per_minute_rate=Decimal(rate))


def therapist(session_rate='1000.00'):
    u = UserFactory(role=User.THERAPIST)
    return u, LicensedTherapist.objects.create(user=u, is_verified=True, per_session_rate=Decimal(session_rate))


def ended_session(minutes, **kwargs):
    seeker = UserFactory(role=User.GENERAL_USER)
    now = timezone.now()
    return Session.objects.create(
        user=seeker, status=Session.ENDED, duration_minutes=minutes,
        start_time=now - timedelta(minutes=minutes), end_time=now, **kwargs)


# ------------------------------------------------------------------ start of a session
@pytest.mark.django_db
class TestSessionStart:
    def test_accepting_starts_the_clock_and_the_free_timer(self):
        seeker = UserFactory(role=User.GENERAL_USER)
        s = Session.objects.create(user=seeker, status=Session.WAITING)
        Session.objects.filter(pk=s.pk).update(created_at=timezone.now() - timedelta(minutes=40))
        cu, _ = counselor()

        before = timezone.now()
        assert api(cu).patch(reverse('accept-session', args=[s.id])).status_code == status.HTTP_200_OK

        s.refresh_from_db()
        assert s.status == Session.MATCHED
        assert s.start_time is not None and s.start_time >= before
        timer = SessionTimer.objects.get(session=s)
        # 15 free minutes from the moment of acceptance, not from the 40 minutes of waiting
        assert timer.end_time - s.start_time == timedelta(minutes=15)

    def test_ending_records_the_real_duration(self):
        seeker = UserFactory(role=User.GENERAL_USER)
        cu, c = counselor()
        s = Session.objects.create(user=seeker, counselor=c, status=Session.MATCHED,
                                   start_time=timezone.now() - timedelta(minutes=12, seconds=30))
        r = api(cu).post(reverse('session-end', args=[s.id]))
        assert r.status_code == status.HTTP_200_OK
        assert r.json()['duration_minutes'] == 12
        s.refresh_from_db()
        assert s.status == Session.ENDED and s.end_time is not None


# ------------------------------------------------------------------------- earnings
@pytest.mark.django_db
class TestEarnings:
    def test_live_counselor_chat_is_per_minute_with_15_percent_fee(self):
        _, c = counselor('2.00')
        s = ended_session(10, counselor=c)
        calculate_earnings(s.id)
        e = EarningsRecord.objects.get(session=s)
        assert e.pricing == EarningsRecord.PER_MINUTE
        assert (e.gross_amount, e.net_amount) == (Decimal('20.00'), Decimal('17.00'))
        assert e.platform_fee_percent == Decimal('15.00') and e.counselor_id == c.id

    def test_therapist_session_is_a_fixed_price_whatever_the_length(self):
        _, t = therapist('1000.00')
        s = ended_session(37, therapist=t)
        calculate_earnings(s.id)
        e = EarningsRecord.objects.get(session=s)
        assert e.pricing == EarningsRecord.PER_SESSION and e.session_rate == Decimal('1000.00')
        assert (e.gross_amount, e.net_amount) == (Decimal('1000.00'), Decimal('850.00'))
        assert e.therapist_id == t.id and e.counselor_id is None

    def test_a_session_under_a_minute_earns_nothing(self):
        _, c = counselor('5.00')
        s = ended_session(0, counselor=c)
        calculate_earnings(s.id)
        assert EarningsRecord.objects.get(session=s).net_amount == Decimal('0.00')

    def test_running_twice_creates_one_record(self):
        _, c = counselor()
        s = ended_session(5, counselor=c)
        calculate_earnings(s.id)
        assert calculate_earnings(s.id) == 'Earnings already calculated.'
        assert EarningsRecord.objects.filter(session=s).count() == 1

    def test_unfinished_session_earns_nothing_yet(self):
        _, c = counselor()
        seeker = UserFactory(role=User.GENERAL_USER)
        s = Session.objects.create(user=seeker, counselor=c, status=Session.ACTIVE)
        assert calculate_earnings(s.id) == 'Session not ended yet.'
        assert not EarningsRecord.objects.exists()

    def test_a_counselor_sees_their_own_earnings_and_nobody_elses(self):
        cu1, c1 = counselor()
        cu2, c2 = counselor()
        s1, s2 = ended_session(10, counselor=c1), ended_session(10, counselor=c2)
        calculate_earnings(s1.id)
        calculate_earnings(s2.id)

        rows = api(cu1).get('/api/core/therapist/earnings/').json()
        assert [r['session'] for r in rows] == [s1.id]
        assert rows[0]['pricing'] == 'PER_MINUTE'


# ------------------------------------------------------------------ booked sessions
@pytest.mark.django_db
class TestBookingStart:
    def make(self):
        seeker = UserFactory(role=User.GENERAL_USER)
        tu, t = therapist()
        b = Booking.objects.create(user=seeker, therapist=t, scheduled_datetime=timezone.now() + timedelta(minutes=5),
                                   duration_minutes=50, status=Booking.SCHEDULED)
        return seeker, tu, t, b

    def test_the_booked_therapist_can_start_it(self):
        seeker, tu, t, b = self.make()
        r = api(tu).post(reverse('booking-start', args=[b.id]))
        assert r.status_code == status.HTTP_200_OK, r.content
        s = Session.objects.get(id=r.json()['session_id'])
        assert s.booking_id == b.id and s.user_id == seeker.id and s.therapist_id == t.id
        assert s.status == Session.ACTIVE and s.start_time is not None

    def test_the_seeker_can_start_it(self):
        seeker, tu, t, b = self.make()
        assert api(seeker).post(reverse('booking-start', args=[b.id])).status_code == status.HTTP_200_OK

    def test_the_other_side_joining_gets_the_same_session(self):
        seeker, tu, t, b = self.make()
        first = api(seeker).post(reverse('booking-start', args=[b.id])).json()['session_id']
        second = api(tu).post(reverse('booking-start', args=[b.id]))
        assert second.status_code == status.HTTP_200_OK and second.json()['session_id'] == first
        assert Session.objects.filter(booking=b).count() == 1

    def test_a_stranger_cannot_start_it(self):
        seeker, tu, t, b = self.make()
        other = UserFactory(role=User.GENERAL_USER)
        assert api(other).post(reverse('booking-start', args=[b.id])).status_code == status.HTTP_403_FORBIDDEN
        other_t, _ = therapist()
        assert api(other_t).post(reverse('booking-start', args=[b.id])).status_code == status.HTTP_403_FORBIDDEN

    def test_an_ended_booked_session_cannot_be_restarted(self):
        seeker, tu, t, b = self.make()
        sid = api(seeker).post(reverse('booking-start', args=[b.id])).json()['session_id']
        Session.objects.filter(id=sid).update(status=Session.ENDED)
        assert api(seeker).post(reverse('booking-start', args=[b.id])).status_code == status.HTTP_400_BAD_REQUEST

    def test_a_booked_session_is_priced_per_session_when_it_ends(self):
        seeker, tu, t, b = self.make()
        sid = api(seeker).post(reverse('booking-start', args=[b.id])).json()['session_id']
        Session.objects.filter(id=sid).update(start_time=timezone.now() - timedelta(minutes=30))
        api(tu).post(reverse('session-end', args=[sid]))
        e = EarningsRecord.objects.get(session_id=sid)
        assert e.pricing == EarningsRecord.PER_SESSION and e.gross_amount == Decimal('1000.00')


# -------------------------------------------------------------------- live chat rules
def _token_for(user):
    return DeviceTokenService.generate_tokens(user)['access']


async def _connect_and_send(session, token, text=None):
    from config.asgi import application
    comm = WebsocketCommunicator(application, f'/ws/chat/{session.id}/?token={token}')
    connected, _ = await comm.connect()
    assert connected
    frames = [await comm.receive_json_from()]
    if text:
        await comm.send_json_to({'type': 'message', 'message': text})
    while not await comm.receive_nothing(timeout=1):
        frames.append(await comm.receive_json_from())
    await comm.disconnect()
    return frames


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_the_free_timer_does_not_run_while_waiting():
    def setup():
        seeker = UserFactory(role=User.GENERAL_USER)
        s = Session.objects.create(user=seeker, status=Session.WAITING)
        return s, _token_for(seeker)
    session, token = await sync_to_async(setup)()
    frames = await _connect_and_send(session, token)
    assert frames[0]['type'] == 'timer.update' and frames[0]['time_remaining_seconds'] == 15 * 60
    assert await sync_to_async(SessionTimer.objects.filter(session=session).count)() == 0
    assert (await sync_to_async(Session.objects.get)(pk=session.pk)).status == Session.WAITING


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_an_ended_session_stays_ended_and_accepts_no_messages():
    def setup():
        seeker = UserFactory(role=User.GENERAL_USER)
        s = Session.objects.create(user=seeker, status=Session.ENDED, start_time=timezone.now() - timedelta(hours=1))
        SessionTimer.objects.create(session=s, end_time=timezone.now() - timedelta(minutes=30))
        return s, _token_for(seeker)
    session, token = await sync_to_async(setup)()
    frames = await _connect_and_send(session, token, text='hello?')
    assert any(f['type'] == 'system.alert' and 'ended' in f['message'] for f in frames)
    assert (await sync_to_async(Session.objects.get)(pk=session.pk)).status == Session.ENDED
    assert await sync_to_async(ChatMessage.objects.filter(session=session).count)() == 0
