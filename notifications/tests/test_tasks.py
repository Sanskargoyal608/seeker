import pytest
from unittest.mock import patch
from accounts.models import User
from core.models import Session
from accounts.tests.factories import UserFactory
from notifications.tasks import send_new_message_notification, send_session_reminder, send_feedback_prompt

@pytest.mark.django_db
@patch('notifications.services.fcm_service.NotificationService.send_push_notification')
def test_send_new_message_notification(mock_send_push):
    user = UserFactory(role=User.GENERAL_USER)
    
    send_new_message_notification(user.id, "Test Sender", "Test Message", 1)
    mock_send_push.assert_called()

@pytest.mark.django_db
@patch('notifications.services.fcm_service.NotificationService.send_push_notification')
def test_send_session_reminder(mock_send_push):
    user = UserFactory(role=User.GENERAL_USER)
    
    send_session_reminder(user.id, '1h')
    mock_send_push.assert_called()

@pytest.mark.django_db
@patch('notifications.services.fcm_service.NotificationService.send_push_notification')
def test_send_feedback_prompt(mock_send_push):
    user = UserFactory(role=User.GENERAL_USER)
    session = Session.objects.create(user=user, status=Session.ENDED)
    
    result = send_feedback_prompt(session.id)
    assert "prompt sent" in result
    mock_send_push.assert_called()
