# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify


class User(AbstractUser):
    GENERAL_USER = 'GENERAL_USER'
    COUNSELOR = 'COUNSELOR'
    THERAPIST = 'THERAPIST'

    ROLE_CHOICES = [
        (GENERAL_USER, 'General User'),
        (COUNSELOR, 'Counselor'),
        (THERAPIST, 'Therapist'),
    ]

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=GENERAL_USER)
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

    class Meta:
        verbose_name = 'Seeker User'
        verbose_name_plural = 'Seeker Users'


def _unique_slug(model_class, base_slug, exclude_pk=None):
    """Return a slug unique within model_class, appending counter if needed."""
    slug = base_slug
    qs = model_class.objects.all()
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    counter = 1
    while qs.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


class GraduateCounselor(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='counselor_profile'
    )
    # Credentials — stored as MinIO paths (strings)
    degree_file = models.CharField(max_length=500, blank=True)
    graduation_certificate = models.CharField(max_length=500, blank=True)
    # Academic details
    graduation_year = models.IntegerField(null=True, blank=True)
    university = models.CharField(max_length=200, blank=True)
    specialization = models.CharField(max_length=200, blank=True)
    years_experience = models.IntegerField(default=0)
    # Profile
    bio = models.TextField(blank=True)
    profile_photo = models.CharField(max_length=500, blank=True)
    # Pricing
    per_minute_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    # Verification
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)
    # Public profile
    slug = models.SlugField(max_length=200, unique=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f"{self.user.first_name}-{self.user.last_name}") or \
                   slugify(self.user.email.split('@')[0])
            self.slug = _unique_slug(GraduateCounselor, base, self.pk)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Counselor: {self.user.email}"

    class Meta:
        verbose_name = 'Graduate Counselor'
        verbose_name_plural = 'Graduate Counselors'


class LicensedTherapist(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='therapist_profile'
    )
    # Credentials
    license_number = models.CharField(max_length=100, blank=True)
    license_file = models.CharField(max_length=500, blank=True)
    # Specializations
    modalities = models.JSONField(default=list, blank=True)   # ['CBT', 'DBT', ...]
    languages = models.JSONField(default=list, blank=True)    # ['English', 'Hindi', ...]
    # Profile
    bio = models.TextField(blank=True)
    profile_photo = models.CharField(max_length=500, blank=True)
    # Pricing
    per_minute_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    per_session_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    # Verification
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)
    # 2FA
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_phone = models.CharField(max_length=20, blank=True)
    # Public profile
    slug = models.SlugField(max_length=200, unique=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f"{self.user.first_name}-{self.user.last_name}") or \
                   slugify(self.user.email.split('@')[0])
            self.slug = _unique_slug(LicensedTherapist, base, self.pk)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Therapist: {self.user.email}"

    class Meta:
        verbose_name = 'Licensed Therapist'
        verbose_name_plural = 'Licensed Therapists'


class EmergencyContact(models.Model):
    # Min 2 per user — enforced at serializer level, not DB level
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='emergency_contacts'
    )
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    relationship = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.relationship}) for {self.user.email}"

    class Meta:
        verbose_name = 'Emergency Contact'
        verbose_name_plural = 'Emergency Contacts'


class OTPToken(models.Model):
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"OTP for {self.email}"

    class Meta:
        verbose_name = 'OTP Token'
        verbose_name_plural = 'OTP Tokens'
        indexes = [
            models.Index(fields=['email', 'otp_code']),
        ]