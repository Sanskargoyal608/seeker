# profiles/models.py
from django.conf import settings
from django.db import models


class Specialization(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Specialization'
        verbose_name_plural = 'Specializations'


class TherapyModality(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Therapy Modality'
        verbose_name_plural = 'Therapy Modalities'


class AvailabilitySlot(models.Model):
    DAY_CHOICES = [
        (0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'),
        (3, 'Thursday'), (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday'),
    ]

    # One of these will be set
    counselor = models.ForeignKey(
        'accounts.GraduateCounselor', on_delete=models.CASCADE,
        null=True, blank=True, related_name='availability_slots'
    )
    therapist = models.ForeignKey(
        'accounts.LicensedTherapist', on_delete=models.CASCADE,
        null=True, blank=True, related_name='availability_slots'
    )
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Slot day={self.day_of_week} {self.start_time}-{self.end_time}"

    class Meta:
        verbose_name = 'Availability Slot'
        verbose_name_plural = 'Availability Slots'


class BlockedDate(models.Model):
    counselor = models.ForeignKey(
        'accounts.GraduateCounselor', on_delete=models.CASCADE,
        null=True, blank=True, related_name='blocked_dates'
    )
    therapist = models.ForeignKey(
        'accounts.LicensedTherapist', on_delete=models.CASCADE,
        null=True, blank=True, related_name='blocked_dates'
    )
    date = models.DateField()
    reason = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Blocked {self.date}"

    class Meta:
        verbose_name = 'Blocked Date'
        verbose_name_plural = 'Blocked Dates'


class Booking(models.Model):
    SCHEDULED = 'SCHEDULED'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'

    STATUS_CHOICES = [
        (SCHEDULED, 'Scheduled'), (COMPLETED, 'Completed'), (CANCELLED, 'Cancelled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings'
    )
    therapist = models.ForeignKey(
        'accounts.LicensedTherapist', on_delete=models.CASCADE, related_name='bookings'
    )
    scheduled_datetime = models.DateTimeField()
    duration_minutes = models.IntegerField(default=60)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=SCHEDULED)
    
    # Reminders
    reminder_24h_sent = models.BooleanField(default=False)
    reminder_1h_sent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Booking {self.pk} [{self.status}]"

    class Meta:
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'


class IntakeResponse(models.Model):
    booking = models.OneToOneField(
        Booking, on_delete=models.CASCADE,
        null=True, blank=True, related_name='intake_response'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        null=True, blank=True, related_name='intake_responses'
    )
    responses_json = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Intake for Booking {self.booking_id}"

    class Meta:
        verbose_name = 'Intake Response'
        verbose_name_plural = 'Intake Responses'

# Typesense Signals
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from accounts.models import LicensedTherapist
from .services.typesense_service import TypesenseService

@receiver(post_save, sender=LicensedTherapist)
def sync_therapist_to_typesense(sender, instance, created, **kwargs):
    service = TypesenseService()
    try:
        service.init_collection() # Ensure collection exists
        service.upsert_therapist(instance)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Typesense sync error: {e}")

@receiver(post_delete, sender=LicensedTherapist)
def remove_therapist_from_typesense(sender, instance, **kwargs):
    service = TypesenseService()
    try:
        service.delete_therapist(instance.id)
    except Exception as e:
        pass
