# core/models.py
from django.conf import settings
from django.db import models


class Session(models.Model):
    WAITING = 'WAITING'
    MATCHED = 'MATCHED'
    SCHEDULED = 'SCHEDULED'
    ACTIVE = 'ACTIVE'
    PAYMENT_PENDING = 'PAYMENT_PENDING'
    PAID = 'PAID'
    ENDED = 'ENDED'

    STATUS_CHOICES = [
        (WAITING, 'Waiting'),
        (MATCHED, 'Matched'),
        (SCHEDULED, 'Scheduled'),
        (ACTIVE, 'Active'),
        (PAYMENT_PENDING, 'Payment Pending'),
        (PAID, 'Paid'),
        (ENDED, 'Ended'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='sessions_as_user'
    )
    # Polymorphic provider — one of these will be set, the other null
    counselor = models.ForeignKey(
        'accounts.GraduateCounselor', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='counselor_sessions'
    )
    therapist = models.ForeignKey(
        'accounts.LicensedTherapist', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='therapist_sessions'
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=WAITING)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=0)
    is_crisis_flagged = models.BooleanField(default=False)

    # Set when the session grew out of a scheduled booking (priced per session).
    booking = models.OneToOneField(
        'profiles.Booking', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='session'
    )
    # Set on the therapist's session that replaced a counselor's after an escalation.
    escalated_from = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='escalated_to'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session {self.pk} [{self.status}]"

    class Meta:
        verbose_name = 'Session'
        verbose_name_plural = 'Sessions'
        ordering = ['-created_at']


class ChatMessage(models.Model):
    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='sent_messages'
    )
    message_text = models.TextField()
    is_highlighted = models.BooleanField(default=False)
    is_held_for_payment = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message {self.pk} in Session {self.session_id}"

    class Meta:
        verbose_name = 'Chat Message'
        verbose_name_plural = 'Chat Messages'
        ordering = ['created_at']


class SessionNote(models.Model):
    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name='notes'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='session_notes'
    )
    note_text = models.TextField()
    linked_message = models.ForeignKey(
        ChatMessage, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='linked_notes'
    )
    # Always True — enforced at queryset level so users never see these
    is_private = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note {self.pk} by {self.author.email}"

    class Meta:
        verbose_name = 'Session Note'
        verbose_name_plural = 'Session Notes'


class EscalationRequest(models.Model):
    HIGH = 'HIGH'
    MEDIUM = 'MEDIUM'
    LOW = 'LOW'

    URGENCY_CHOICES = [
        (HIGH, 'High'), (MEDIUM, 'Medium'), (LOW, 'Low'),
    ]

    PENDING = 'PENDING'
    ACCEPTED = 'ACCEPTED'
    DECLINED = 'DECLINED'
    RESOLVED = 'RESOLVED'

    STATUS_CHOICES = [
        (PENDING, 'Pending'), (ACCEPTED, 'Accepted'), 
        (DECLINED, 'Declined'), (RESOLVED, 'Resolved'),
    ]

    counselor = models.ForeignKey(
        'accounts.GraduateCounselor', on_delete=models.CASCADE, related_name='escalation_requests_sent'
    )
    therapist = models.ForeignKey(
        'accounts.LicensedTherapist', on_delete=models.CASCADE, related_name='escalation_requests_received'
    )
    session = models.ForeignKey(
        'core.Session', on_delete=models.CASCADE, related_name='escalation_requests', null=True, blank=True
    )
    urgency = models.CharField(max_length=10, choices=URGENCY_CHOICES, default=MEDIUM)
    reason = models.TextField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=PENDING)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Escalation Request {self.pk} [{self.status}]"

    class Meta:
        verbose_name = 'Escalation Request'
        verbose_name_plural = 'Escalation Requests'


class EarningsRecord(models.Model):
    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name='earnings'
    )
    # One of these will be set
    counselor = models.ForeignKey(
        'accounts.GraduateCounselor', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='earnings'
    )
    therapist = models.ForeignKey(
        'accounts.LicensedTherapist', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='earnings'
    )
    PER_MINUTE = 'PER_MINUTE'
    PER_SESSION = 'PER_SESSION'
    PRICING_CHOICES = [(PER_MINUTE, 'Per minute'), (PER_SESSION, 'Per session')]

    pricing = models.CharField(max_length=12, choices=PRICING_CHOICES, default=PER_MINUTE)
    duration_minutes = models.IntegerField()
    rate_per_minute = models.DecimalField(max_digits=8, decimal_places=2)
    # The fixed price when pricing is PER_SESSION (rate_per_minute is 0 then).
    session_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=15.00)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Earnings {self.pk} for Session {self.session_id}"

    class Meta:
        verbose_name = 'Earnings Record'
        verbose_name_plural = 'Earnings Records'


