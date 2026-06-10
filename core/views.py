from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema

from accounts.permissions import (
    IsAuthenticated, IsGeneralUser, IsGraduateCounselor,
    IsLicensedTherapist, IsVerified
)


class CounselorQueueView(APIView):
    """
    Counselor-only endpoint demonstrating role-based permission enforcement.
    Only verified graduate counselors can access this endpoint.

    Permission layers:
    - IsAuthenticated: User must be logged in
    - IsGraduateCounselor: User must have COUNSELOR role
    - IsVerified: User's GraduateCounselor profile must be verified by admin

    Returns:
    - 200 OK: Verified counselor accessing the queue
    - 403 Forbidden: General user, unverified counselor, or therapist attempts access
    - 401 Unauthorized: Unauthenticated user attempts access
    """
    permission_classes = [IsAuthenticated, IsGraduateCounselor, IsVerified]

    @extend_schema(responses={200: {'example': {'message': 'Access granted to counselor queue'}}})
    def get(self, request):
        return Response({
            'message': 'Access granted to counselor queue',
            'user_email': request.user.email,
            'role': request.user.role,
            'is_verified': request.user.counselor_profile.is_verified,
        }, status=status.HTTP_200_OK)


class TherapistQueueView(APIView):
    """
    Therapist-only endpoint demonstrating role-based permission enforcement.
    Only verified licensed therapists can access this endpoint.

    Permission layers:
    - IsAuthenticated: User must be logged in
    - IsLicensedTherapist: User must have THERAPIST role
    - IsVerified: User's LicensedTherapist profile must be verified by admin

    Returns:
    - 200 OK: Verified therapist accessing the queue
    - 403 Forbidden: General user, counselor, or unverified therapist attempts access
    - 401 Unauthorized: Unauthenticated user attempts access
    """
    permission_classes = [IsAuthenticated, IsLicensedTherapist, IsVerified]

    @extend_schema(responses={200: {'example': {'message': 'Access granted to therapist queue'}}})
    def get(self, request):
        return Response({
            'message': 'Access granted to therapist queue',
            'user_email': request.user.email,
            'role': request.user.role,
            'is_verified': request.user.therapist_profile.is_verified,
        }, status=status.HTTP_200_OK)


class GeneralUserDashboardView(APIView):
    """
    General user-only endpoint demonstrating role-based permission enforcement.
    Only general users (patients) can access this endpoint.

    Permission layers:
    - IsAuthenticated: User must be logged in
    - IsGeneralUser: User must have GENERAL_USER role

    Note: General users do not require verification, unlike counselors/therapists.

    Returns:
    - 200 OK: General user accessing their dashboard
    - 403 Forbidden: Counselor or therapist attempts access
    - 401 Unauthorized: Unauthenticated user attempts access
    """
    permission_classes = [IsAuthenticated, IsGeneralUser]

    @extend_schema(responses={200: {'example': {'message': 'Access granted to user dashboard'}}})
    def get(self, request):
        return Response({
            'message': 'Access granted to user dashboard',
            'user_email': request.user.email,
            'role': request.user.role,
            'name': f'{request.user.first_name} {request.user.last_name}',
        }, status=status.HTTP_200_OK)


from .serializers import TriageSessionSerializer, TriageRespondRequestSerializer
from .services.triage_service import TriageService

