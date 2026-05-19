# feedback/admin.py
from django.contrib import admin
from .models import SessionFeedback


@admin.register(SessionFeedback)
class SessionFeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'user', 'is_flagged', 'submitted_at')
    list_filter = ('is_flagged', 'submitted_at')
    search_fields = ('session__id', 'user__email')
