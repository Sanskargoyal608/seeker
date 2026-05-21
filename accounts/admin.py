# accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils import timezone
from .models import User, GraduateCounselor, LicensedTherapist, EmergencyContact, OTPToken
from .services.email_service import EmailService


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'username', 'first_name', 'last_name', 'role', 'is_active', 'created_at')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-created_at',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Seeker Fields', {'fields': ('role', 'phone')}),
    )


@admin.register(GraduateCounselor)
class GraduateCounselorAdmin(admin.ModelAdmin):
    list_display = ('user', 'university', 'specialization', 'is_verified', 'degree_file_link', 'created_at')
    list_filter = ('is_verified',)
    search_fields = ('user__email', 'user__first_name', 'university')
    readonly_fields = ('slug', 'created_at', 'updated_at', 'degree_file_link', 'graduation_certificate_link')
    actions = ['approve_counselors', 'reject_counselors']

    fieldsets = (
        ('User', {'fields': ('user', 'created_at', 'updated_at', 'slug')}),
        ('Credentials', {
            'fields': ('degree_file_link', 'graduation_certificate_link'),
            'description': 'Uploaded credential documents. Click links to download.',
        }),
        ('Profile', {
            'fields': ('university', 'specialization', 'graduation_year', 'years_experience', 'bio', 'per_minute_rate'),
        }),
        ('Approval', {
            'fields': ('is_verified', 'verification_date'),
        }),
    )

    def degree_file_link(self, obj):
        """Clickable download link for the degree file."""
        if obj.degree_file:
            return format_html('<a href="{}" target="_blank" style="color: #6C63FF;">📄 Download Degree</a>', obj.degree_file)
        return format_html('<span style="color: #8892B0;">No file uploaded</span>')
    degree_file_link.short_description = 'Degree File'
    degree_file_link.allow_tags = True

    def graduation_certificate_link(self, obj):
        """Clickable download link for the graduation certificate."""
        if obj.graduation_certificate:
            return format_html('<a href="{}" target="_blank" style="color: #6C63FF;">📄 Download Certificate</a>', obj.graduation_certificate)
        return format_html('<span style="color: #8892B0;">No file uploaded</span>')
    graduation_certificate_link.short_description = 'Graduation Certificate'
    graduation_certificate_link.allow_tags = True

    def approve_counselors(self, request, queryset):
        """Approve selected counselors and send notification email to each."""
        approved_count = 0
        email_failures = []

        for counselor in queryset.filter(is_verified=False):
            counselor.is_verified = True
            counselor.verification_date = timezone.now()
            counselor.save(update_fields=['is_verified', 'verification_date'])

            # Send approval email
            full_name = counselor.user.get_full_name() or counselor.user.email
            sent = EmailService.send_approval_email(
                email=counselor.user.email,
                name=full_name,
                role='counselor',
            )
            if not sent:
                email_failures.append(counselor.user.email)

            approved_count += 1

        if approved_count:
            msg = f"{approved_count} counselor(s) approved."
            if email_failures:
                msg += f" ⚠️ Email failed for: {', '.join(email_failures)}"
            self.message_user(request, msg)
        else:
            self.message_user(request, "No unverified counselors were selected.", level='warning')

    approve_counselors.short_description = '✅ Approve selected counselors'

    def reject_counselors(self, request, queryset):
        """Reject / unverify selected counselors and send notification email."""
        rejected_count = 0
        email_failures = []

        for counselor in queryset.filter(is_verified=True):
            counselor.is_verified = False
            counselor.verification_date = None
            counselor.save(update_fields=['is_verified', 'verification_date'])

            # Send rejection email
            full_name = counselor.user.get_full_name() or counselor.user.email
            sent = EmailService.send_rejection_email(
                email=counselor.user.email,
                name=full_name,
                role='counselor',
            )
            if not sent:
                email_failures.append(counselor.user.email)

            rejected_count += 1

        if rejected_count:
            msg = f"{rejected_count} counselor(s) rejected."
            if email_failures:
                msg += f" ⚠️ Email failed for: {', '.join(email_failures)}"
            self.message_user(request, msg)
        else:
            self.message_user(request, "No verified counselors were selected.", level='warning')

    reject_counselors.short_description = '❌ Reject selected counselors'


