from rest_framework import serializers
from .models import SessionFeedback

class SessionFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionFeedback
        fields = ['id', 'session', 'q1_before_session', 'q2_after_session', 'q3_what_helped', 'q4_what_improve', 'is_flagged', 'submitted_at']
        read_only_fields = ['id', 'session', 'is_flagged', 'submitted_at']
