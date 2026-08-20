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

@shared_task
def send_session_request_notification(therapist_user_id, patient_name, session_id):
    from accounts.models import User
    try:
        user = User.objects.get(id=therapist_user_id)
        NotificationService.send_push_notification(
            user=user,
            title="New Session Request",
            body=f"You have a new session request from {patient_name}.",
            data={'type': 'session_request', 'session_id': str(session_id)}
        )
    except User.DoesNotExist:
        logger.error(f"User {therapist_user_id} not found for session request notification.")

@shared_task
def send_escalation_alert(therapist_user_id, urgency, session_id):
    from accounts.models import User
    try:
        user = User.objects.get(id=therapist_user_id)
        NotificationService.send_push_notification(
            user=user,
            title=f"Escalation Alert ({urgency})",
            body="A counselor has escalated a session to you.",
            data={'type': 'escalation_alert', 'session_id': str(session_id)}
        )
    except User.DoesNotExist:
        logger.error(f"User {therapist_user_id} not found for escalation alert.")

@shared_task
def send_scheduled_session_reminders():
    """
    Checks for scheduled bookings and sends 24-hour and 1-hour reminders via FCM and email.
    """
    from profiles.models import Booking
    from django.core.mail import send_mail
    from django.utils import timezone
    from datetime import timedelta

    now = timezone.now()
    
    # 24-hour reminders
    time_24h_from_now = now + timedelta(hours=24)
    time_24h_window_start = time_24h_from_now - timedelta(minutes=15)
    
    bookings_24h = Booking.objects.filter(
        status=Booking.SCHEDULED,
        reminder_24h_sent=False,
        scheduled_datetime__gte=time_24h_window_start,
        scheduled_datetime__lte=time_24h_from_now
    )
    
    for booking in bookings_24h:
        # Send FCM
        NotificationService.send_push_notification(
            user=booking.user,
            title="Session Reminder (24h)",
            body=f"You have a session scheduled with {booking.therapist.user.first_name} tomorrow at {booking.scheduled_datetime.strftime('%I:%M %p')}.",
            data={'type': 'session_reminder_24h', 'booking_id': str(booking.id)}
        )
        # Send Email
        send_mail(
            subject="Session Reminder (24h)",
            message=f"You have a session scheduled with {booking.therapist.user.first_name} tomorrow at {booking.scheduled_datetime.strftime('%I:%M %p')}.",
            from_email="noreply@seeker.com",
            recipient_list=[booking.user.email],
            fail_silently=False,
        )
        booking.reminder_24h_sent = True
        booking.save()

    # 1-hour reminders
    time_1h_from_now = now + timedelta(hours=1)
    time_1h_window_start = time_1h_from_now - timedelta(minutes=15)
    
    bookings_1h = Booking.objects.filter(
        status=Booking.SCHEDULED,
        reminder_1h_sent=False,
        scheduled_datetime__gte=time_1h_window_start,
        scheduled_datetime__lte=time_1h_from_now
    )
    
    for booking in bookings_1h:
        # Send FCM
        NotificationService.send_push_notification(
            user=booking.user,
            title="Session Reminder (1h)",
            body=f"Your session with {booking.therapist.user.first_name} starts in 1 hour.",
            data={'type': 'session_reminder_1h', 'booking_id': str(booking.id)}
        )
        # Send Email
        send_mail(
            subject="Session Reminder (1h)",
            message=f"Your session with {booking.therapist.user.first_name} starts in 1 hour.",
            from_email="noreply@seeker.com",
            recipient_list=[booking.user.email],
            fail_silently=False,
        )
        booking.reminder_1h_sent = True
        booking.save()

    return f"Processed {bookings_24h.count()} 24h reminders and {bookings_1h.count()} 1h reminders."
