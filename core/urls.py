from django.urls import path
from . import views

urlpatterns = [
    # Permission boundary enforcement examples
    path('counselor/queue/', views.CounselorQueueView.as_view(), name='counselor-queue'),
    path('therapist/queue/', views.TherapistQueueView.as_view(), name='therapist-queue'),
    path('user/dashboard/', views.GeneralUserDashboardView.as_view(), name='user-dashboard'),
]
