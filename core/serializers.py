from rest_framework import serializers
from .models import TriageSession, TriageMessage

class TriageMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TriageMessage
        fields = ['id', 'role', 'content', 'created_at']

class TriageSessionSerializer(serializers.ModelSerializer):
    """
    Seeker-facing view of a triage session. Clinical interpretation (suspected
    and provisional conditions, severity, risk flags, dossier, summary) is for
    clinicians only and must never be returned here.
    """
    messages = TriageMessageSerializer(many=True, read_only=True)
    is_crisis = serializers.SerializerMethodField()
    crisis_support = serializers.SerializerMethodField()

    def get_is_crisis(self, obj):
        return bool(obj.crisis_flags)

    def get_crisis_support(self, obj):
        if not obj.crisis_flags:
            return None
        from core.services.crisis_support import support_payload
        return support_payload()

    class Meta:
        model = TriageSession
        fields = [
            'id', 'is_complete', 'conversation_phase', 'turn_count',
            'chief_complaint', 'emotional_state', 'duration',
            'primary_concern', 'sleep_quality', 'appetite_change',
            'social_functioning', 'triggers', 'physical_symptoms',
            'support_preference', 'routing_decision', 'is_crisis', 'crisis_support',
            'suggested_chips', 'recommended_therapists',
            'resulting_session', 'created_at', 'messages'
        ]

class TriageRespondRequestSerializer(serializers.Serializer):
    triage_session_id = serializers.IntegerField(required=True)
    response = serializers.CharField(required=True)

from .models import SessionNote

class SessionNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionNote
        fields = ['id', 'session', 'author', 'note_text', 'linked_message', 'created_at', 'updated_at']
        read_only_fields = ['id', 'session', 'author', 'created_at', 'updated_at']

from .models import EscalationRequest

class EscalationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalationRequest
        fields = ['id', 'counselor', 'therapist', 'session', 'urgency', 'reason', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'counselor', 'status', 'created_at', 'updated_at']

from .models import Session

class SessionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    last_message_date = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = [
            'id', 'user', 'user_name', 'counselor', 'therapist', 'status', 
            'start_time', 'end_time', 'duration_minutes', 'is_crisis_flagged', 
            'created_at', 'last_message_date'
        ]
        read_only_fields = ['id', 'created_at']

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or f"User #{obj.user.id}"
        return f"User #{obj.id}"

    def get_last_message_date(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return last_msg.created_at
        return obj.created_at

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
        fields = ['id', 'session', 'pricing', 'duration_minutes', 'rate_per_minute', 'session_rate', 'gross_amount', 'platform_fee_percent', 'net_amount', 'created_at']

class PayoutRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayoutRecord
        fields = ['id', 'total_amount', 'status', 'payout_date', 'created_at']
