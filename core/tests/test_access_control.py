"""Phase 1: ownership checks. A logged-in stranger must never reach another user's data."""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, GraduateCounselor
from accounts.tests.factories import UserFactory
from core.models import Session, ChatMessage, TriageSession


@pytest.fixture
def world(db):
    seeker = UserFactory(role=User.GENERAL_USER)
    stranger = UserFactory(role=User.GENERAL_USER)
    counselor_user = UserFactory(role=User.COUNSELOR)
    counselor = GraduateCounselor.objects.create(user=counselor_user, is_verified=True)
    other_counselor_user = UserFactory(role=User.COUNSELOR)
    GraduateCounselor.objects.create(user=other_counselor_user, is_verified=True)
    session = Session.objects.create(user=seeker, counselor=counselor, status=Session.PAYMENT_PENDING)
    ChatMessage.objects.create(session=session, sender=seeker, message_text="private words")
    return dict(seeker=seeker, stranger=stranger, counselor_user=counselor_user,
                other_counselor_user=other_counselor_user, session=session)


def client_for(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


class TestSessionMessages:
    def url(self, s):
        return reverse('session-messages', args=[s.id])

    def test_stranger_cannot_read_messages(self, world):
        r = client_for(world['stranger']).get(self.url(world['session']))
        assert r.status_code == status.HTTP_404_NOT_FOUND
        assert "private words" not in r.content.decode()

    def test_unrelated_counselor_cannot_read_messages(self, world):
        r = client_for(world['other_counselor_user']).get(self.url(world['session']))
        assert r.status_code == status.HTTP_404_NOT_FOUND

    def test_participants_can_read_messages(self, world):
        for key in ('seeker', 'counselor_user'):
            r = client_for(world[key]).get(self.url(world['session']))
            assert r.status_code == status.HTTP_200_OK
            assert r.json()[0]['text'] == "private words"


class TestSessionDetail:
    def url(self, s):
        return reverse('session-detail', args=[s.id])

    def test_stranger_cannot_read_session(self, world):
        r = client_for(world['stranger']).get(self.url(world['session']))
        assert r.status_code == status.HTTP_404_NOT_FOUND

    def test_participant_can_read_session(self, world):
        r = client_for(world['seeker']).get(self.url(world['session']))
        assert r.status_code == status.HTTP_200_OK


class TestVerifyPayment:
    def url(self, s):
        return reverse('verify-payment', args=[s.id])

    def test_stranger_cannot_mark_paid(self, world):
        r = client_for(world['stranger']).post(self.url(world['session']))
        assert r.status_code == status.HTTP_404_NOT_FOUND
        world['session'].refresh_from_db()
        assert world['session'].status == Session.PAYMENT_PENDING

    def test_provider_cannot_mark_paid(self, world):
        r = client_for(world['counselor_user']).post(self.url(world['session']))
        assert r.status_code == status.HTTP_404_NOT_FOUND
        world['session'].refresh_from_db()
        assert world['session'].status == Session.PAYMENT_PENDING

    def test_seeker_can_pay_own_session(self, world):
        r = client_for(world['seeker']).post(self.url(world['session']))
        assert r.status_code == status.HTTP_200_OK
        world['session'].refresh_from_db()
        assert world['session'].status == Session.PAID


class TestTriageIsolation:
    def test_cannot_respond_to_someone_elses_triage(self, world):
        triage = TriageSession.objects.create(user=world['seeker'])
        before = triage.turn_count
        r = client_for(world['stranger']).post(
            reverse('triage-respond'),
            {'triage_session_id': triage.id, 'response': 'hello'}, format='json')
        assert r.status_code == status.HTTP_404_NOT_FOUND
        triage.refresh_from_db()
        assert triage.turn_count == before

    def test_unknown_triage_id_is_404_not_500(self, world):
        r = client_for(world['seeker']).post(
            reverse('triage-respond'),
            {'triage_session_id': 999999, 'response': 'hello'}, format='json')
        assert r.status_code == status.HTTP_404_NOT_FOUND

    def test_seeker_triage_payload_has_no_clinical_fields(self, world):
        TriageSession.objects.create(
            user=world['seeker'],
            crisis_flags=['suicidal ideation'],
            suspected_conditions=['MDD'],
            provisional_conditions=['MDD'],
            intake_dossier='clinical text',
            clinical_summary='clinical summary',
            urgency='critical',
        )
        r = client_for(world['seeker']).get(reverse('triage-active'))
        assert r.status_code == status.HTTP_200_OK
        data = r.json()
        for field in ('crisis_flags', 'suspected_conditions', 'provisional_conditions',
                      'intake_dossier', 'clinical_summary', 'urgency', 'ai_confidence',
                      'specialization_tags', 'functional_impairment'):
            assert field not in data
        assert data['is_crisis'] is True


class TestIntakeClinicianOnly:
    def test_seeker_cannot_read_intake(self, world):
        r = client_for(world['seeker']).get(reverse('session-intake', args=[world['session'].id]))
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_assigned_counselor_passes_the_permission_check(self, world):
        r = client_for(world['counselor_user']).get(reverse('session-intake', args=[world['session'].id]))
        assert r.status_code in (status.HTTP_200_OK, status.HTTP_404_NOT_FOUND)  # 404 = no dossier yet

    def test_stranger_cannot_read_intake(self, world):
        r = client_for(world['stranger']).get(reverse('session-intake', args=[world['session'].id]))
        assert r.status_code == status.HTTP_403_FORBIDDEN
