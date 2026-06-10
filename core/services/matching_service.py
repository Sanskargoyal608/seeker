from django.db import transaction
from core.models import Session
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)

class SessionAlreadyAcceptedException(Exception):
    pass

class MatchingService:
    @staticmethod
    def get_waiting_sessions():
        """
        Returns a queryset of all sessions currently in the WAITING state,
        ordered by oldest first (FIFO queue).
        """
        return Session.objects.filter(status=Session.WAITING).order_by('created_at')

    @staticmethod
    def accept_session(counselor, session_id):
        """
        Atomically assigns a counselor to a waiting session.
        Uses select_for_update to prevent race conditions (double-booking).
        """
        with transaction.atomic():
            try:
                # Lock the row until the transaction completes
                session = Session.objects.select_for_update().get(id=session_id)
            except Session.DoesNotExist:
                raise ValueError("Session does not exist.")

            if session.status != Session.WAITING:
                raise SessionAlreadyAcceptedException("This session has already been accepted by another counselor.")

            # Assign counselor and update status
            session.counselor = counselor
            session.status = Session.MATCHED
            session.save(update_fields=['counselor', 'status'])
            
            logger.info(f"Session {session.id} accepted by counselor {counselor.id}")

            # Notify the user via WebSocket
            MatchingService._notify_session_matched(session)
            
            return session

    @staticmethod
    def _notify_session_matched(session):
        channel_layer = get_channel_layer()
        room_group_name = f'chat_{session.id}'
        
        counselor_name = "A counselor"
        if session.counselor and session.counselor.user:
            counselor_name = session.counselor.user.first_name or "A counselor"
            
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'system.alert',
                'message': f"{counselor_name} has joined the session."
            }
        )
