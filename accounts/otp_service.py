# accounts/otp_service.py
import secrets
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from accounts.models import OTPToken
import logging

logger = logging.getLogger(__name__)


class OTPService:
    """
    Service for managing OTP generation, verification, and email delivery.
    OTP codes are 6 digits and valid for 10 minutes.
    """

    OTP_LENGTH = 6
    OTP_VALIDITY_MINUTES = 10

    @staticmethod
    def generate_otp() -> str:
        """Generate a 6-digit OTP code"""
        return ''.join(secrets.choice('0123456789') for _ in range(OTPService.OTP_LENGTH))

    @classmethod
    def create_otp_for_email(cls, email: str) -> tuple:
        """
        Create OTP for an email address.
        Stores in database and returns the code and token object.

        Args:
            email (str): Email address to create OTP for

        Returns:
            tuple: (otp_code, OTPToken object)
        """
        # Clean up expired OTPs for this email
        OTPToken.objects.filter(
            email=email,
            expires_at__lt=timezone.now()
        ).delete()

        # Generate new OTP
        otp_code = cls.generate_otp()
        validity = timezone.now() + timedelta(minutes=cls.OTP_VALIDITY_MINUTES)

        token = OTPToken.objects.create(
            email=email,
            otp_code=otp_code,
            expires_at=validity,
            is_verified=False
        )

        logger.info(f"OTP created for email: {email}")
        return otp_code, token

    @classmethod
    def verify_otp(cls, email: str, otp_code: str) -> bool:
        """
        Verify OTP code for an email.
        Marks the token as verified if valid.

        Args:
            email (str): Email address
            otp_code (str): OTP code to verify

        Returns:
            bool: True if OTP is valid, False otherwise
        """
        try:
            token = OTPToken.objects.get(
                email=email,
                otp_code=otp_code,
                is_verified=False,
                expires_at__gt=timezone.now()  # Not expired
            )
            token.is_verified = True
            token.save()
            logger.info(f"OTP verified for email: {email}")
            return True
        except OTPToken.DoesNotExist:
            logger.warning(f"Invalid or expired OTP for email: {email}")
            return False

    @classmethod
    def is_email_verified(cls, email: str) -> bool:
        """
        Check if an email has been verified with OTP.

        Args:
            email (str): Email address to check

        Returns:
            bool: True if email has valid verified OTP, False otherwise
        """
        return OTPToken.objects.filter(
            email=email,
            is_verified=True,
            expires_at__gt=timezone.now()
        ).exists()

    @classmethod
    def send_otp_email(cls, email: str, otp_code: str, user_name: str = None) -> bool:
        """
        Send OTP via email using Django's email backend (Gmail SMTP).

        Args:
            email (str): Email address to send to
            otp_code (str): The OTP code
            user_name (str): Optional user name for personalization

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            subject = "Your Seeker OTP Code"

            # Simple text email
            message = f"""Hi {user_name or 'User'},

Your Seeker OTP code is: {otp_code}

This code is valid for {cls.OTP_VALIDITY_MINUTES} minutes.

If you didn't request this code, please ignore this email.

Best regards,
Seeker Team"""

            # HTML version
            html_message = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2c3e50;">Welcome to Seeker</h2>
                        <p>Hi {user_name or 'User'},</p>
                        <p>Your Seeker OTP code is:</p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #3498db; letter-spacing: 5px; margin: 0;">{otp_code}</h1>
                        </div>
                        <p style="color: #7f8c8d;">This code is valid for {cls.OTP_VALIDITY_MINUTES} minutes.</p>
                        <p style="color: #7f8c8d;">If you didn't request this code, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
                        <p style="font-size: 12px; color: #95a5a6;">Best regards,<br>Seeker Team</p>
                    </div>
                </body>
            </html>
            """

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False,
            )

            logger.info(f"OTP email sent to: {email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send OTP email to {email}: {str(e)}")
            return False

    @classmethod
    def clean_expired_otps(cls):
        """Delete all expired OTP tokens. Can be run as a Celery task."""
        deleted_count, _ = OTPToken.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()
        logger.info(f"Cleaned up {deleted_count} expired OTP tokens")
        return deleted_count
