# accounts/otp_service.py
import secrets
from datetime import timedelta
from django.db import transaction
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

    MAX_ATTEMPTS = 5
    # Once the code is confirmed, the user has this long to finish the signup form.
    VERIFIED_GRACE_MINUTES = 30

    @classmethod
    def create_otp_for_email(cls, email: str, purpose: str = OTPToken.REGISTER) -> tuple:
        """
        Create a fresh OTP for an email address and purpose.
        Any earlier unused code for the same email and purpose is invalidated, so
        requesting codes repeatedly never leaves several valid guesses outstanding.

        Returns:
            tuple: (otp_code, OTPToken object)
        """
        OTPToken.objects.filter(email=email, expires_at__lt=timezone.now()).delete()
        OTPToken.objects.filter(email=email, purpose=purpose, is_verified=False).delete()

        otp_code = cls.generate_otp()
        validity = timezone.now() + timedelta(minutes=cls.OTP_VALIDITY_MINUTES)

        token = OTPToken.objects.create(
            email=email,
            otp_code=otp_code,
            purpose=purpose,
            expires_at=validity,
            is_verified=False
        )

        logger.info("OTP created (purpose=%s)", purpose)
        return otp_code, token

    @classmethod
    def verify_otp(cls, email: str, otp_code: str, purpose: str = OTPToken.REGISTER) -> bool:
        """
        Check a code. A code is single-use, belongs to one purpose, and is dead
        after MAX_ATTEMPTS wrong guesses (the user must request a new one).
        """
        with transaction.atomic():
            token = (
                OTPToken.objects.select_for_update()
                .filter(email=email, purpose=purpose, is_verified=False,
                        expires_at__gt=timezone.now())
                .order_by('-created_at')
                .first()
            )
            if token is None:
                logger.warning("OTP check with no active code (purpose=%s)", purpose)
                return False

            if token.attempts >= cls.MAX_ATTEMPTS:
                logger.warning("OTP locked after too many attempts (purpose=%s)", purpose)
                return False

            if not secrets.compare_digest(token.otp_code, str(otp_code)):
                token.attempts += 1
                token.save(update_fields=['attempts'])
                logger.warning("Wrong OTP (purpose=%s, attempt %s)", purpose, token.attempts)
                return False

            token.is_verified = True
            if purpose == OTPToken.REGISTER:
                token.expires_at = timezone.now() + timedelta(minutes=cls.VERIFIED_GRACE_MINUTES)
                token.save(update_fields=['is_verified', 'expires_at'])
            else:
                token.save(update_fields=['is_verified'])
            return True

    @classmethod
    def is_email_verified(cls, email: str) -> bool:
        """True if the email has confirmed a registration code that has not yet lapsed."""
        return OTPToken.objects.filter(
            email=email,
            purpose=OTPToken.REGISTER,
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

            logger.info("OTP email sent")
            return True

        except Exception as e:
            logger.error("Failed to send OTP email: %s", e)
            return False

    @classmethod
    def send_account_exists_email(cls, email: str) -> bool:
        """Tell the owner of an already-registered address that someone tried to sign up with it."""
        try:
            send_mail(
                subject="Someone tried to create an account with your email",
                message=(
                    "Someone asked to create a new account with this email address, "
                    "but an account already exists.\n\n"
                    "If it was you, just log in, or use 'Forgot password' if you cannot remember "
                    "your password. If it was not you, you can ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            return True
        except Exception as e:
            logger.error("Failed to send account-exists email: %s", e)
            return False

    @classmethod
    def clean_expired_otps(cls):
        """Delete all expired OTP tokens. Can be run as a Celery task."""
        deleted_count, _ = OTPToken.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()
        logger.info(f"Cleaned up {deleted_count} expired OTP tokens")
        return deleted_count
