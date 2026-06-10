from django.urls import path
from .views import FeedbackView

urlpatterns = [
    path('sessions/<int:session_id>/feedback/', FeedbackView.as_view(), name='session-feedback'),
]
