from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from accounts.models import LicensedTherapist
from accounts.permissions import IsGraduateCounselor, IsGeneralUser

class TherapistSearchView(APIView):
    """
    GET /api/profiles/therapists/search/
    Allows searching and filtering Licensed Therapists via Typesense.
    Filters: language, modality, q, page
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(name='language', description='Filter by language', required=False, type=OpenApiTypes.STR),
            OpenApiParameter(name='modality', description='Filter by therapy modality', required=False, type=OpenApiTypes.STR),
        ],
        responses={200: {'example': {'therapists': []}}}
    )
    def get(self, request):
        query = request.query_params.get('q', '*')
        language = request.query_params.get('language')
        modality = request.query_params.get('modality')
        max_price = request.query_params.get('max_price')
        page = int(request.query_params.get('page', 1))
        
        # Build typesense filters
        filters = []
        if language:
            filters.append(f'languages:=`{language}`')
        if modality:
            filters.append(f'modalities:=`{modality}`')
        if max_price:
            filters.append(f'per_session_rate:<={max_price}')
            
        filter_str = ' && '.join(filters) if filters else None

        from .services.typesense_service import TypesenseService
        service = TypesenseService()
        
        results = service.search_therapists(
            query=query, 
            filters=filter_str, 
            page=page
        )

        return Response(results, status=status.HTTP_200_OK)


class BudgetCounselorSearchView(APIView):
    """
    GET /api/profiles/counselors/search/
    Allows a General User to search for Licensed Therapists based on their budget constraint.
    """
    permission_classes = [IsAuthenticated, IsGeneralUser]

    @extend_schema(
        parameters=[
            OpenApiParameter(name='max_budget', description='Maximum budget per session', required=False, type=OpenApiTypes.NUMBER),
        ],
        responses={200: {'example': {'therapists': []}}}
    )
    def get(self, request):
        max_budget = request.query_params.get('max_budget')
        
        therapists = LicensedTherapist.objects.filter(is_verified=True, user__is_active=True)
        
        if max_budget is not None:
            try:
                max_budget = float(max_budget)
                therapists = therapists.filter(per_session_rate__lte=max_budget)
            except ValueError:
                return Response({'error': 'Invalid max_budget parameter'}, status=status.HTTP_400_BAD_REQUEST)
                
        # Order by lowest price first
        therapists = therapists.order_by('per_session_rate')

        data = []
        for t in therapists:
            data.append({
                'id': t.id,
                'user_id': t.user.id,
                'name': f"{t.user.first_name} {t.user.last_name}",
                'languages': t.languages,
                'modalities': t.modalities,
                'per_session_rate': float(t.per_session_rate)
            })

        return Response({'therapists': data}, status=status.HTTP_200_OK)


from rest_framework.permissions import AllowAny

class PublicTherapistProfileView(APIView):
    """
    GET /api/profiles/public/therapist/<slug>/
    Publicly accessible endpoint for Next.js to fetch therapist profiles.
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        responses={200: {'example': {'id': 1, 'name': 'John Doe', 'bio': '...'}}}
    )
    def get(self, request, slug):
        try:
            therapist = LicensedTherapist.objects.get(slug=slug, is_verified=True, user__is_active=True)
            data = {
                'id': therapist.id,
                'name': f"{therapist.user.first_name} {therapist.user.last_name}",
                'bio': therapist.bio,
                'per_session_rate': float(therapist.per_session_rate),
                'languages': therapist.languages,
                'modalities': therapist.modalities,
                'profile_photo': therapist.profile_photo,
            }
            return Response(data, status=status.HTTP_200_OK)
        except LicensedTherapist.DoesNotExist:
            return Response({'error': 'Therapist not found'}, status=status.HTTP_404_NOT_FOUND)

