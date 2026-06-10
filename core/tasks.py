from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

@shared_task
def queue_timeout_task():
    """
    Runs periodically to check if any WAITING sessions have been in the queue for more than 3 minutes.
    If so, it alerts all available counselors.
    For Sprint 6, we use python logging. This will be replaced by FCM push notifications in Sprint 8.
    """
    from core.models import Session
    from accounts.models import GraduateCounselor
    
    timeout_threshold = timezone.now() - timedelta(minutes=3)
    
    # Find sessions still in WAITING that were created before the threshold
    stale_sessions = Session.objects.filter(
        status=Session.WAITING,
        created_at__lt=timeout_threshold,
        is_crisis_flagged=False  # Assuming crisis are handled differently or maybe we want to alert for crisis too? Actually let's alert for all.
    )
    
    stale_sessions = Session.objects.filter(
        status=Session.WAITING,
        created_at__lt=timeout_threshold
    )
    
    if not stale_sessions.exists():
        return "No stale sessions found."
    
    # Get available counselors
    # Assuming CounselorAvailability exists and status is AVAILABLE
    from core.models import CounselorAvailability
    available_counselors = CounselorAvailability.objects.filter(status=CounselorAvailability.AVAILABLE)
    
    if not available_counselors.exists():
        logger.warning(f"Queue Timeout: {stale_sessions.count()} sessions waiting > 3 mins, but NO counselors are available.")
        return "No available counselors to notify."
    
    from notifications.services.fcm_service import NotificationService

    # Send FCM push notification to all available counselors
    notified_count = 0
    for ca in available_counselors:
        res = NotificationService.send_push_notification(
            user=ca.counselor.user,
            title="Session Request",
            body=f"There are {stale_sessions.count()} sessions waiting for over 3 minutes!",
            data={'type': 'session_request'}
        )
        notified_count += 1
    
    logger.info(
        f"FCM PUSH NOTIFICATION: {stale_sessions.count()} sessions have been waiting for over 3 minutes! "
        f"Notified {notified_count} counselors."
    )
    
    return f"Alerted {notified_count} counselors about {stale_sessions.count()} stale sessions."

from django.core.mail import send_mail

@shared_task
def send_escalation_notifications(escalation_id):
    from core.models import EscalationEvent
    from notifications.services.fcm_service import NotificationService

    try:
        escalation = EscalationEvent.objects.get(id=escalation_id)
        therapist_user = escalation.to_therapist.user
        therapist_email = therapist_user.email
        
        # ACTUAL FCM PUSH NOTIFICATION
        NotificationService.send_push_notification(
            user=therapist_user,
            title=f"Urgent: Session Escalation [{escalation.urgency}]",
            body=f"Reason: {escalation.reason}",
            data={'type': 'escalation_alert', 'session_id': str(escalation.session.id)}
        )
        
        # ACTUAL SMTP EMAIL NOTIFICATION
        send_mail(
            subject=f"Urgent: Session Escalation [{escalation.urgency}]",
            message=f"A session has been escalated to you by a counselor.\n\n"
                    f"Session ID: {escalation.session.id}\n"
                    f"Urgency: {escalation.urgency}\n"
                    f"Reason: {escalation.reason}\n\n"
                    f"Please log in to the backchannel to assist.",
            from_email="noreply@seeker.com",
            recipient_list=[therapist_email],
            fail_silently=False,
        )
        
        return f"Escalation notification sent to {therapist_email}"
    except EscalationEvent.DoesNotExist:
        return "Escalation event not found."

@shared_task
def calculate_earnings(session_id):
    from core.models import Session, EarningsRecord
    from decimal import Decimal
    try:
        session = Session.objects.get(id=session_id)
        if session.status != Session.ENDED:
            return "Session not ended yet."
            
        if EarningsRecord.objects.filter(session=session).exists():
            return "Earnings already calculated."
            
        rate = Decimal('0.00')
        counselor = None
        therapist = None
        
        if session.counselor:
            rate = session.counselor.per_minute_rate
            counselor = session.counselor
        elif session.therapist:
            rate = session.therapist.per_minute_rate
            therapist = session.therapist
        else:
            return "No counselor or therapist assigned."
            
        duration = session.duration_minutes
        gross_amount = rate * Decimal(duration)
        platform_fee_percent = Decimal('20.00')
        net_amount = gross_amount * (Decimal('100.00') - platform_fee_percent) / Decimal('100.00')
        
        EarningsRecord.objects.create(
            session=session,
            counselor=counselor,
            therapist=therapist,
            duration_minutes=duration,
            rate_per_minute=rate,
            gross_amount=gross_amount,
            platform_fee_percent=platform_fee_percent,
            net_amount=net_amount
        )
        
        return f"Earnings calculated for session {session_id}: Gross {gross_amount}, Net {net_amount}."
    except Session.DoesNotExist:
        return "Session not found."
