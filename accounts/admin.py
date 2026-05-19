# accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, GraduateCounselor, LicensedTherapist, EmergencyContact, OTPToken


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
    list_display = ('user', 'university', 'specialization', 'is_verified', 'created_at')
    list_filter = ('is_verified',)
    search_fields = ('user__email', 'user__first_name', 'university')
    readonly_fields = ('slug', 'created_at', 'updated_at')
    actions = ['approve_counselors']

    def approve_counselors(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_verified=True, verification_date=timezone.now())
        self.message_user(request, f"{queryset.count()} counselor(s) approved.")
    approve_counselors.short_description = 'Approve selected counselors'


@admin.register(LicensedTherapist)
class LicensedTherapistAdmin(admin.ModelAdmin):
    list_display = ('user', 'license_number', 'is_verified', 'per_session_rate', 'created_at')
    list_filter = ('is_verified', 'two_factor_enabled')
    search_fields = ('user__email', 'user__first_name', 'license_number')
    readonly_fields = ('slug', 'created_at', 'updated_at')
    actions = ['approve_therapists']

    def approve_therapists(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_verified=True, verification_date=timezone.now())
        self.message_user(request, f"{queryset.count()} therapist(s) approved.")
    approve_therapists.short_description = 'Approve selected therapists'


@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'relationship', 'phone', 'user', 'created_at')
    search_fields = ('name', 'user__email')


@admin.register(OTPToken)
class OTPTokenAdmin(admin.ModelAdmin):
    list_display = ('email', 'otp_code', 'is_verified', 'expires_at', 'created_at')
    list_filter = ('is_verified',)
    search_fields = ('email',)