class TriageStartView(APIView):
    """Starts a new AI triage conversation."""
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={201: TriageSessionSerializer})
    def post(self, request):
        service = TriageService()
        triage_session = service.start_triage(request.user)
        serializer = TriageSessionSerializer(triage_session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class TriageRespondView(APIView):
    """Processes user response in the AI triage conversation."""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TriageRespondRequestSerializer,
        responses={200: TriageSessionSerializer}
    )
    def post(self, request):
        req_serializer = TriageRespondRequestSerializer(data=request.data)
        if not req_serializer.is_valid():
            return Response(req_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        triage_session_id = req_serializer.validated_data['triage_session_id']
        user_response = req_serializer.validated_data['response']
        
        service = TriageService()
        triage_session = service.process_response(triage_session_id, user_response)
        
        serializer = TriageSessionSerializer(triage_session)
        return Response(serializer.data, status=status.HTTP_200_OK)

class VerifyPaymentView(APIView):
    """
    Mock payment endpoint for Sprint 5.
    Marks the session as PAID and delivers any held messages.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        from .models import Session, SessionTimer, ChatMessage
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        try:
            session = Session.objects.get(id=session_id)
            
            # 1. Update session status
            if session.status == Session.PAYMENT_PENDING:
                session.status = Session.PAID
                session.save(update_fields=['status'])
                
            # 2. Update timer
            from django.utils import timezone
            from datetime import timedelta
            timer, _ = SessionTimer.objects.get_or_create(
                session=session,
                defaults={'end_time': timezone.now() + timedelta(minutes=15)}
            )
            timer.is_paid = True
            timer.save(update_fields=['is_paid'])
            
            # 3. Release held messages
            channel_layer = get_channel_layer()
            room_group_name = f'chat_{session.id}'
            
            held_messages = ChatMessage.objects.filter(session=session, is_held_for_payment=True)
            for msg in held_messages:
                msg.is_held_for_payment = False
                msg.save(update_fields=['is_held_for_payment'])
                
                async_to_sync(channel_layer.group_send)(
                    room_group_name,
                    {
                        'type': 'chat.message',
                        'message': msg.message_text,
                        'sender': 'Other'
                    }
                )
                
            return Response({'status': 'PAID', 'message': 'Payment verified and session resumed'}, status=status.HTTP_200_OK)
        except Session.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

from .services.matching_service import MatchingService, SessionAlreadyAcceptedException

class QueueView(APIView):
    """
    Counselor-only endpoint to list all WAITING sessions.
    """
    permission_classes = [IsAuthenticated, IsGraduateCounselor, IsVerified]

    def get(self, request):
        sessions = MatchingService.get_waiting_sessions()
        data = [
            {
                'id': session.id,
                'created_at': session.created_at,
                'is_crisis_flagged': session.is_crisis_flagged,
            }
            for session in sessions
        ]
        return Response(data, status=status.HTTP_200_OK)

class AcceptSessionView(APIView):
    """
    Counselor-only endpoint to accept a waiting session.
    """
    permission_classes = [IsAuthenticated, IsGraduateCounselor, IsVerified]

    def patch(self, request, session_id):
        counselor = request.user.counselor_profile
        
        try:
            session = MatchingService.accept_session(counselor, session_id)
            return Response(
                {'message': 'Session accepted successfully.', 'session_id': session.id},
                status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except SessionAlreadyAcceptedException as e:
            return Response(
                {'error': str(e), 'message': 'Already some one else accepted it gently.'},
                status=status.HTTP_409_CONFLICT
            )

from django.shortcuts import get_object_or_404
from .models import Session, SessionNote, ChatMessage, EscalationEvent
from .serializers import SessionNoteSerializer, EscalationEventSerializer
from .permissions import IsNoteOwnerOrTherapist

class SessionNoteListView(APIView):
    """GET/POST /api/sessions/{id}/notes/"""
    permission_classes = [IsAuthenticated, IsNoteOwnerOrTherapist]
    
    def get(self, request, session_id):
        # We enforce that the session ID belongs to a session the user has access to
        session = get_object_or_404(Session, id=session_id)
        
        # Double check object permissions for the session context
        # (Though IsNoteOwnerOrTherapist is typically run on the note object itself, 
        # we can manually check if they have business here)
        if request.user.role == request.user.COUNSELOR:
            if session.counselor != request.user.counselor_profile:
                return Response(status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == request.user.THERAPIST:
            if session.therapist != request.user.therapist_profile:
                return Response(status=status.HTTP_403_FORBIDDEN)
        else:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        notes = SessionNote.objects.filter(session=session)
        serializer = SessionNoteSerializer(notes, many=True)
        return Response(serializer.data)
        
    def post(self, request, session_id):
        session = get_object_or_404(Session, id=session_id)
        
        if request.user.role == request.user.COUNSELOR:
            if session.counselor != request.user.counselor_profile:
                return Response(status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == request.user.THERAPIST:
            if session.therapist != request.user.therapist_profile:
                return Response(status=status.HTTP_403_FORBIDDEN)
        else:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        serializer = SessionNoteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(session=session, author=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SessionNoteDetailView(APIView):
    """DELETE /api/sessions/{session_id}/notes/{note_id}/"""
    permission_classes = [IsAuthenticated, IsNoteOwnerOrTherapist]
    
    def delete(self, request, session_id, note_id):
        note = get_object_or_404(SessionNote, id=note_id, session_id=session_id)
        self.check_object_permissions(request, note)
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class MessageHighlightView(APIView):
    """PATCH /api/messages/{id}/highlight/"""
    permission_classes = [IsAuthenticated] # Needs custom logic to restrict to counselor/therapist
    
    def patch(self, request, message_id):
        if request.user.role == request.user.GENERAL_USER:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        message = get_object_or_404(ChatMessage, id=message_id)
        session = message.session
        
        # Verify access to session
        if request.user.role == request.user.COUNSELOR:
            if session.counselor != request.user.counselor_profile:
                return Response(status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == request.user.THERAPIST:
            if session.therapist != request.user.therapist_profile:
                return Response(status=status.HTTP_403_FORBIDDEN)
                
        # Toggle highlight
        message.is_highlighted = not message.is_highlighted
        message.save(update_fields=['is_highlighted'])
        
        # Create note if highlighted
        note = None
        if message.is_highlighted:
            note_text = request.data.get('note', 'Highlighted message')
            note = SessionNote.objects.create(
                session=session,
                author=request.user,
                note_text=note_text,
                linked_message=message
            )
            return Response({'is_highlighted': True, 'note_id': note.id}, status=status.HTTP_200_OK)
        else:
            # Delete associated note if unhighlighted
            SessionNote.objects.filter(linked_message=message).delete()
            return Response({'is_highlighted': False}, status=status.HTTP_200_OK)

from .tasks import send_escalation_notifications

class EscalateSessionView(APIView):
    """POST /api/sessions/{id}/escalate/"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, session_id):
        if request.user.role != request.user.COUNSELOR:
            return Response({"error": "Only counselors can escalate."}, status=status.HTTP_403_FORBIDDEN)
            
        session = get_object_or_404(Session, id=session_id)
        if session.counselor != request.user.counselor_profile:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        serializer = EscalationEventSerializer(data=request.data)
        if serializer.is_valid():
            escalation = serializer.save(
                session=session, 
                from_counselor=request.user.counselor_profile,
                status=EscalationEvent.PENDING
            )
            
            # Fire celery task
            send_escalation_notifications.delay(escalation.id)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from django.utils import timezone
from .tasks import calculate_earnings
from notifications.tasks import send_feedback_prompt

class SessionEndView(APIView):
    """POST /api/sessions/{id}/end/"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, session_id):
        session = get_object_or_404(Session, id=session_id)
        
        # Verify access
        if request.user.role == request.user.GENERAL_USER and session.user != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == request.user.COUNSELOR and session.counselor != request.user.counselor_profile:
            return Response(status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == request.user.THERAPIST and session.therapist != request.user.therapist_profile:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        if session.status == Session.ENDED:
            return Response({'message': 'Session already ended'}, status=status.HTTP_200_OK)
            
        session.status = Session.ENDED
        session.end_time = timezone.now()
        
        # Calculate duration
        if session.start_time:
            delta = session.end_time - session.start_time
            session.duration_minutes = int(delta.total_seconds() // 60)
            
        session.save(update_fields=['status', 'end_time', 'duration_minutes'])
        
        # Trigger Celery tasks
        calculate_earnings.delay(session.id)
        send_feedback_prompt.apply_async(args=[session.id], countdown=300) # 5 minutes
        
        return Response({'message': 'Session ended gracefully.', 'duration_minutes': session.duration_minutes}, status=status.HTTP_200_OK)
