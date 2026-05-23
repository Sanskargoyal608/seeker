from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import Session

class SessionStateManager:
    """
    Manages the state transitions for a Session.
    Enforces valid transitions and applies related side effects (like timestamps).
    """
    VALID_TRANSITIONS = {
        Session.WAITING: [Session.MATCHED, Session.ENDED],
        Session.MATCHED: [Session.ACTIVE, Session.ENDED],
        Session.ACTIVE: [Session.PAYMENT_PENDING, Session.ENDED],
        Session.PAYMENT_PENDING: [Session.PAID, Session.ENDED],
        Session.PAID: [Session.ENDED],
        Session.ENDED: [],
    }

    @classmethod
    def transition_to(cls, session, new_status, **kwargs):
        """
        Transitions the session to the new_status if valid.
        Raises ValidationError if the transition is invalid.
        """
        if new_status not in cls.VALID_TRANSITIONS.get(session.status, []):
            raise ValidationError(
                f"Invalid transition from {session.status} to {new_status}"
            )
        
        session.status = new_status
        
        # Side effects for state transitions
        if new_status == Session.ACTIVE and not session.start_time:
            session.start_time = timezone.now()
            
        elif new_status == Session.ENDED and not session.end_time:
            session.end_time = timezone.now()
            if session.start_time:
                delta = session.end_time - session.start_time
                session.duration_minutes = int(delta.total_seconds() // 60)
                
        session.save()
        return session
