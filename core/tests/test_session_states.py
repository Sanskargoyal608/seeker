import pytest
from django.core.exceptions import ValidationError
from core.models import Session
from core.state_machine import SessionStateManager

@pytest.mark.django_db
class TestSessionStates:
    def test_initial_status_waiting(self, django_user_model):
        """Test that a new session defaults to WAITING status."""
        user = django_user_model.objects.create(username="testuser")
        session = Session.objects.create(user=user)
        assert session.status == Session.WAITING

    def test_valid_transition_waiting_to_matched(self, django_user_model):
        user = django_user_model.objects.create(username="testuser")
        session = Session.objects.create(user=user)
        
        session = SessionStateManager.transition_to(session, Session.MATCHED)
        assert session.status == Session.MATCHED

    def test_valid_transition_matched_to_active(self, django_user_model):
        user = django_user_model.objects.create(username="testuser")
        session = Session.objects.create(user=user, status=Session.MATCHED)
        
        session = SessionStateManager.transition_to(session, Session.ACTIVE)
        assert session.status == Session.ACTIVE
        assert session.start_time is not None

    def test_valid_transition_active_to_payment_pending(self, django_user_model):
        user = django_user_model.objects.create(username="testuser")
        session = Session.objects.create(user=user, status=Session.ACTIVE)
        
        session = SessionStateManager.transition_to(session, Session.PAYMENT_PENDING)
        assert session.status == Session.PAYMENT_PENDING

    def test_valid_transition_payment_pending_to_paid(self, django_user_model):
        user = django_user_model.objects.create(username="testuser")
        session = Session.objects.create(user=user, status=Session.PAYMENT_PENDING)
        
        session = SessionStateManager.transition_to(session, Session.PAID)
        assert session.status == Session.PAID

    def test_valid_transition_paid_to_ended(self, django_user_model):
        user = django_user_model.objects.create(username="testuser")
        session = Session.objects.create(user=user, status=Session.PAID)
        
        session = SessionStateManager.transition_to(session, Session.ENDED)
        assert session.status == Session.ENDED
        assert session.end_time is not None

    def test_valid_transition_waiting_to_ended(self, django_user_model):
        user = django_user_model.objects.create(username="testuser")
        session = Session.objects.create(user=user, status=Session.WAITING)
        
        session = SessionStateManager.transition_to(session, Session.ENDED)
        assert session.status == Session.ENDED

    def test_invalid_transition_waiting_to_active(self, django_user_model):
        user = django_user_model.objects.create(username="testuser")
        session = Session.objects.create(user=user, status=Session.WAITING)
        
        with pytest.raises(ValidationError):
            SessionStateManager.transition_to(session, Session.ACTIVE)

    def test_invalid_transition_matched_to_paid(self, django_user_model):
        user = django_user_model.objects.create(username="testuser")
        session = Session.objects.create(user=user, status=Session.MATCHED)
        
        with pytest.raises(ValidationError):
            SessionStateManager.transition_to(session, Session.PAID)

    def test_invalid_transition_ended_to_waiting(self, django_user_model):
        user = django_user_model.objects.create(username="testuser")
        session = Session.objects.create(user=user, status=Session.ENDED)
        
        with pytest.raises(ValidationError):
            SessionStateManager.transition_to(session, Session.WAITING)

    def test_duration_calculated_on_ended(self, django_user_model):
        user = django_user_model.objects.create(username="testuser")
        session = Session.objects.create(user=user, status=Session.MATCHED)
        
        session = SessionStateManager.transition_to(session, Session.ACTIVE)
        assert session.start_time is not None
        
        # Simulate some time passing (mocking or setting end_time directly isn't needed here 
        # since it uses timezone.now(), but we can test that it sets something).
        session = SessionStateManager.transition_to(session, Session.ENDED)
        assert session.end_time is not None
        assert session.duration_minutes >= 0
