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


class EscalationEvent(models.Model):
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'
    CRITICAL = 'CRITICAL'

    URGENCY_CHOICES = [
        (LOW, 'Low'), (MEDIUM, 'Medium'), (HIGH, 'High'), (CRITICAL, 'Critical'),
    ]

    PENDING = 'PENDING'
    ACCEPTED = 'ACCEPTED'
    COMPLETED = 'COMPLETED'

    STATUS_CHOICES = [
        (PENDING, 'Pending'), (ACCEPTED, 'Accepted'), (COMPLETED, 'Completed'),
    ]

    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name='escalations'
    )
    from_counselor = models.ForeignKey(
        'accounts.GraduateCounselor', on_delete=models.SET_NULL,
        null=True, related_name='escalations_sent'
    )
    to_therapist = models.ForeignKey(
        'accounts.LicensedTherapist', on_delete=models.SET_NULL,
        null=True, related_name='escalations_received'
    )
    reason = models.TextField()
    urgency = models.CharField(max_length=10, choices=URGENCY_CHOICES, default=MEDIUM)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Escalation {self.pk} [{self.urgency}] [{self.status}]"

    class Meta:
        verbose_name = 'Escalation Event'
        verbose_name_plural = 'Escalation Events'


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
    duration_minutes = models.IntegerField()
    rate_per_minute = models.DecimalField(max_digits=8, decimal_places=2)
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
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
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='triage_sessions'
    )
    is_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Form state
    emotional_state = models.TextField(blank=True, null=True)
    primary_concern = models.TextField(blank=True, null=True)
    support_preference = models.TextField(blank=True, null=True)
    urgency = models.CharField(max_length=20, blank=True, null=True)
    
    # Outcomes
    routing_decision = models.CharField(max_length=50, blank=True, null=True)
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
    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name='crisis_alerts'
    )
    message_content = models.TextField()
    matched_keyword = models.CharField(max_length=100)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Crisis Alert for Session {self.session_id} - {self.matched_keyword}"


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
