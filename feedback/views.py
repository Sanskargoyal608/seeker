from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from accounts.permissions import IsAuthenticated
from core.models import Session
from .models import SessionFeedback
from .serializers import SessionFeedbackSerializer

class FeedbackView(APIView):
    """
    POST /api/sessions/{session_id}/feedback/
    GET /api/sessions/{session_id}/feedback/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(Session, id=session_id)
        
        # Verify access
        if request.user.role == request.user.GENERAL_USER and session.user != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == request.user.COUNSELOR and session.counselor != request.user.counselor_profile:
            return Response(status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == request.user.THERAPIST and session.therapist != request.user.therapist_profile:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        try:
            feedback = SessionFeedback.objects.get(session=session)
            serializer = SessionFeedbackSerializer(feedback)
            return Response(serializer.data)
        except SessionFeedback.DoesNotExist:
            return Response({'error': 'Feedback not found.'}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, session_id):
        if request.user.role != request.user.GENERAL_USER:
            return Response({'error': 'Only general users can submit feedback.'}, status=status.HTTP_403_FORBIDDEN)
            
        session = get_object_or_404(Session, id=session_id)
        if session.user != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        if SessionFeedback.objects.filter(session=session).exists():
            return Response({'error': 'Feedback already submitted for this session.'}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = SessionFeedbackSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(session=session, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
