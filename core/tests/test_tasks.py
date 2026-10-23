import pytest
from datetime import timedelta
from django.utils import timezone
from core.models import Session, TriageSession
from core.tasks import queue_timeout_task
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
