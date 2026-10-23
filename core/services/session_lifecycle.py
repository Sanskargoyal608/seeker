from datetime import timedelta

from django.conf import settings
from django.utils import timezone


def start_session(session, *, status=None, free_minutes=None):
    """
    Mark the moment a session really begins (a provider accepted, a booking was
    started, a follow-up was opened). Sets start_time, so duration and earnings
    can be worked out, and starts the free-chat timer from now rather than from
    whenever someone first connects.

    Safe to call twice: an already started session keeps its original start.
    """
    from core.models import SessionTimer

    if session.start_time is None:
        session.start_time = timezone.now()
    if status:
        session.status = status
    session.save(update_fields=['start_time', 'status'])

    minutes = settings.FREE_CHAT_MINUTES if free_minutes is None else free_minutes
    SessionTimer.objects.get_or_create(
        session=session,
        defaults={'end_time': session.start_time + timedelta(minutes=minutes)},
    )
    return session
