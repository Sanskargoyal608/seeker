import re
import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from core.models import CrisisKeyword, CrisisAlert, EmergencyContact

logger = logging.getLogger(__name__)

class CrisisDetectionService:
    @staticmethod
    def scan_message(session, content):
        """
        Scans a message for crisis keywords.
        Returns True if a crisis is detected, False otherwise.
        """
        if not content:
            return False

        content_lower = content.lower()
        
        # Load all keywords (in production, cache this)
        keywords = CrisisKeyword.objects.all()
        
        for kw in keywords:
            # Simple word boundary regex to avoid partial matches
            pattern = r'\b' + re.escape(kw.keyword.lower()) + r'\b'
            if re.search(pattern, content_lower):
                CrisisDetectionService._handle_crisis(session, content, kw.keyword)
                return True
                
        return False

    @staticmethod
    def _handle_crisis(session, content, matched_keyword):
        logger.warning(f"Crisis detected for session {session.id}: matched '{matched_keyword}'")
        
        # 1. Flag the session
        session.is_crisis_flagged = True
        session.save(update_fields=['is_crisis_flagged'])
        
        # 2. Create the alert record
        CrisisAlert.objects.create(
            session=session,
            message_content=content,
            matched_keyword=matched_keyword
        )
        
        # 3. Send email to emergency contacts
        try:
            emails = list(EmergencyContact.objects.filter(is_active=True).values_list('email', flat=True))
            
            # Fallback to the requested default email if no active contacts
            if not emails:
                emails = ['sanskargoyal608@gmail.com']

            subject = f"CRISIS ALERT: Urgent attention required for Session {session.id}"
            
            context = {
                'session_id': session.id,
                'user_email': session.user.email if session.user else "Anonymous",
                'matched_keyword': matched_keyword,
                'content': content
            }
            
            # If the template doesn't exist yet, fallback to plain text
            try:
                html_message = render_to_string('emails/crisis_alert_email.html', context)
            except Exception:
                html_message = None
                
            plain_message = (
                f"CRISIS ALERT\n"
                f"Session: {session.id}\n"
                f"User: {session.user.email if session.user else 'Anonymous'}\n"
                f"Keyword: {matched_keyword}\n"
                f"Message: {content}\n\n"
                f"Please review this session immediately."
            )
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=emails,
                html_message=html_message,
                fail_silently=False,
            )
            
        except Exception as e:
            logger.error(f"Failed to send crisis email: {str(e)}")
