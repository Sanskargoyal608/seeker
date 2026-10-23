import pytest
from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from accounts.tests.factories import UserFactory
from core.models import Session, CrisisAlert, EmergencyContact


@pytest.mark.django_db
class TestPanicButton:
    def setup_method(self):
        self.api_client = APIClient()
        EmergencyContact.objects.create(email='oncall@test.com', name='On-call', is_active=True)

    def press(self, user):
        self.api_client.force_authenticate(user=user)
        return self.api_client.post(reverse('user-panic-button'))

    def test_with_active_session_flags_it_and_alerts_staff(self):
        user = UserFactory(role=User.GENERAL_USER)
        session = Session.objects.create(user=user, status=Session.ACTIVE)

        response = self.press(user)
        assert response.status_code == status.HTTP_200_OK

        session.refresh_from_db()
        assert session.is_crisis_flagged is True
        alert = CrisisAlert.objects.get()
        assert alert.session_id == session.id and alert.source == CrisisAlert.PANIC

        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ['oncall@test.com']
        assert f'session {session.id}' in mail.outbox[0].body

    def test_without_a_session_is_still_recorded_and_sent(self):
        user = UserFactory(role=User.GENERAL_USER)

        assert self.press(user).status_code == status.HTTP_200_OK

        alert = CrisisAlert.objects.get()
        assert alert.session is None and alert.user_id == user.id and alert.source == CrisisAlert.PANIC
        assert len(mail.outbox) == 1
        assert 'no active session' in mail.outbox[0].body

    def test_response_gives_real_helplines_and_makes_no_false_promise(self):
        body = self.press(UserFactory(role=User.GENERAL_USER)).json()
        phones = [h['phone'] for h in body['helplines']]
        assert '112' in phones or '14416' in phones
        assert 'help is on the way' not in body['message'].lower()
        assert 'support team' in body['message'].lower()

    def test_pressing_repeatedly_does_not_flood_staff(self):
        user = UserFactory(role=User.GENERAL_USER)
        for _ in range(3):
            self.press(user)
        assert CrisisAlert.objects.count() == 3          # every press is recorded
        assert len(mail.outbox) == 1                     # staff are emailed once
        assert CrisisAlert.objects.filter(suppressed=True).count() == 2
