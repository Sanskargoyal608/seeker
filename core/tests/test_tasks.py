import pytest
from datetime import timedelta
from django.utils import timezone
from core.models import Session, EscalationEvent, TriageSession
from core.tasks import queue_timeout_task, send_escalation_notifications
from accounts.models import User
from accounts.tests.factories import UserFactory, GraduateCounselorFactory
from unittest.mock import patch

@pytest.mark.django_db
@patch('notifications.services.fcm_service.NotificationService.send_push_notification')
def test_check_session_queue_timeouts(mock_send_push):
    # Setup
    user = UserFactory(role=User.GENERAL_USER)
    session = Session.objects.create(
        user=user,
        status=Session.WAITING,
        created_at=timezone.now() - timedelta(minutes=15)
    )
    # The created_at field is auto_now_add=True, so we must update it
    Session.objects.filter(id=session.id).update(created_at=timezone.now() - timedelta(minutes=15))
    
    # Run task
    result = queue_timeout_task()
    
    assert "No available counselors to notify" in result
    
    # Verify session is not cancelled, because queue_timeout_task just notifies counselors
    session.refresh_from_db()
    assert session.status == Session.WAITING
    # We didn't mock counselor availability, so it will return "No available counselors to notify"
    # or "stale sessions"

@pytest.mark.django_db
@patch('core.tasks.send_mail')
def test_send_escalation_notifications(mock_send_mail):
    user = UserFactory(role=User.GENERAL_USER)
    counselor_user = UserFactory(role=User.COUNSELOR)
    counselor = GraduateCounselorFactory(user=counselor_user)
    
    session = Session.objects.create(
        user=user,
        counselor=counselor,
        status=Session.ACTIVE
    )
    
    therapist_user = UserFactory(role=User.THERAPIST)
    from accounts.tests.factories import LicensedTherapistFactory
    therapist = LicensedTherapistFactory(user=therapist_user)

    escalation = EscalationEvent.objects.create(
        session=session,
        from_counselor=counselor,
        to_therapist=therapist,
        reason="Crisis detected",
        urgency=EscalationEvent.MEDIUM,
        status=EscalationEvent.PENDING
    )
    
    result = send_escalation_notifications(escalation.id)
    assert "Escalation notification sent" in result
    mock_send_mail.assert_called()

@pytest.mark.django_db
def test_send_escalation_invalid():
    result = send_escalation_notifications(9999)
    assert "Escalation event not found" in result


