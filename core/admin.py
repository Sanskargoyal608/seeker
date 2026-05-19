# core/admin.py
from django.contrib import admin
from .models import Session, ChatMessage, SessionNote, EscalationEvent, EarningsRecord, PayoutRecord


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'user', 'counselor', 'therapist', 'duration_minutes', 'is_crisis_flagged', 'created_at')
    list_filter = ('status', 'is_crisis_flagged', 'created_at')
    search_fields = ('user__email', 'counselor__user__email', 'therapist__user__email')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'sender', 'is_highlighted', 'created_at')
    list_filter = ('is_highlighted', 'created_at')
    search_fields = ('session__id', 'sender__email', 'message_text')


@admin.register(SessionNote)
class SessionNoteAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'author', 'is_private', 'created_at')
    list_filter = ('is_private', 'created_at')
    search_fields = ('session__id', 'author__email', 'note_text')


@admin.register(EscalationEvent)
class EscalationEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'urgency', 'status', 'from_counselor', 'to_therapist', 'created_at')
    list_filter = ('urgency', 'status', 'created_at')
    search_fields = ('from_counselor__user__email', 'to_therapist__user__email')


@admin.register(EarningsRecord)
class EarningsRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'counselor', 'therapist', 'duration_minutes', 'gross_amount', 'net_amount', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('counselor__user__email', 'therapist__user__email', 'session__id')


@admin.register(PayoutRecord)
class PayoutRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'counselor', 'therapist', 'total_amount', 'payout_date', 'created_at')
    list_filter = ('status', 'created_at', 'payout_date')
    search_fields = ('counselor__user__email', 'therapist__user__email')
