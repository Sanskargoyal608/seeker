import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, GraduateCounselor, LicensedTherapist
from core.models import Session, EscalationEvent
from unittest.mock import patch

@pytest.fixture
def escalation_setup(db):
    user = User.objects.create(email="user@test.com", username="testuser", role=User.GENERAL_USER)
    counselor_user = User.objects.create(email="counselor@test.com", username="counselor", role=User.COUNSELOR)
    therapist_user = User.objects.create(email="therapist@test.com", username="therapist", role=User.THERAPIST)
    
    counselor = GraduateCounselor.objects.create(user=counselor_user, is_verified=True)
    therapist = LicensedTherapist.objects.create(user=therapist_user, is_verified=True)
    
    session = Session.objects.create(user=user, counselor=counselor, status=Session.ACTIVE)
    
    client = APIClient()
    
    return client, user, counselor_user, therapist_user, therapist, session

@pytest.mark.django_db
class TestEscalation:
    
    @patch('core.tasks.send_escalation_notifications.delay')
    def test_escalate_session_success(self, mock_delay, escalation_setup):
        client, _, counselor_user, _, therapist, session = escalation_setup
        client.force_authenticate(user=counselor_user)
        
        url = reverse('escalate-session', kwargs={'session_id': session.id})
        data = {
            'to_therapist': therapist.id,
            'reason': 'User requires licensed psychiatric help',
            'urgency': EscalationEvent.HIGH
        }
        
        response = client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify event was created
        escalation = EscalationEvent.objects.filter(session=session).first()
        assert escalation is not None
        assert escalation.urgency == EscalationEvent.HIGH
        assert escalation.from_counselor.user == counselor_user
        
        # Verify celery task was called
        mock_delay.assert_called_once_with(escalation.id)

    def test_general_user_cannot_escalate(self, escalation_setup):
        client, user, _, _, therapist, session = escalation_setup
        client.force_authenticate(user=user)
        
        url = reverse('escalate-session', kwargs={'session_id': session.id})
        data = {
            'to_therapist': therapist.id,
            'reason': 'Help',
            'urgency': EscalationEvent.HIGH
        }
        
        response = client.post(url, data)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_counselor_escalate_wrong_session(self, escalation_setup):
        client, _, _, _, therapist, _ = escalation_setup
        other_user = User.objects.create(email="other@test.com", username="other", role=User.COUNSELOR)
        other_counselor = GraduateCounselor.objects.create(user=other_user, is_verified=True)
        other_session = Session.objects.create(user=other_user, counselor=other_counselor, status=Session.ACTIVE)
        
        client.force_authenticate(user=other_user)
        # Try to escalate session they don't own
        session = escalation_setup[5]
        url = reverse('escalate-session', kwargs={'session_id': session.id})
        response = client.post(url, {'to_therapist': therapist.id, 'reason': 'Help'})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_escalate_invalid_data(self, escalation_setup):
        client, _, counselor_user, _, _, session = escalation_setup
        client.force_authenticate(user=counselor_user)
        url = reverse('escalate-session', kwargs={'session_id': session.id})
        # Missing reason
        response = client.post(url, {'to_therapist': 1})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
