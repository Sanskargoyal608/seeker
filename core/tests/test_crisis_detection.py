import pytest
from django.core import mail

from accounts.models import User
from core.models import CrisisKeyword, CrisisAlert, EmergencyContact, Session
from core.services.crisis_detection import CrisisDetectionService


@pytest.fixture
def session(db):
    EmergencyContact.objects.create(email="admin@test.com", name="Admin", is_active=True)
    user = User.objects.create(email="user@test.com")
    return Session.objects.create(user=user)


@pytest.mark.django_db
class TestDetection:
    @pytest.mark.parametrize('text', [
        "I just want to commit suicide right now",
        "i'm feeling SUICIDAL",
        "I don’t want to live anymore",            # curly apostrophe
        "dont want to live",
        "I keep thinking about ending my life",
        "I want to hurt myself",
        "I've been self-harming and cutting myself",
        "I took too many pills",
        "he hits me when he's drunk",
        "mujhe marna chahta hu",                    # Hinglish
        "मैं आत्महत्या करना चाहता हूँ",              # Devanagari
    ])
    def test_detects_with_an_empty_keyword_table(self, text):
        # Nothing is seeded: the built-in list alone must work.
        assert CrisisKeyword.objects.count() == 0
        assert CrisisDetectionService.detect(text) is not None

    @pytest.mark.parametrize('text', [
        "I am feeling a bit sad today",
        "work has been stressful and I cannot sleep",
        "My abusive-sounding boss? no, my abacus broke",   # 'abacus' is not 'abuse'
        "Let's go to the photo shoot on Sunday",
        "",
        None,
    ])
    def test_ordinary_text_is_not_flagged(self, text):
        assert CrisisDetectionService.detect(text) is None

    def test_staff_added_phrases_are_used_too(self):
        CrisisKeyword.objects.create(keyword="custom danger phrase", category="OTHER")
        match = CrisisDetectionService.detect("this is a Custom Danger Phrase here")
        assert match is not None and match.category == "OTHER"


@pytest.mark.django_db
class TestAlerts:
    def test_scan_flags_session_records_alert_and_emails_staff(self, session):
        assert CrisisDetectionService.scan_message(session, "I want to kill myself") is True

        session.refresh_from_db()
        assert session.is_crisis_flagged
        alert = CrisisAlert.objects.get()
        assert alert.source == CrisisAlert.CHAT and alert.user_id == session.user_id
        assert alert.staff_notified_at is not None and alert.notification_error == ''

        assert len(mail.outbox) == 1
        assert "CRISIS ALERT" in mail.outbox[0].subject
        assert mail.outbox[0].to == ["admin@test.com"]

    def test_no_crisis_creates_nothing(self, session):
        assert CrisisDetectionService.scan_message(session, "just a normal day") is False
        assert CrisisAlert.objects.count() == 0 and len(mail.outbox) == 0

    def test_never_falls_back_to_a_personal_address(self, session):
        EmergencyContact.objects.all().delete()
        CrisisDetectionService.scan_message(session, "suicide")

        assert len(mail.outbox) == 0                       # nobody was invented
        alert = CrisisAlert.objects.get()                  # but the alert is kept...
        assert 'No active staff alert emails' in alert.notification_error   # ...and says why
        assert alert.staff_notified_at is None

    def test_repeat_detections_are_recorded_but_staff_emailed_once(self, session):
        for text in ("I want to die", "I really want to die", "I want to die tonight"):
            CrisisDetectionService.scan_message(session, text)
        assert CrisisAlert.objects.count() == 3
        assert len(mail.outbox) == 1
