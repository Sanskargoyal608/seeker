# notifications/models.py
from django.conf import settings
from django.db import models


class UserDevice(models.Model):
    IOS = 'IOS'
    ANDROID = 'ANDROID'

    PLATFORM_CHOICES = [
        (IOS, 'iOS'),
        (ANDROID, 'Android'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='devices'
    )
    fcm_token = models.CharField(max_length=500)
    platform = models.CharField(max_length=10, choices=PLATFORM_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.platform} device for {self.user_id}"

    class Meta:
        verbose_name = 'User Device'
        verbose_name_plural = 'User Devices'
        unique_together = [['user', 'fcm_token']]


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications'
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    notification_type = models.CharField(max_length=50) # e.g. new_message, session_reminder
    related_id = models.CharField(max_length=50, blank=True, null=True) # e.g. session_id, booking_id
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} for {self.user.email}"