class PayoutRecord(models.Model):
    PENDING = 'PENDING'
    PROCESSING = 'PROCESSING'
    PAID = 'PAID'

    STATUS_CHOICES = [
        (PENDING, 'Pending'), (PROCESSING, 'Processing'), (PAID, 'Paid'),
    ]

    counselor = models.ForeignKey(
        'accounts.GraduateCounselor', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='payouts'
    )
    therapist = models.ForeignKey(
        'accounts.LicensedTherapist', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='payouts'
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=PENDING)
    payout_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payout {self.pk} [{self.status}]"

    class Meta:
        verbose_name = 'Payout Record'
        verbose_name_plural = 'Payout Records'


class TriageSession(models.Model):
    PHASE_CHOICES = [
        ('OPENING', 'Opening'),
        ('EXPLORATION', 'Exploration'),
        ('DEEPENING', 'Deepening'),
        ('CLOSING', 'Closing'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='triage_sessions'
    )
    is_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Phase tracking
    conversation_phase = models.CharField(max_length=20, choices=PHASE_CHOICES, default='OPENING')
    
    # Chief complaint & context
    chief_complaint = models.TextField(blank=True, null=True)
    emotional_state = models.TextField(blank=True, null=True)
    duration = models.CharField(max_length=100, blank=True, null=True)
    
    # Clinical indicators
    primary_concern = models.TextField(blank=True, null=True)
    suspected_conditions = models.JSONField(default=list, blank=True)
    relevant_screening = models.JSONField(default=dict, blank=True)
    sleep_quality = models.CharField(max_length=255, blank=True, null=True)
    appetite_change = models.CharField(max_length=255, blank=True, null=True)
    social_functioning = models.CharField(max_length=255, blank=True, null=True)
    triggers = models.JSONField(default=list, blank=True)
    physical_symptoms = models.JSONField(default=list, blank=True)
    
    # Risk & routing
    urgency = models.CharField(max_length=50, blank=True, null=True)
    crisis_flags = models.JSONField(default=list, blank=True)
    support_preference = models.TextField(blank=True, null=True)
    routing_decision = models.CharField(max_length=100, blank=True, null=True)
    
    # AI meta & Intake Dossier
    ai_confidence = models.FloatField(default=0.0)
    clinical_summary = models.TextField(blank=True, null=True)
    turn_count = models.IntegerField(default=0)
    provisional_conditions = models.JSONField(default=list, blank=True)
    functional_impairment = models.JSONField(default=dict, blank=True)
    therapy_goals = models.JSONField(default=list, blank=True)
    recommended_modalities = models.JSONField(default=list, blank=True)
    specialization_tags = models.JSONField(default=list, blank=True)
    intake_dossier = models.TextField(blank=True, null=True)
    suggested_chips = models.JSONField(default=list, blank=True)
    recommended_therapists = models.JSONField(default=list, blank=True)
    
    # Outcomes
    resulting_session = models.OneToOneField(
        Session, on_delete=models.SET_NULL, null=True, blank=True, related_name='triage_source'
    )

    def __str__(self):
        return f"TriageSession {self.pk} for User {self.user_id}"


class TriageMessage(models.Model):
    triage_session = models.ForeignKey(
        TriageSession, on_delete=models.CASCADE, related_name='messages'
    )
    role = models.CharField(max_length=10) # 'user' or 'model'
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message {self.pk} [{self.role}]"


class CrisisKeyword(models.Model):
    keyword = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50) # e.g. SUICIDE, SELF_HARM, ABUSE
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.keyword} ({self.category})"


