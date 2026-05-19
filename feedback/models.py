# feedback/models.py
from django.conf import settings
from django.db import models


class SessionFeedback(models.Model):
    session = models.OneToOneField(
        'core.Session', on_delete=models.CASCADE, related_name='feedback'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='session_feedbacks'
    )
    q1_before_session = models.TextField(blank=True)
    q2_after_session = models.TextField(blank=True)
    q3_what_helped = models.TextField(blank=True)
    q4_what_improve = models.TextField(blank=True)
    is_flagged = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback for Session {self.session_id}"

    class Meta:
        verbose_name = 'Session Feedback'
        verbose_name_plural = 'Session Feedbacks'
