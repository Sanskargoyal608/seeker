# accounts/services/email_service.py
"""
Email service for sending transactional emails.
Uses Django's email backend — works with Mailhog locally (smtp:1025)
and any SMTP provider (Gmail, Brevo, SendGrid) in production.
"""
import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Centralized email service for all transactional emails.
    Currently uses Django SMTP backend (configured in settings.py).
    For production: swap EMAIL_BACKEND to Brevo/SendGrid SMTP credentials.
    """

    SENDER = None  # Falls back to settings.DEFAULT_FROM_EMAIL

    @classmethod
    def _get_sender(cls):
        return cls.SENDER or getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@seeker.app')

    # ------------------------------------------------------------------
    # Counselor / Therapist Approval Emails
    # ------------------------------------------------------------------

    @classmethod
    def send_approval_email(cls, email: str, name: str, role: str = 'counselor') -> bool:
        """
        Send approval notification to a newly verified counselor or therapist.

        Args:
            email: Recipient email address
            name: Recipient's full name
            role: 'counselor' or 'therapist'

        Returns:
            bool: True if sent successfully
        """
        role_display = 'Graduate Counselor' if role == 'counselor' else 'Licensed Therapist'
        subject = f"🎉 Your Seeker {role_display} Account Has Been Approved!"

        plain_message = f"""Hi {name},

Great news! Your Seeker {role_display} account has been reviewed and approved by our admin team.

You can now:
- Log in to the Seeker app
- Access your counselor/therapist dashboard
- Accept session requests from users

If you have any questions, please contact our support team.

Best regards,
The Seeker Team
"""

        html_message = f"""
<html>
  <body style="font-family: 'Arial', sans-serif; background-color: #0A0E1A; color: #F8FAFC; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #141826; border-radius: 16px; overflow: hidden; border: 1px solid #2A3050;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #6C63FF 0%, #00D4AA 100%); padding: 40px 32px; text-align: center;">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
          ✅ Account Approved
        </h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">
          Welcome to the Seeker platform, {name}!
        </p>
      </div>

      <!-- Body -->
      <div style="padding: 40px 32px;">
        <p style="color: #CBD5E1; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
          Hi <strong style="color: #FFFFFF;">{name}</strong>,
        </p>
        <p style="color: #CBD5E1; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
          Your <strong style="color: #6C63FF;">{role_display}</strong> account has been reviewed and
          <strong style="color: #00D4AA;">approved</strong> by our admin team. You're now fully verified
          on the Seeker platform.
        </p>

        <!-- What's next -->
        <div style="background-color: #1E2336; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #00D4AA;">
          <h3 style="color: #FFFFFF; margin: 0 0 16px; font-size: 16px;">What you can do now:</h3>
          <ul style="color: #CBD5E1; padding-left: 20px; margin: 0; line-height: 2;">
            <li>Log in to the Seeker mobile app</li>
            <li>Set up your availability schedule</li>
            <li>Accept session requests from users</li>
            <li>Manage your professional profile</li>
          </ul>
        </div>

        <p style="color: #8892B0; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
          If you have any questions, reply to this email or contact our support team.
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 24px 32px; border-top: 1px solid #2A3050; text-align: center;">
        <p style="color: #4A5568; font-size: 12px; margin: 0;">
          © 2025 Seeker Mental Wellness Platform · All rights reserved
        </p>
      </div>
    </div>
  </body>
</html>
"""

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=cls._get_sender(),
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"Approval email sent to {email} ({role})")
            return True
        except Exception as e:
            logger.error(f"Failed to send approval email to {email}: {e}")
            return False

    @classmethod
    def send_rejection_email(cls, email: str, name: str, reason: str = '', role: str = 'counselor') -> bool:
        """
        Send rejection notification to an unverified counselor or therapist.

        Args:
            email: Recipient email address
            name: Recipient's full name
            reason: Optional reason for rejection
            role: 'counselor' or 'therapist'

        Returns:
            bool: True if sent successfully
        """
        role_display = 'Graduate Counselor' if role == 'counselor' else 'Licensed Therapist'
        subject = f"Your Seeker {role_display} Application — Update Required"

        reason_section = f"\n\nReason: {reason}" if reason else ""

        plain_message = f"""Hi {name},

Thank you for applying to join Seeker as a {role_display}.

After reviewing your credentials, our admin team was unable to approve your account at this time.{reason_section}

You can re-apply with updated or corrected credentials by registering again on the Seeker app.

If you believe this is an error, please contact our support team.

Best regards,
The Seeker Team
"""

        reason_block = f"""
        <div style="background-color: #1E2336; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #FF5F6D;">
          <p style="color: #CBD5E1; margin: 0; font-size: 14px;">
            <strong style="color: #FFFFFF;">Reason:</strong> {reason}
          </p>
        </div>
        """ if reason else ""

        html_message = f"""
<html>
  <body style="font-family: 'Arial', sans-serif; background-color: #0A0E1A; color: #F8FAFC; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #141826; border-radius: 16px; overflow: hidden; border: 1px solid #2A3050;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%); padding: 40px 32px; text-align: center;">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700;">
          Application Update
        </h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">
          Action required for your Seeker account
        </p>
      </div>

      <!-- Body -->
      <div style="padding: 40px 32px;">
        <p style="color: #CBD5E1; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
          Hi <strong style="color: #FFFFFF;">{name}</strong>,
        </p>
        <p style="color: #CBD5E1; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
          After reviewing your <strong style="color: #6C63FF;">{role_display}</strong> application,
          our admin team was unable to approve your account at this time.
        </p>

        {reason_block}

        <p style="color: #CBD5E1; font-size: 16px; line-height: 1.7; margin: 24px 0;">
          You're welcome to re-apply with updated or corrected credentials through the Seeker app.
        </p>

        <p style="color: #8892B0; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
          If you believe this is an error, reply to this email to speak with our support team.
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 24px 32px; border-top: 1px solid #2A3050; text-align: center;">
        <p style="color: #4A5568; font-size: 12px; margin: 0;">
          © 2025 Seeker Mental Wellness Platform · All rights reserved
        </p>
      </div>
    </div>
  </body>
</html>
"""

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=cls._get_sender(),
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"Rejection email sent to {email} ({role})")
            return True
        except Exception as e:
            logger.error(f"Failed to send rejection email to {email}: {e}")
            return False
