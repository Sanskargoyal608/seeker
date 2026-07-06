from rest_framework import serializers
from .models import AvailabilitySlot, BlockedDate, Booking, IntakeResponse
from accounts.models import LicensedTherapist

class AvailabilitySlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = ['id', 'day_of_week', 'start_time', 'end_time', 'is_active']
        read_only_fields = ['id']

class BlockedDateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockedDate
        fields = ['id', 'date', 'reason']
        read_only_fields = ['id']

class IntakeResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntakeResponse
        fields = ['responses_json']

class BookingSerializer(serializers.ModelSerializer):
    intake_response = IntakeResponseSerializer(read_only=True)
    therapist_name = serializers.CharField(source='therapist.user.first_name', read_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'therapist', 'therapist_name', 'scheduled_datetime', 'duration_minutes', 'status', 'intake_response']
        read_only_fields = ['id', 'status', 'duration_minutes', 'therapist_name']

class BookingCreateSerializer(serializers.ModelSerializer):
    intake_data = serializers.JSONField(write_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'therapist', 'scheduled_datetime', 'duration_minutes', 'intake_data']
        read_only_fields = ['id']

    def create(self, validated_data):
        intake_data = validated_data.pop('intake_data')
        booking = Booking.objects.create(
            user=self.context['request'].user,
            status=Booking.SCHEDULED,
            **validated_data
        )
        IntakeResponse.objects.create(
            booking=booking,
            user=self.context['request'].user,
            responses_json=intake_data
        )
        return booking
