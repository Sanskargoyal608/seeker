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

from core.models import CounselorAvailability
class CounselorAvailabilitySerializer(serializers.ModelSerializer):
    # Flattening out some user fields for ease of use in UI
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    
    class Meta:
        model = CounselorAvailability
        fields = ['status', 'last_updated']
        read_only_fields = ['last_updated']

from core.models import SeekerBillingRecord

class SeekerBillingRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeekerBillingRecord
        fields = ['id', 'amount', 'description', 'date', 'is_paid']

from .models import TherapistAvailability, ClientTherapistRelationship, EarningsRecord, PayoutRecord

class TherapistAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TherapistAvailability
        fields = ['id', 'therapist', 'day_of_week', 'start_time', 'end_time', 'is_available']
        read_only_fields = ['id', 'therapist']

class ClientTherapistRelationshipSerializer(serializers.ModelSerializer):
    client_email = serializers.CharField(source='client.email', read_only=True)
    client_name = serializers.CharField(source='client.first_name', read_only=True)
    
    class Meta:
        model = ClientTherapistRelationship
        fields = ['id', 'client', 'client_email', 'client_name', 'status', 'notes', 'created_at']
        read_only_fields = ['id', 'client', 'created_at']

class EarningsRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = EarningsRecord
        fields = ['id', 'session', 'duration_minutes', 'rate_per_minute', 'gross_amount', 'platform_fee_percent', 'net_amount', 'created_at']

class PayoutRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayoutRecord
        fields = ['id', 'total_amount', 'status', 'payout_date', 'created_at']