class CrisisAlert(models.Model):
    """
    A record that someone may be in crisis. Created for every detection, from any
    source, whether or not a chat session exists (the panic button and triage can
    fire before one does).
    """
    CHAT = 'CHAT'
    TRIAGE = 'TRIAGE'
    PANIC = 'PANIC'
    SOURCE_CHOICES = [(CHAT, 'Chat message'), (TRIAGE, 'AI intake'), (PANIC, 'Panic button')]

    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name='crisis_alerts',
        null=True, blank=True,
    )
    user = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='crisis_alerts',
    )
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default=CHAT)
    message_content = models.TextField()
    matched_keyword = models.CharField(max_length=100)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Staff notification state. Repeated detections for one person within a few
    # minutes are recorded but do not email staff again (suppressed).
    suppressed = models.BooleanField(default=False)
    staff_notified_at = models.DateTimeField(null=True, blank=True)
    notification_error = models.TextField(blank=True)

    def __str__(self):
        return f"Crisis Alert ({self.source}) session={self.session_id} - {self.matched_keyword}"


class EmergencyContact(models.Model):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} <{self.email}>"


class SessionTimer(models.Model):
    session = models.OneToOneField(
        Session, on_delete=models.CASCADE, related_name='timer'
    )
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField()
    is_paid = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Timer for Session {self.session_id} [Paid: {self.is_paid}]"

class CounselorAvailability(models.Model):
    AVAILABLE = 'AVAILABLE'
    BUSY = 'BUSY'
    AWAY = 'AWAY'
    
    STATUS_CHOICES = [
        (AVAILABLE, 'Available'),
        (BUSY, 'Busy'),
        (AWAY, 'Away'),
    ]
    
    counselor = models.OneToOneField(
        'accounts.GraduateCounselor', on_delete=models.CASCADE, related_name='availability'
    )
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=AWAY)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.counselor.user.email} - {self.status}"
    
    class Meta:
        verbose_name_plural = "Counselor Availabilities"


class SeekerBillingRecord(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='billing_records'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255)
    date = models.DateTimeField(auto_now_add=True)
    is_paid = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.user.email} - ${self.amount} - {self.description}"


class TherapistAvailability(models.Model):
    therapist = models.ForeignKey(
        'accounts.LicensedTherapist', on_delete=models.CASCADE, related_name='availability'
    )
    # 0 = Monday, 6 = Sunday
    day_of_week = models.IntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.therapist.user.email} - Day {self.day_of_week} ({self.start_time} to {self.end_time})"

    class Meta:
        verbose_name_plural = "Therapist Availabilities"
        ordering = ['day_of_week', 'start_time']


class ClientTherapistRelationship(models.Model):
    ACTIVE = 'ACTIVE'
    DISCHARGED = 'DISCHARGED'
    
    STATUS_CHOICES = [
        (ACTIVE, 'Active'),
        (DISCHARGED, 'Discharged'),
    ]

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='therapists'
    )
    therapist = models.ForeignKey(
        'accounts.LicensedTherapist', on_delete=models.CASCADE, related_name='clients'
    )
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=ACTIVE)
    notes = models.TextField(blank=True, help_text="General intake notes for this client.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Client {self.client.email} -> Therapist {self.therapist.user.email}"
        
    class Meta:
        unique_together = ('client', 'therapist')


class MoodEntry(models.Model):
    MOOD_CHOICES = [
        ('great', 'Great'),
        ('good', 'Good'),
        ('okay', 'Okay'),
        ('low', 'Low'),
        ('bad', 'Bad'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mood_entries'
    )
    mood = models.CharField(max_length=10, choices=MOOD_CHOICES)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.email} - {self.mood} at {self.created_at}"
    
    class Meta:
        ordering = ['-created_at']


class MentorshipRequest(models.Model):
    PENDING = 'PENDING'
    ACCEPTED = 'ACCEPTED'
    DECLINED = 'DECLINED'
    
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (ACCEPTED, 'Accepted'),
        (DECLINED, 'Declined'),
    ]
    
    counselor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mentorship_requests_sent'
    )
    therapist = models.ForeignKey(
        'accounts.LicensedTherapist', on_delete=models.CASCADE, related_name='mentorship_requests_received'
    )
    sop_message = models.TextField(help_text="Statement of Purpose from the counselor")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Mentorship: {self.counselor.email} -> {self.therapist.user.email} [{self.status}]"
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ('counselor', 'therapist')


class MentorshipMessage(models.Model):
    mentorship = models.ForeignKey(
        MentorshipRequest, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"MentorMsg {self.pk} in {self.mentorship_id}"
    
    class Meta:
        ordering = ['created_at']
