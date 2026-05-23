from rest_framework import serializers
from .models import TriageSession, TriageMessage

class TriageMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TriageMessage
        fields = ['id', 'role', 'content', 'created_at']

class TriageSessionSerializer(serializers.ModelSerializer):
    messages = TriageMessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = TriageSession
        fields = [
            'id', 'is_complete', 'emotional_state', 'primary_concern',
            'support_preference', 'urgency', 'routing_decision',
            'resulting_session', 'created_at', 'messages'
        ]

class TriageRespondRequestSerializer(serializers.Serializer):
    triage_session_id = serializers.IntegerField(required=True)
    response = serializers.CharField(required=True)
