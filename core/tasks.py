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


@shared_task
def auto_withdraw_stale_sessions():
    """
    Runs every 5 minutes. Ends WAITING sessions nobody picked up for 60 minutes and
    tells the seeker, so they can try again.

    Never withdraws a session that is flagged as a crisis, or one the seeker
    requested from a specific therapist (those wait for that therapist).
    """
    from core.models import Session
    from notifications.services.fcm_service import NotificationService

    cutoff = timezone.now() - timedelta(minutes=60)
    stale = list(Session.objects.filter(
        status=Session.WAITING,
        created_at__lt=cutoff,
        counselor__isnull=True,
        therapist__isnull=True,
        is_crisis_flagged=False,
    ).select_related('user'))

    for session in stale:
        session.status = Session.ENDED
        session.end_time = timezone.now()
        session.save(update_fields=['status', 'end_time'])
        try:
            NotificationService.send_push_notification(
                session.user, "No counselor was available",
                "We could not connect you with a counselor this time. Please try again, "
                "or use the helpline numbers in the app if you need someone right now.",
                {'type': 'session_withdrawn', 'session_id': session.id})
        except Exception as exc:
            logger.error("Could not tell user about withdrawn session %s: %s", session.id, exc)

    if stale:
        logger.info("auto_withdraw_stale_sessions: withdrew %s session(s) older than 60 minutes.", len(stale))
    return f"Withdrew {len(stale)} stale session(s)."


@shared_task(bind=True, max_retries=4, default_retry_delay=20)
def notify_staff_of_crisis(self, alert_id):
    """
    Tell the on-call staff about a crisis alert: an email to every active address
    in Django Admin > Emergency contacts (staff alert list), plus a push
    notification to staff users. Retries if the email cannot be sent. If nobody is
    configured the alert is still stored, the problem is written to the alert and
    logged as critical, so it is visible in Admin and in the server logs.
    """
    from django.conf import settings
    from django.core.mail import send_mail
    from django.template.loader import render_to_string
    from accounts.models import User
    from core.models import CrisisAlert, EmergencyContact
    from notifications.services.fcm_service import NotificationService

    try:
        alert = CrisisAlert.objects.select_related('session', 'user').get(id=alert_id)
    except CrisisAlert.DoesNotExist:
        # The row may not be visible yet if we were queued inside a transaction.
        raise self.retry(countdown=5)

    emails = list(EmergencyContact.objects.filter(is_active=True).values_list('email', flat=True))
    user_label = alert.user.email if alert.user else 'unknown user'
    where = f"session {alert.session_id}" if alert.session_id else "no active session"
    snippet = alert.message_content[:500]
    source = alert.get_source_display()

    errors = []
    if not emails:
        msg = "No active staff alert emails configured (Admin > Emergency contacts)."
        logger.critical("CRISIS ALERT %s could not be emailed: %s", alert.id, msg)
        errors.append(msg)
    else:
        context = {'session_id': alert.session_id or '-', 'user_email': user_label,
                   'matched_keyword': alert.matched_keyword, 'content': snippet}
        try:
            html_message = render_to_string('emails/crisis_alert_email.html', context)
        except Exception:
            html_message = None
        try:
            send_mail(
                subject=f"CRISIS ALERT ({source}): urgent attention required",
                message=(
                    f"CRISIS ALERT\nSource: {source}\nWhere: {where}\nUser: {user_label}\n"
                    f"Matched: {alert.matched_keyword}\nMessage: {snippet}\n\n"
                    f"Please review immediately."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=emails,
                html_message=html_message,
                fail_silently=False,
            )
        except Exception as exc:
            logger.error("Crisis email for alert %s failed: %s", alert.id, exc)
            if self.request.retries < self.max_retries:
                raise self.retry(exc=exc, countdown=30 * (self.request.retries + 1))
            errors.append(f"Email failed after retries: {exc}")

    for staff in User.objects.filter(is_staff=True, is_active=True):
        try:
            NotificationService.send_push_notification(
                staff, "Crisis alert", f"{source}: {where}",
                {'type': 'crisis_alert', 'alert_id': str(alert.id)})
        except Exception as exc:
            logger.error("Crisis push to staff %s failed: %s", staff.id, exc)

    update = {'notification_error': "; ".join(errors)}
    if not errors:
        update['staff_notified_at'] = timezone.now()
    CrisisAlert.objects.filter(pk=alert.pk).update(**update)
    return f"alert {alert.id}: {'notified' if not errors else 'NOT notified - ' + update['notification_error']}"
