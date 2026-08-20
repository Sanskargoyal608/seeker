from django.urls import path
from . import views

urlpatterns = [
    path('therapists/search/', views.TherapistSearchView.as_view(), name='therapist-search'),
    path('counselors/search/', views.BudgetCounselorSearchView.as_view(), name='budget-counselor-search'),
    
    # Public profiles
    path('public/therapist/<slug:slug>/', views.PublicTherapistProfileView.as_view(), name='public-therapist-profile'),
    path('public/counselor/<slug:slug>/', views.PublicCounselorProfileView.as_view(), name='public-counselor-profile'),
    
    # Scheduling & Availability
    path('availability/', views.AvailabilitySlotListCreateView.as_view(), name='availability-list-create'),
    path('availability/<int:pk>/', views.AvailabilitySlotDetailView.as_view(), name='availability-detail'),
    path('availability/bulk/', views.BulkAvailabilityUpdateView.as_view(), name='availability-bulk-update'),
    path('blocked-dates/', views.BlockedDateListCreateView.as_view(), name='blocked-dates-list-create'),
    path('blocked-dates/<int:pk>/', views.BlockedDateDetailView.as_view(), name='blocked-dates-detail'),
    
    # Therapist Calendar Management
    path('therapist/calendar/<str:date_str>/', views.TherapistDayScheduleView.as_view(), name='therapist-day-schedule'),
    path('therapist/calendar/<str:date_str>/toggle-block/', views.ToggleSlotBlockView.as_view(), name='therapist-toggle-block'),
    
    # Booking
    path('therapists/<int:therapist_id>/slots/', views.AvailableSlotsView.as_view(), name='available-slots'),
    path('bookings/', views.BookingCreateView.as_view(), name='booking-create'),
    path('bookings/<int:pk>/start/', views.StartBookingSessionView.as_view(), name='booking-start'),
]
