import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, GraduateCounselor
from core.models import Session, CounselorAvailability
from core.services.matching_service import MatchingService, SessionAlreadyAcceptedException

@pytest.fixture
def matching_setup(db):
    user = User.objects.create(email="user@test.com", username="testuser")
    counselor_user = User.objects.create(email="counselor@test.com", username="counselor", role=User.COUNSELOR)
    counselor_user2 = User.objects.create(email="counselor2@test.com", username="counselor2", role=User.COUNSELOR)
    
    counselor = GraduateCounselor.objects.create(user=counselor_user, is_verified=True)
    counselor2 = GraduateCounselor.objects.create(user=counselor_user2, is_verified=True)
    
    CounselorAvailability.objects.create(counselor=counselor, status=CounselorAvailability.AVAILABLE)
    CounselorAvailability.objects.create(counselor=counselor2, status=CounselorAvailability.AVAILABLE)
    
    session1 = Session.objects.create(user=user, status=Session.WAITING)
    session2 = Session.objects.create(user=user, status=Session.WAITING)
    
    client = APIClient()
    client.force_authenticate(user=counselor_user)
    
    return client, counselor, counselor2, session1, session2

@pytest.mark.django_db
class TestMatching:
    def test_queue_view(self, matching_setup):
        client, _, _, session1, session2 = matching_setup
        
        url = reverse('session-queue')
        response = client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        assert response.data[0]['id'] == session1.id

    def test_accept_session_success(self, matching_setup):
        client, counselor, _, session1, _ = matching_setup
        
        url = reverse('accept-session', kwargs={'session_id': session1.id})
        response = client.patch(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        session1.refresh_from_db()
        assert session1.status == Session.MATCHED
        assert session1.counselor == counselor

    def test_accept_session_already_accepted(self, matching_setup):
        client, counselor, counselor2, session1, _ = matching_setup
        
        # First counselor accepts
        MatchingService.accept_session(counselor2, session1.id)
        
        # Second counselor tries to accept via API
        url = reverse('accept-session', kwargs={'session_id': session1.id})
        response = client.patch(url)
        
        assert response.status_code == status.HTTP_409_CONFLICT
        assert "message" in response.data
        assert "already some one else accepted it" in response.data['message'].lower()
        
    def test_accept_invalid_session(self, matching_setup):
        client, _, _, _, _ = matching_setup
        
        url = reverse('accept-session', kwargs={'session_id': 9999})
        response = client.patch(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
