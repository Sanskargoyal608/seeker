# profiles/admin.py
from django.contrib import admin
from .models import Specialization, TherapyModality, AvailabilitySlot, BlockedDate, Booking, IntakeResponse


@admin.register(Specialization)
class SpecializationAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(TherapyModality)
class TherapyModalityAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ('id', 'day_of_week', 'start_time', 'end_time', 'counselor', 'therapist', 'is_active')
    list_filter = ('day_of_week', 'is_active')
    search_fields = ('counselor__user__email', 'therapist__user__email')


@admin.register(BlockedDate)
class BlockedDateAdmin(admin.ModelAdmin):
    list_display = ('id', 'date', 'counselor', 'therapist', 'reason', 'created_at')
    list_filter = ('date', 'created_at')
    search_fields = ('counselor__user__email', 'therapist__user__email', 'reason')


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'user', 'therapist', 'scheduled_datetime', 'duration_minutes', 'created_at')
    list_filter = ('status', 'scheduled_datetime', 'created_at')
    search_fields = ('user__email', 'therapist__user__email')


@admin.register(IntakeResponse)
class IntakeResponseAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'user', 'submitted_at')
    list_filter = ('submitted_at',)
    search_fields = ('booking__id', 'user__email')