class PublicCounselorProfileView(APIView):
    """
    GET /api/profiles/public/counselor/<slug>/
    Publicly accessible endpoint for Next.js to fetch counselor profiles.
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        responses={200: {'example': {'id': 1, 'name': 'Jane Doe', 'bio': '...'}}}
    )
    def get(self, request, slug):
        try:
            counselor = GraduateCounselor.objects.get(slug=slug, is_verified=True, user__is_active=True)
            data = {
                'id': counselor.id,
                'name': f"{counselor.user.first_name} {counselor.user.last_name}",
                'bio': counselor.bio,
                'specialization': counselor.specialization,
                'years_experience': counselor.years_experience,
                'profile_photo': counselor.profile_photo,
            }
            return Response(data, status=status.HTTP_200_OK)
        except GraduateCounselor.DoesNotExist:
            return Response({'error': 'Counselor not found'}, status=status.HTTP_404_NOT_FOUND)

from rest_framework.generics import ListCreateAPIView, RetrieveDestroyAPIView, CreateAPIView
from .models import AvailabilitySlot, BlockedDate, Booking
from .serializers import AvailabilitySlotSerializer, BlockedDateSerializer, BookingCreateSerializer
from rest_framework.exceptions import PermissionDenied
import datetime
from django.utils import timezone
from django.db.models import Q

def get_provider_kwargs(user):
    if getattr(user, 'role', None) == 'COUNSELOR':
        return {'counselor': getattr(user, 'counselor_profile', None)}
    elif getattr(user, 'role', None) == 'THERAPIST':
        return {'therapist': getattr(user, 'therapist_profile', None)}
    raise PermissionDenied("User is not a valid provider.")

class AvailabilitySlotListCreateView(ListCreateAPIView):
    serializer_class = AvailabilitySlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(**get_provider_kwargs(self.request.user))

    def perform_create(self, serializer):
        serializer.save(**get_provider_kwargs(self.request.user))

class AvailabilitySlotDetailView(RetrieveDestroyAPIView):
    serializer_class = AvailabilitySlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(**get_provider_kwargs(self.request.user))

class BlockedDateListCreateView(ListCreateAPIView):
    serializer_class = BlockedDateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BlockedDate.objects.filter(**get_provider_kwargs(self.request.user))

    def perform_create(self, serializer):
        serializer.save(**get_provider_kwargs(self.request.user))

class BlockedDateDetailView(RetrieveDestroyAPIView):
    serializer_class = BlockedDateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BlockedDate.objects.filter(**get_provider_kwargs(self.request.user))

class AvailableSlotsView(APIView):
    """
    GET /api/profiles/therapists/<id>/slots/?days=30
    Calculates and returns actual bookable dates and times for a therapist.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter(name='days', description='Number of days ahead to search', required=False, type=OpenApiTypes.INT),
        ],
        responses={200: {'example': {'available_slots': [{'date': '2026-06-30', 'slots': [{'id': 1, 'start_time': '09:00', 'end_time': '10:00'}]}]}}}
    )
    def get(self, request, therapist_id):
        try:
            therapist = LicensedTherapist.objects.get(id=therapist_id, is_verified=True, user__is_active=True)
        except LicensedTherapist.DoesNotExist:
            return Response({'error': 'Therapist not found'}, status=status.HTTP_404_NOT_FOUND)

        days_ahead = int(request.query_params.get('days', 30))
        start_date = timezone.now().date()
        end_date = start_date + datetime.timedelta(days=days_ahead)

        # Get blocked dates
        blocked_dates = set(BlockedDate.objects.filter(
            therapist=therapist, date__range=(start_date, end_date)
        ).values_list('date', flat=True))

        # Get availability templates
        availability_slots = AvailabilitySlot.objects.filter(therapist=therapist, is_active=True)
        slots_by_day = {i: [] for i in range(7)}
        for slot in availability_slots:
            slots_by_day[slot.day_of_week].append(slot)

        # Get existing bookings
        bookings = Booking.objects.filter(
            therapist=therapist,
            scheduled_datetime__date__range=(start_date, end_date),
            status=Booking.SCHEDULED
        )
        booked_times = {}
        for b in bookings:
            date_str = b.scheduled_datetime.date().isoformat()
            if date_str not in booked_times:
                booked_times[date_str] = set()
            booked_times[date_str].add(b.scheduled_datetime.time().strftime('%H:%M:%S'))

        # Calculate actual availability
        result = []
        for i in range(days_ahead):
            current_date = start_date + datetime.timedelta(days=i)
            if current_date in blocked_dates:
                continue

            day_of_week = current_date.weekday()
            daily_slots = slots_by_day[day_of_week]
            
            if not daily_slots:
                continue

            date_str = current_date.isoformat()
            available_times = []

            for slot in daily_slots:
                start_time_str = slot.start_time.strftime('%H:%M:%S')
                if date_str in booked_times and start_time_str in booked_times[date_str]:
                    continue
                # Also skip past slots for today
                if current_date == timezone.now().date() and slot.start_time <= timezone.now().time():
                    continue

                available_times.append({
                    'id': slot.id,
                    'start_time': slot.start_time.strftime('%H:%M'),
                    'end_time': slot.end_time.strftime('%H:%M')
                })

            if available_times:
                result.append({
                    'date': date_str,
                    'slots': available_times
                })

        return Response({'available_slots': result}, status=status.HTTP_200_OK)


class BookingCreateView(CreateAPIView):
    """
    POST /api/profiles/bookings/
    Creates a Booking and IntakeResponse
    """
    serializer_class = BookingCreateSerializer
    permission_classes = [IsAuthenticated, IsGeneralUser]

class StartBookingSessionView(APIView):
    """
    POST /api/profiles/bookings/<id>/start/
    Converts a scheduled Booking into an active Session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(id=pk)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.user != booking.user and (not hasattr(request.user, 'licensedtherapist') or request.user.licensedtherapist != booking.therapist):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        if booking.status != Booking.SCHEDULED:
            return Response({'error': 'Booking is not scheduled'}, status=status.HTTP_400_BAD_REQUEST)

        # Create Session
        from core.models import Session, SessionTimer
        session = Session.objects.create(
            user=booking.user,
            therapist=booking.therapist,
            status=Session.ACTIVE,
            duration_minutes=booking.duration_minutes
        )

        # Update Booking Status
        booking.status = Booking.COMPLETED
        booking.save()

        # Set Timer
        SessionTimer.objects.create(
            session=session,
            end_time=timezone.now() + datetime.timedelta(minutes=booking.duration_minutes)
        )

        return Response({'session_id': session.id, 'status': session.status}, status=status.HTTP_200_OK)
