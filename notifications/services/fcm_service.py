import firebase_admin
from firebase_admin import messaging
from notifications.models import UserDevice
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def send_push_notification(user, title, body, data=None):
        """
        Sends a push notification via FCM to all active devices of a given user.
        """
        if data is None:
            data = {}

        devices = UserDevice.objects.filter(user=user, is_active=True)
        if not devices.exists():
            logger.info(f"No active devices found for user {user.id}")
            return {'success': 0, 'failure': 0}

        tokens = [device.fcm_token for device in devices]

        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data,
            tokens=tokens,
        )

        try:
            # We only send if the default app is initialized
            if firebase_admin._apps:
                response = messaging.send_each_for_multicast(message)
                logger.info(f"FCM Multicast Response for user {user.id}: {response.success_count} success, {response.failure_count} failure")
                
                # Cleanup invalid tokens
                if response.failure_count > 0:
                    for i, res in enumerate(response.responses):
                        if not res.success:
                            # Typical errors like NotRegistered indicate token is no longer valid
                            invalid_token = tokens[i]
                            UserDevice.objects.filter(fcm_token=invalid_token).update(is_active=False)
                            logger.info(f"Deactivated token {invalid_token} for user {user.id}")
                
                return {'success': response.success_count, 'failure': response.failure_count}
            else:
                logger.warning("Firebase Admin is not initialized. Skipping push notification.")
                return {'success': 0, 'failure': 0}
        except Exception as e:
            logger.error(f"Failed to send push notification to user {user.id}: {e}")
            return {'success': 0, 'failure': len(tokens)}
