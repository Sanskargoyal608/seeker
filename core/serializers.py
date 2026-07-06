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

from .models import SessionNote, EscalationEvent

class SessionNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionNote
        fields = ['id', 'session', 'author', 'note_text', 'linked_message', 'created_at', 'updated_at']
        read_only_fields = ['id', 'session', 'author', 'created_at', 'updated_at']

class EscalationEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalationEvent
        fields = ['id', 'session', 'from_counselor', 'to_therapist', 'reason', 'urgency', 'status', 'created_at']
        read_only_fields = ['id', 'session', 'from_counselor', 'status', 'created_at']

from .models import EscalationRequest

class EscalationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalationRequest
        fields = ['id', 'counselor', 'therapist', 'session', 'urgency', 'reason', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'counselor', 'status', 'created_at', 'updated_at']

from .models import Session

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ['id', 'user', 'counselor', 'therapist', 'status', 'start_time', 'end_time', 'duration_minutes', 'is_crisis_flagged', 'created_at']
        read_only_fields = ['id', 'created_at']

from accounts.models import LicensedTherapist, User

class TherapistListSerializer(serializers.ModelSerializer):
    # Flattening out some user fields for ease of use in UI
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    
    class Meta:
        model = LicensedTherapist
        fields = [
            'id', 'first_name', 'last_name', 'bio', 'profile_photo',
            'per_session_rate', 'modalities', 'languages'
        ]