@admin.register(LicensedTherapist)
class LicensedTherapistAdmin(admin.ModelAdmin):
    list_display = ('user', 'license_number', 'is_verified', 'license_file_link', 'per_session_rate', 'created_at')
    list_filter = ('is_verified', 'two_factor_enabled')
    search_fields = ('user__email', 'user__first_name', 'license_number')
    readonly_fields = ('slug', 'created_at', 'updated_at', 'license_file_link')
    actions = ['approve_therapists', 'reject_therapists']

    fieldsets = (
        ('User', {'fields': ('user', 'created_at', 'updated_at', 'slug')}),
        ('Credentials', {
            'fields': ('license_number', 'license_file_link'),
            'description': 'License credentials. Click link to download.',
        }),
        ('Profile', {
            'fields': ('modalities', 'languages', 'bio', 'per_minute_rate', 'per_session_rate'),
        }),
        ('Security', {
            'fields': ('two_factor_enabled', 'two_factor_phone'),
        }),
        ('Approval', {
            'fields': ('is_verified', 'verification_date'),
        }),
    )

    def license_file_link(self, obj):
        """Clickable download link for the license file."""
        if obj.license_file:
            return format_html('<a href="{}" target="_blank" style="color: #6C63FF;">📄 Download License</a>', obj.license_file)
        return format_html('<span style="color: #8892B0;">No file uploaded</span>')
    license_file_link.short_description = 'License File'
    license_file_link.allow_tags = True

    def approve_therapists(self, request, queryset):
        """Approve selected therapists and send notification email to each."""
        approved_count = 0
        email_failures = []

        for therapist in queryset.filter(is_verified=False):
            therapist.is_verified = True
            therapist.verification_date = timezone.now()
            therapist.save(update_fields=['is_verified', 'verification_date'])

            full_name = therapist.user.get_full_name() or therapist.user.email
            sent = EmailService.send_approval_email(
                email=therapist.user.email,
                name=full_name,
                role='therapist',
            )
            if not sent:
                email_failures.append(therapist.user.email)

            approved_count += 1

        if approved_count:
            msg = f"{approved_count} therapist(s) approved."
            if email_failures:
                msg += f" ⚠️ Email failed for: {', '.join(email_failures)}"
            self.message_user(request, msg)
        else:
            self.message_user(request, "No unverified therapists were selected.", level='warning')

    approve_therapists.short_description = '✅ Approve selected therapists'

    def reject_therapists(self, request, queryset):
        """Reject / unverify selected therapists and send notification email."""
        rejected_count = 0
        email_failures = []

        for therapist in queryset.filter(is_verified=True):
            therapist.is_verified = False
            therapist.verification_date = None
            therapist.save(update_fields=['is_verified', 'verification_date'])

            full_name = therapist.user.get_full_name() or therapist.user.email
            sent = EmailService.send_rejection_email(
                email=therapist.user.email,
                name=full_name,
                role='therapist',
            )
            if not sent:
                email_failures.append(therapist.user.email)

            rejected_count += 1

        if rejected_count:
            msg = f"{rejected_count} therapist(s) rejected."
            if email_failures:
                msg += f" ⚠️ Email failed for: {', '.join(email_failures)}"
            self.message_user(request, msg)
        else:
            self.message_user(request, "No verified therapists were selected.", level='warning')

    reject_therapists.short_description = '❌ Reject selected therapists'


@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'relationship', 'phone', 'user', 'created_at')
    search_fields = ('name', 'user__email')


@admin.register(OTPToken)
class OTPTokenAdmin(admin.ModelAdmin):
    list_display = ('email', 'otp_code', 'is_verified', 'expires_at', 'created_at')
    list_filter = ('is_verified',)
    search_fields = ('email',)