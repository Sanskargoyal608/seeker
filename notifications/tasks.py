from celery import shared_task
from notifications.services.fcm_service import NotificationService
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_new_message_notification(user_id, sender_name, message_preview, session_id):
    """
    Sends a push notification when a new message is received.
    """
    from accounts.models import User
    try:
        user = User.objects.get(id=user_id)
        NotificationService.send_push_notification(
            user=user,
            title=f"New message from {sender_name}",
            body=message_preview,
            data={'type': 'new_message', 'session_id': str(session_id)}
        )
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for new message notification.")

@shared_task
def send_session_reminder(user_id, time_remaining):
    """
    Sends a session reminder (24h or 1h).
    """
    from accounts.models import User
    try:
        user = User.objects.get(id=user_id)
        NotificationService.send_push_notification(
            user=user,
            title="Session Reminder",
            body=f"You have a scheduled session starting in {time_remaining}.",
            data={'type': f'session_reminder_{time_remaining}'}
        )
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for session reminder notification.")

@shared_task
def send_feedback_prompt(session_id):
    """
    Sends a push notification to the user 5 minutes after a session ends
    to prompt them to leave feedback.
    """
    from core.models import Session
    try:
        session = Session.objects.get(id=session_id)
        if session.user:
            NotificationService.send_push_notification(
                user=session.user,
                title="Session Ended",
                body="Your session has ended. Please tap here to provide feedback.",
                data={'type': 'feedback_prompt', 'session_id': str(session.id)}
            )
            return f"Feedback prompt sent to user {session.user.email} for session {session.id}"
        return "No user attached to session."
    except Session.DoesNotExist:
        logger.error(f"Session {session_id} not found for feedback prompt.")
        return "Session not found."
