from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes

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

    @extend_schema(responses={200: {'example': {'message': 'Access granted to counselor queue', 'recent_sessions': []}}})
    def get(self, request):
        from .serializers import SessionSerializer
        
        # Get counselor's session history
        sessions = Session.objects.filter(counselor=request.user.counselor_profile).order_by('-created_at')[:10]
        sessions_data = SessionSerializer(sessions, many=True).data
        
        return Response({
            'message': 'Access granted to counselor queue',
            'user_email': request.user.email,
            'role': request.user.role,
            'is_verified': request.user.counselor_profile.is_verified,
            'recent_sessions': sessions_data,
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

    @extend_schema(responses={200: {'example': {'message': 'Access granted to therapist queue', 'recent_sessions': [], 'escalations': []}}})
    def get(self, request):
        from .serializers import SessionSerializer
        from .models import Session, EscalationRequest
        
        # Get therapist's active sessions (exclude ENDED)
        sessions = Session.objects.filter(
            therapist=request.user.therapist_profile
        ).exclude(status=Session.ENDED).order_by('-created_at')[:10]
        sessions_data = SessionSerializer(sessions, many=True).data
        
        # Get active escalations
        escalations = EscalationRequest.objects.filter(
            therapist=request.user.therapist_profile,
            status=EscalationRequest.PENDING
        ).order_by('-created_at')
        
        # Serialize escalations manually or create a small serializer
        escalations_data = []
        for esc in escalations:
            escalations_data.append({
                'id': esc.id,
                'session': esc.session.id if esc.session else None,
                'urgency': esc.urgency,
                'reason': esc.reason,
                'status': esc.status,
                'counselor_name': esc.counselor.user.first_name + ' ' + esc.counselor.user.last_name if esc.counselor else 'Unknown',
                'created_at': esc.created_at.isoformat()
            })
        
        return Response({
            'message': 'Access granted to therapist queue',
            'user_email': request.user.email,
            'role': request.user.role,
            'is_verified': request.user.therapist_profile.is_verified,
            'recent_sessions': sessions_data,
            'escalations': escalations_data,
        }, status=status.HTTP_200_OK)


class DashboardView(APIView):
    """
    Unified dashboard endpoint for all users.
    Returns recent sessions based on user role.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: {'example': {'message': 'Access granted to dashboard', 'recent_sessions': []}}})
    def get(self, request):
        from .serializers import SessionSerializer
        from accounts.models import User
        
        # Get user's session history based on role
        if request.user.role == User.GENERAL_USER:
            sessions = Session.objects.filter(user=request.user).order_by('-created_at')[:10]
        elif request.user.role == User.COUNSELOR:
            sessions = Session.objects.filter(counselor=request.user.counselor_profile).order_by('-created_at')[:10]
        elif request.user.role == User.THERAPIST:
            sessions = Session.objects.filter(therapist=request.user.therapist_profile).order_by('-created_at')[:10]
        else:
            sessions = Session.objects.none()
            
        sessions_data = SessionSerializer(sessions, many=True).data
        from profiles.models import Booking
        from profiles.serializers import BookingSerializer

        # Get upcoming bookings
        if request.user.role == User.GENERAL_USER:
            bookings = Booking.objects.filter(user=request.user, status=Booking.SCHEDULED).order_by('scheduled_datetime')[:10]
        elif request.user.role == User.THERAPIST:
            bookings = Booking.objects.filter(therapist=request.user.therapist_profile, status=Booking.SCHEDULED).order_by('scheduled_datetime')[:10]
        else:
            bookings = Booking.objects.none()

        bookings_data = BookingSerializer(bookings, many=True).data

        # Enrich sessions with provider details for general users
        if request.user.role == User.GENERAL_USER:
            for s_data, s_obj in zip(sessions_data, sessions):
                provider = None
                if s_obj.therapist:
                    provider = {
                        'id': s_obj.therapist.user.id,
                        'name': f"{s_obj.therapist.user.first_name} {s_obj.therapist.user.last_name}".strip() or "Therapist",
                        'photo': s_obj.therapist.profile_photo,
                        'title': 'Licensed Therapist',
                        'specialization': ', '.join(s_obj.therapist.modalities) if s_obj.therapist.modalities else ''
                    }
                elif s_obj.counselor:
                    provider = {
                        'id': s_obj.counselor.user.id,
                        'name': f"{s_obj.counselor.user.first_name} {s_obj.counselor.user.last_name}".strip() or "Counselor",
                        'photo': s_obj.counselor.profile_photo,
                        'title': 'Graduate Counselor',
                        'specialization': s_obj.counselor.specialization
                    }
                s_data['provider_details'] = provider

        response_data = {
            'message': 'Access granted to dashboard',
            'user_email': request.user.email,
            'role': request.user.role,
            'name': f'{request.user.first_name} {request.user.last_name}',
            'recent_sessions': sessions_data,
            'upcoming_bookings': bookings_data,
        }

        if request.user.role == User.THERAPIST:
            from collections import defaultdict
            from .models import EscalationRequest
            
            all_sessions = Session.objects.filter(therapist=request.user.therapist_profile).select_related('user').order_by('-created_at')
            client_dict = defaultdict(list)
            for s in all_sessions:
                if s.user:
                    client_dict[s.user].append(s)
            
            grouped_clients = []
            for client, client_sessions in client_dict.items():
                grouped_clients.append({
                    'client_id': client.id,
                    'client_name': f"{client.first_name} {client.last_name}".strip(),
                    'client_email': client.email,
                    'sessions': SessionSerializer(client_sessions, many=True).data
                })
            response_data['grouped_clients'] = grouped_clients
            
            # Fetch any pending escalation that was missed by WebSocket
            pending_escalation = EscalationRequest.objects.filter(
                therapist=request.user.therapist_profile, 
                status=EscalationRequest.PENDING
            ).order_by('-created_at').first()
            
            if pending_escalation:
                response_data['pending_escalation'] = {
                    'id': pending_escalation.id,
                    'urgency': pending_escalation.urgency,
                    'reason': pending_escalation.reason,
                    'triage_session_id': pending_escalation.session.id
                }

        return Response(response_data, status=status.HTTP_200_OK)


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

from .models import TriageSession

class TriageActiveView(APIView):
    """Fetches the active incomplete triage session for the user, if any."""
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: TriageSessionSerializer})
    def get(self, request):
        active_triage = TriageSession.objects.filter(user=request.user, is_complete=False).first()
        if not active_triage:
            return Response({'detail': 'No active triage session found.'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = TriageSessionSerializer(active_triage)
        return Response(serializer.data, status=status.HTTP_200_OK)

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
    permission_classes = [IsAuthenticated, IsGraduateCounselor]

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
    Provider endpoint to accept a waiting session.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, session_id):
        from accounts.models import User
        if request.user.role == User.COUNSELOR:
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
        elif request.user.role == User.THERAPIST:
            therapist = request.user.therapist_profile
            try:
                session = Session.objects.get(id=session_id)
                if session.therapist != therapist:
                    return Response({'error': 'Not assigned to this therapist.'}, status=status.HTTP_403_FORBIDDEN)
                if session.status != Session.WAITING:
                    return Response({'error': 'Session is not waiting.'}, status=status.HTTP_400_BAD_REQUEST)
                
                session.status = Session.MATCHED
                session.save(update_fields=['status'])
                
                # We could notify the user here if we wanted
                
                return Response(
                    {'message': 'Session accepted successfully.', 'session_id': session.id},
                    status=status.HTTP_200_OK
                )
            except Session.DoesNotExist:
                return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(status=status.HTTP_403_FORBIDDEN)

class SessionMessageListView(APIView):
    """
    Endpoint to get all messages for a specific session.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        from accounts.models import User
        try:
            session = Session.objects.get(id=session_id)
        except Session.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        messages = session.messages.all().order_by('created_at')
        
        data = []
        for msg in messages:
            if msg.sender is None:
                sender_role = 'System'
                sender_id = None
            else:
                sender_role = msg.sender.role
                sender_id = msg.sender.id

            data.append({
                'id': str(msg.id),
                'text': msg.message_text,
                'sender_id': sender_id,
                'sender_role': sender_role,
                'created_at': msg.created_at,
            })
            
        return Response(data, status=status.HTTP_200_OK)

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
        
        from accounts.models import User
        # Double check object permissions for the session context
        # (Though IsNoteOwnerOrTherapist is typically run on the note object itself, 
        # we can manually check if they have business here)
        if request.user.role == User.COUNSELOR:
            if session.counselor != request.user.counselor_profile:
                return Response(status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == User.THERAPIST:
            if session.therapist != request.user.therapist_profile:
                return Response(status=status.HTTP_403_FORBIDDEN)
        else:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        notes = SessionNote.objects.filter(session=session)
        serializer = SessionNoteSerializer(notes, many=True)
        return Response(serializer.data)
        
    def post(self, request, session_id):
        session = get_object_or_404(Session, id=session_id)
        
        from accounts.models import User
        if request.user.role == User.COUNSELOR:
            if session.counselor != request.user.counselor_profile:
                return Response(status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == User.THERAPIST:
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

from django.core.mail import send_mail
from core.models import CrisisAlert

class UserPanicButtonView(APIView):
    """
    Triggered by a user when they press the Panic Button.
    Creates a CrisisAlert and flags the active session if one exists.
    Sends an immediate alert to the system admins.
    """
    permission_classes = [IsAuthenticated, IsGeneralUser]

    @extend_schema(responses={200: {'example': {'message': 'Admin has been alerted and help is on the way.'}}})
    def post(self, request):
        user = request.user
        
        # Check if user has an active or pending session
        active_session = Session.objects.filter(
            user=user, 
            status__in=[Session.ACTIVE, Session.MATCHED, Session.WAITING]
        ).first()

        if active_session:
            active_session.is_crisis_flagged = True
            active_session.save(update_fields=['is_crisis_flagged'])
            
            CrisisAlert.objects.create(
                session=active_session,
                message_content=f"User {user.email} pressed the PANIC button.",
                matched_keyword="PANIC_BUTTON",
                is_resolved=False
            )
            
        # Send email to Admin
        subject = f"CRITICAL: Panic Button Triggered by {user.email}"
        message = f"User {user.first_name} {user.last_name} ({user.email}) has pressed the panic button.\n"
        if active_session:
            message += f"They are in Session {active_session.id}."
        else:
            message += "They do not currently have an active session."
            
        send_mail(
            subject=subject,
            message=message,
            from_email='noreply@seeker.app',
            recipient_list=['admin@seeker.app'],
            fail_silently=True,
        )

        return Response(
            {'message': 'Admin has been alerted and help is on the way.'}, 
            status=status.HTTP_200_OK
        )

from rest_framework.permissions import IsAdminUser

class AdminTerminateSessionView(APIView):
    """
    Allows an admin to forcefully terminate an active session and suspend the user's account.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    @extend_schema(responses={200: {'example': {'message': 'Session terminated and user suspended.'}}})
    def post(self, request, session_id):
        session = get_object_or_404(Session, id=session_id)
        
        if session.status == Session.ENDED:
            return Response({'message': 'Session is already ended.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Terminate session
        session.status = Session.ENDED
        session.end_time = timezone.now()
        
        if session.start_time:
            delta = session.end_time - session.start_time
            session.duration_minutes = int(delta.total_seconds() // 60)
            
        session.save(update_fields=['status', 'end_time', 'duration_minutes'])
        
        # Suspend user
        user = session.user
        if user:
            user.is_active = False
            user.save(update_fields=['is_active'])
            
            # Invalidate tokens using DeviceTokenService
            from accounts.token_service import DeviceTokenService
            DeviceTokenService.invalidate_all_user_tokens(user.id)
            
        # Trigger Celery tasks
        from .tasks import calculate_earnings
        calculate_earnings.delay(session.id)
        
        return Response({'message': f'Session {session.id} terminated and user suspended.'}, status=status.HTTP_200_OK)


from accounts.models import LicensedTherapist
from .serializers import SessionSerializer

class RequestBudgetSessionView(APIView):
    """
    POST /api/sessions/request-therapist/
    Allows a user to send a direct session request to a Licensed Therapist based on budget selection.
    """
    permission_classes = [IsAuthenticated, IsGeneralUser]
    
    @extend_schema(request=OpenApiTypes.OBJECT, responses={201: SessionSerializer})
    def post(self, request):
        therapist_id = request.data.get('therapist_id')
        if not therapist_id:
            return Response({'error': 'therapist_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        therapist = get_object_or_404(LicensedTherapist, id=therapist_id)
        
        # Create a session in WAITING status explicitly assigned to this therapist
        session = Session.objects.create(
            user=request.user,
            therapist=therapist,
            status=Session.WAITING
        )
        
        # Notify therapist
        from notifications.tasks import send_session_request_notification
        send_session_request_notification.delay(
            therapist_user_id=therapist.user.id,
            patient_name=request.user.first_name or request.user.email,
            session_id=session.id
        )
        
        serializer = SessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

from .serializers import TherapistListSerializer

class TherapistListView(APIView):
    """
    GET /api/core/therapists/
    Returns a list of all verified licensed therapists.
    Optionally filter by max_rate (e.g. ?max_rate=150)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        therapists = LicensedTherapist.objects.filter(is_verified=True)
        
        max_rate = request.query_params.get('max_rate')
        if max_rate:
            try:
                therapists = therapists.filter(per_session_rate__lte=float(max_rate))
            except ValueError:
                pass
                
        serializer = TherapistListSerializer(therapists, many=True)
        return Response(serializer.data)


class EscalateCreateView(APIView):
    """
    POST /api/core/escalate/
    Counselor triggers escalation to a therapist.
    """
    permission_classes = [IsAuthenticated, IsGraduateCounselor]
    
    def post(self, request):
        from .models import EscalationRequest, Session
        from accounts.models import LicensedTherapist
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        from .serializers import EscalationRequestSerializer

        therapist_id = request.data.get('therapist_id')
        session_id = request.data.get('session_id')
        urgency = request.data.get('urgency', EscalationRequest.MEDIUM)
        reason = request.data.get('reason', '')
        
        session = get_object_or_404(Session, id=session_id)
        if session.counselor != request.user.counselor_profile:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        therapist = get_object_or_404(LicensedTherapist, id=therapist_id)
        
        escalation = EscalationRequest.objects.create(
            counselor=request.user.counselor_profile,
            therapist=therapist,
            session=session,
            urgency=urgency,
            reason=reason,
            status=EscalationRequest.PENDING
        )
        
        channel_layer = get_channel_layer()
        room_group_name = f'escalations_therapist_{therapist.id}'
        
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'escalation.alert',
                'escalation_id': escalation.id,
                'urgency': urgency,
                'reason': reason,
                'triage_session_id': session.id
            }
        )
        
        # Trigger Push Notification
        from notifications.tasks import send_escalation_alert
        send_escalation_alert.delay(therapist.user.id, urgency, session.id)
        
        serializer = EscalationRequestSerializer(escalation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class EscalationRespondView(APIView):
    """
    POST /api/core/escalations/<id>/respond/
    Therapist responds to escalation request.
    """
    permission_classes = [IsAuthenticated, IsLicensedTherapist]
    
    def post(self, request, escalation_id):
        from .models import EscalationRequest
        
        escalation = get_object_or_404(EscalationRequest, id=escalation_id)
        if escalation.therapist != request.user.therapist_profile:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        action = request.data.get('action') # ACCEPT or DECLINE
        
        if action == 'ACCEPT':
            escalation.status = EscalationRequest.ACCEPTED
            escalation.save(update_fields=['status'])
            
            session = escalation.session
            session.therapist = request.user.therapist_profile
            session.save(update_fields=['therapist'])
            
            return Response({'message': 'Escalation accepted, joined session.', 'session_id': session.id})
            
        elif action == 'DECLINE':
            escalation.status = EscalationRequest.DECLINED
            escalation.save(update_fields=['status'])
            return Response({'message': 'Escalation declined.'})
            
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

class TherapistFollowUpView(APIView):
    """
    POST /api/core/follow-up/
    Therapist initiates chat with past client.
    """
    permission_classes = [IsAuthenticated, IsLicensedTherapist]
    
    def post(self, request):
        from accounts.models import User
        from .models import Session
        from .serializers import SessionSerializer
        
        user_id = request.data.get('user_id')
        user = get_object_or_404(User, id=user_id)
        
        therapist = request.user.therapist_profile
        
        # Verify therapist has had past bookings with this user
        from profiles.models import Booking
        past_bookings = Booking.objects.filter(user=user, therapist=therapist).exists()
        
        if not past_bookings:
            return Response({'error': 'Cannot initiate chat with a user you have not had a session with.'}, status=status.HTTP_403_FORBIDDEN)
            
        # Create a new active session
        session = Session.objects.create(
            user=user,
            therapist=therapist,
            status=Session.ACTIVE
        )
        
        serializer = SessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class SessionDetailView(APIView):
    """
    GET /api/core/sessions/<id>/
    Fetches details of a specific session, including if it has an escalation.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        from .models import Session
        from django.shortcuts import get_object_or_404
        
        session = get_object_or_404(Session, id=session_id)
        
        from .serializers import SessionSerializer
        data = SessionSerializer(session).data
        data['has_escalation'] = session.escalations.exists()
        return Response(data, status=status.HTTP_200_OK)

class SessionIntakeView(APIView):
    """
    GET /api/core/sessions/<id>/intake/
    Fetches the intake form responses for a given session's user.
    """
    permission_classes = [IsAuthenticated, IsLicensedTherapist]

    def get(self, request, session_id):
        from .models import Session
        from profiles.models import IntakeResponse
        
        try:
            session = Session.objects.get(id=session_id)
        except Session.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
            
        if getattr(session, 'therapist', None) != getattr(request.user, 'licensedtherapist', None) and session.therapist != getattr(request.user, 'therapist_profile', None):
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        # Get latest intake for this user
        intake = IntakeResponse.objects.filter(user=session.user).order_by('-submitted_at').first()
        
        if not intake:
            return Response({'error': 'No intake found'}, status=status.HTTP_404_NOT_FOUND)
            
        return Response({
            'session_id': session.id,
            'responses_json': intake.responses_json,
            'submitted_at': intake.submitted_at
        }, status=status.HTTP_200_OK)

from .models import SeekerBillingRecord
from .serializers import SeekerBillingRecordSerializer

class SeekerBillingRecordListView(APIView):
    """
    List billing records for the authenticated seeker.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: SeekerBillingRecordSerializer(many=True)})
    def get(self, request):
        records = SeekerBillingRecord.objects.filter(user=request.user).order_by('-date')
        serializer = SeekerBillingRecordSerializer(records, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)



from rest_framework import viewsets
from .models import TherapistAvailability, ClientTherapistRelationship, EarningsRecord, PayoutRecord
from .serializers import TherapistAvailabilitySerializer, ClientTherapistRelationshipSerializer, EarningsRecordSerializer, PayoutRecordSerializer

class TherapistAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = TherapistAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TherapistAvailability.objects.filter(therapist__user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(therapist=self.request.user.therapist_profile)

class ClientTherapistRelationshipViewSet(viewsets.ModelViewSet):
    serializer_class = ClientTherapistRelationshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ClientTherapistRelationship.objects.filter(therapist__user=self.request.user)

class TherapistEarningsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EarningsRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EarningsRecord.objects.filter(therapist__user=self.request.user)

class TherapistPayoutViewSet(viewsets.ModelViewSet):
    serializer_class = PayoutRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PayoutRecord.objects.filter(therapist__user=self.request.user)
        
    def perform_create(self, serializer):
        # Auto-accept payouts per user requirements
        serializer.save(therapist=self.request.user.therapist_profile, status='PAID')
