import pytest
from django.core import mail
from core.models import CrisisKeyword, CrisisAlert, EmergencyContact, Session
from core.services.crisis_detection import CrisisDetectionService
from accounts.models import User

@pytest.fixture
def crisis_setup(db):
    CrisisKeyword.objects.create(keyword="suicide", category="SUICIDE")
    CrisisKeyword.objects.create(keyword="hurt myself", category="SELF_HARM")
    EmergencyContact.objects.create(email="admin@test.com", name="Admin", is_active=True)
    
    user = User.objects.create(email="user@test.com")
    session = Session.objects.create(user=user)
    return session

@pytest.mark.django_db
class TestCrisisDetection:
    def test_no_crisis(self, crisis_setup):
        session = crisis_setup
        is_crisis = CrisisDetectionService.scan_message(session, "I am feeling a bit sad today")
        
        assert not is_crisis
        assert not session.is_crisis_flagged
        assert CrisisAlert.objects.count() == 0
        assert len(mail.outbox) == 0

    def test_crisis_detected(self, crisis_setup):
        session = crisis_setup
        is_crisis = CrisisDetectionService.scan_message(session, "I just want to commit suicide right now")
        
        assert is_crisis
        
        session.refresh_from_db()
        assert session.is_crisis_flagged
        
        alert = CrisisAlert.objects.first()
        assert alert is not None
        assert alert.matched_keyword == "suicide"
        
        assert len(mail.outbox) == 1
        assert "CRISIS ALERT" in mail.outbox[0].subject
        assert "admin@test.com" in mail.outbox[0].to

    def test_crisis_case_insensitive(self, crisis_setup):
        session = crisis_setup
        is_crisis = CrisisDetectionService.scan_message(session, "I want to HURT MYSELF")
        
        assert is_crisis
        assert CrisisAlert.objects.count() == 1
        assert CrisisAlert.objects.first().matched_keyword == "hurt myself"

    def test_crisis_fallback_email(self, crisis_setup):
        EmergencyContact.objects.all().delete()
        
        session = crisis_setup
        CrisisDetectionService.scan_message(session, "suicide")
        
        assert len(mail.outbox) == 1
        assert "sanskargoyal608@gmail.com" in mail.outbox[0].to
