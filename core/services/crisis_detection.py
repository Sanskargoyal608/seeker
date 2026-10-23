import logging
import re
from collections import namedtuple
from datetime import timedelta

from django.utils import timezone

from core.crisis_keywords import BUILTIN_PHRASES
from core.models import CrisisAlert, CrisisKeyword

logger = logging.getLogger(__name__)

CrisisMatch = namedtuple('CrisisMatch', ['category', 'phrase'])

# After staff have been notified about someone, further detections for the same
# person are still recorded but do not email staff again within this window.
NOTIFY_COOLDOWN = timedelta(minutes=10)

_NORMALISE_STRIP = re.compile(r"[’‘'`]")
_NORMALISE_SPACE = re.compile(r'\s+')


def normalise(text):
    text = _NORMALISE_STRIP.sub('', str(text).lower())
    text = text.replace('-', ' ').replace('_', ' ')
    return _NORMALISE_SPACE.sub(' ', text).strip()


def _compile(phrase):
    phrase = normalise(phrase)
    if phrase.isascii():
        # Whole-word match so "abuse" does not fire inside another word.
        return re.compile(r'\b' + re.escape(phrase) + r'\b')
    # \b is unreliable around Devanagari combining marks; plain substring there.
    return re.compile(re.escape(phrase))


_BUILTIN = [(category, phrase, _compile(phrase))
            for category, phrases in BUILTIN_PHRASES.items() for phrase in phrases]


class CrisisDetectionService:
    @staticmethod
    def detect(text):
        """
        Pure detection, no side effects. Returns a CrisisMatch (category, phrase)
        for the first crisis phrase found, else None. Uses the built-in list plus
        any phrases staff added in Django Admin.
        """
        if not text:
            return None
        haystack = normalise(text)

        for category, phrase, pattern in _BUILTIN:
            if pattern.search(haystack):
                return CrisisMatch(category, phrase)

        for kw in CrisisKeyword.objects.all():
            if _compile(kw.keyword).search(haystack):
                return CrisisMatch(kw.category, kw.keyword)
        return None

    @staticmethod
    def scan_message(session, content):
        """
        Scan a message the seeker wrote in a chat session. On a hit, raises an
        alert. Returns True if a crisis was detected.
        """
        match = CrisisDetectionService.detect(content)
        if not match:
            return False
        CrisisDetectionService.raise_alert(
            user=session.user, session=session, source=CrisisAlert.CHAT,
            content=content, match=match,
        )
        return True

    @staticmethod
    def raise_alert(*, user, session, source, content, match):
        """
        Record the alert, flag the session, and (outside the cooldown window) have
        staff notified by a background task. Never raises: a failure to notify must
        not break the chat or the panic button; it is logged and stored on the alert.
        """
        logger.warning("Crisis detected (source=%s, category=%s, session=%s)",
                       source, match.category, getattr(session, 'id', None))

        if session is not None and not session.is_crisis_flagged:
            session.is_crisis_flagged = True
            session.save(update_fields=['is_crisis_flagged'])

        recently_notified = bool(user) and CrisisAlert.objects.filter(
            user=user, suppressed=False,
            created_at__gte=timezone.now() - NOTIFY_COOLDOWN,
        ).exists()

        alert = CrisisAlert.objects.create(
            session=session, user=user, source=source,
            message_content=content, matched_keyword=match.phrase,
            suppressed=recently_notified,
        )

        if not recently_notified:
            try:
                from core.tasks import notify_staff_of_crisis
                notify_staff_of_crisis.delay(alert.id)
            except Exception as exc:  # broker down, etc.
                logger.error("Could not queue crisis notification for alert %s: %s", alert.id, exc)
                CrisisAlert.objects.filter(pk=alert.pk).update(
                    notification_error=f"Could not queue notification: {exc}")
        return alert
