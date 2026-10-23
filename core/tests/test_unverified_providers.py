"""Phase 1: unverified providers may set up their profile, but cannot act on seekers or other providers."""
from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, GraduateCounselor, LicensedTherapist
from accounts.tests.factories import UserFactory
from core.models import Session, EscalationRequest


def client_for(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def make_counselor(verified):
    u = UserFactory(role=User.COUNSELOR)
    return u, GraduateCounselor.objects.create(user=u, is_verified=verified)


def make_therapist(verified):
    u = UserFactory(role=User.THERAPIST)
    return u, LicensedTherapist.objects.create(user=u, is_verified=verified)


@pytest.fixture
def seeker(db):
    return UserFactory(role=User.GENERAL_USER)


class TestUnverifiedCounselor:
    def test_cannot_see_queue(self, seeker):
        Session.objects.create(user=seeker, status=Session.WAITING)
        u, _ = make_counselor(False)
        r = client_for(u).get(reverse('session-queue'))
        assert r.status_code == status.HTTP_403_FORBIDDEN
        assert 'awaiting approval' in r.json()['detail']

    def test_cannot_accept_session(self, seeker):
        s = Session.objects.create(user=seeker, status=Session.WAITING)
        u, _ = make_counselor(False)
        r = client_for(u).patch(reverse('accept-session', args=[s.id]))
        assert r.status_code == status.HTTP_403_FORBIDDEN
        s.refresh_from_db()
        assert s.status == Session.WAITING and s.counselor_id is None

    def test_cannot_escalate(self, seeker):
        u, c = make_counselor(False)
        _, t = make_therapist(True)
        s = Session.objects.create(user=seeker, counselor=c, status=Session.ACTIVE)
        r = client_for(u).post(reverse('escalate-create'),
                               {'session_id': s.id, 'therapist_id': t.id, 'reason': 'x'}, format='json')
        assert r.status_code == status.HTTP_403_FORBIDDEN
        assert not EscalationRequest.objects.exists()

    def test_can_still_view_own_profile(self, db):
        u, _ = make_counselor(False)
        r = client_for(u).get(reverse('me'))
        assert r.status_code == status.HTTP_200_OK


class TestVerifiedCounselorStillWorks:
    def test_sees_and_accepts(self, seeker):
        s = Session.objects.create(user=seeker, status=Session.WAITING)
        u, _ = make_counselor(True)
        c = client_for(u)
        assert [x['id'] for x in c.get(reverse('session-queue')).json()] == [s.id]
        assert c.patch(reverse('accept-session', args=[s.id])).status_code == status.HTTP_200_OK


class TestUnverifiedTherapist:
    def test_cannot_respond_to_escalation(self, seeker):
        cu, c = make_counselor(True)
        tu, t = make_therapist(False)
        s = Session.objects.create(user=seeker, counselor=c, status=Session.ACTIVE)
        e = EscalationRequest.objects.create(counselor=c, therapist=t, session=s, reason='x')
        r = client_for(tu).post(reverse('escalation-respond', args=[e.id]), {'action': 'ACCEPT'}, format='json')
        assert r.status_code == status.HTTP_403_FORBIDDEN
        s.refresh_from_db()
        assert s.therapist_id is None

    def test_cannot_start_follow_up(self, seeker):
        tu, _ = make_therapist(False)
        r = client_for(tu).post(reverse('therapist-follow-up'), {'user_id': seeker.id}, format='json')
        assert r.status_code == status.HTTP_403_FORBIDDEN


class TestUnverifiedAsTarget:
    def test_cannot_escalate_to_unverified_therapist(self, seeker):
        cu, c = make_counselor(True)
        _, t = make_therapist(False)
        s = Session.objects.create(user=seeker, counselor=c, status=Session.ACTIVE)
        r = client_for(cu).post(reverse('escalate-create'),
                                {'session_id': s.id, 'therapist_id': t.id, 'reason': 'x'}, format='json')
        assert r.status_code == status.HTTP_404_NOT_FOUND
        assert not EscalationRequest.objects.exists()

    def test_cannot_request_unverified_therapist(self, seeker):
        _, t = make_therapist(False)
        r = client_for(seeker).post(reverse('request-budget-session'), {'therapist_id': t.id}, format='json')
        assert r.status_code == status.HTTP_404_NOT_FOUND
        assert not Session.objects.exists()

    def test_cannot_book_unverified_therapist(self, seeker):
        _, t = make_therapist(False)
        r = client_for(seeker).post(reverse('booking-create'), {
            'therapist': t.id,
            'scheduled_datetime': (timezone.now() + timedelta(days=2)).isoformat(),
            'duration_minutes': 50,
            'intake_data': {'reason': 'x'},
        }, format='json')
        assert r.status_code == status.HTTP_400_BAD_REQUEST
        assert 'therapist' in r.json()


class TestTherapistDirectedSessionsStayOutOfCounselorQueue:
    def test_requested_session_not_in_queue_and_not_acceptable(self, seeker):
        _, t = make_therapist(True)
        directed = Session.objects.create(user=seeker, therapist=t, status=Session.WAITING)
        open_s = Session.objects.create(user=seeker, status=Session.WAITING)
        u, _ = make_counselor(True)
        c = client_for(u)
        assert [x['id'] for x in c.get(reverse('session-queue')).json()] == [open_s.id]
        assert c.patch(reverse('accept-session', args=[directed.id])).status_code == status.HTTP_404_NOT_FOUND
        directed.refresh_from_db()
        assert directed.counselor_id is None
