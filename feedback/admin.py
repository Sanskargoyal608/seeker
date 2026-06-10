from django.contrib import admin
from .models import SessionFeedback

@admin.register(SessionFeedback)
class SessionFeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'user', 'is_flagged', 'submitted_at')
    list_filter = ('is_flagged', 'submitted_at')
    search_fields = ('user__email', 'session__counselor__user__email', 'session__therapist__user__email')
    readonly_fields = ('session', 'user', 'submitted_at', 'created_at')
    list_editable = ('is_flagged',)
    
    fieldsets = (
        ('Info', {
            'fields': ('session', 'user', 'is_flagged', 'submitted_at', 'created_at')
        }),
        ('Feedback', {
            'fields': ('q1_before_session', 'q2_after_session', 'q3_what_helped', 'q4_what_improve')
        }),
    )
