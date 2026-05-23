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

