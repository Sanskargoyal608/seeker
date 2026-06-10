from django.urls import path
from . import views

urlpatterns = [
    # Permission boundary enforcement examples
    path('counselor/queue/', views.CounselorQueueView.as_view(), name='counselor-queue'),
    path('therapist/queue/', views.TherapistQueueView.as_view(), name='therapist-queue'),
    path('user/dashboard/', views.GeneralUserDashboardView.as_view(), name='user-dashboard'),
    path('triage/start/', views.TriageStartView.as_view(), name='triage-start'),
    path('triage/respond/', views.TriageRespondView.as_view(), name='triage-respond'),
    path('sessions/<int:session_id>/verify-payment/', views.VerifyPaymentView.as_view(), name='verify-payment'),
    path('sessions/queue/', views.QueueView.as_view(), name='session-queue'),
    path('sessions/<int:session_id>/accept/', views.AcceptSessionView.as_view(), name='accept-session'),
    path('sessions/<int:session_id>/notes/', views.SessionNoteListView.as_view(), name='session-notes-list'),
    path('sessions/<int:session_id>/notes/<int:note_id>/', views.SessionNoteDetailView.as_view(), name='session-note-detail'),
    path('messages/<int:message_id>/highlight/', views.MessageHighlightView.as_view(), name='message-highlight'),
    path('sessions/<int:session_id>/escalate/', views.EscalateSessionView.as_view(), name='escalate-session'),
    path('sessions/<int:session_id>/end/', views.SessionEndView.as_view(), name='session-end'),
]
