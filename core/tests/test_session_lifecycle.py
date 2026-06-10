import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from core.models import Session, EarningsRecord
from accounts.tests.factories import UserFactory, GraduateCounselorFactory
from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def auth_client(api_client):
    def _auth_client(user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        return api_client
    return _auth_client

@pytest.mark.django_db
@patch('core.views.calculate_earnings.delay')
@patch('core.views.send_feedback_prompt.apply_async')
def test_session_end_lifecycle(mock_send_feedback, mock_calc_earnings, auth_client):
    # Setup
    user = UserFactory(role=User.GENERAL_USER)
    counselor_user = UserFactory(role=User.COUNSELOR)
    counselor = GraduateCounselorFactory(user=counselor_user, per_minute_rate=2.00)
    
    start = timezone.now() - timedelta(minutes=30)
    session = Session.objects.create(
        user=user, 
        counselor=counselor, 
        status=Session.ACTIVE,
        start_time=start
    )
    
    client = auth_client(user)
    url = reverse('session-end', kwargs={'session_id': session.id})
    response = client.post(url)
    assert response.status_code == status.HTTP_200_OK
    
    session.refresh_from_db()
    assert session.status == Session.ENDED
    
    # Test ending already ended session
    response = client.post(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['message'] == 'Session already ended'

    assert session.end_time is not None
    
    # Check Celery tasks triggered
    mock_calc_earnings.assert_called_once_with(session.id)
    mock_send_feedback.assert_called_once_with(args=[session.id], countdown=300)

@pytest.mark.django_db
@patch('core.tasks.calculate_earnings.delay')
@patch('notifications.tasks.send_feedback_prompt.apply_async')
def test_session_end_unauthorized_users(mock_feedback, mock_calc_earnings, api_client):
    from accounts.tests.factories import UserFactory
    # Create users
    owner_user = UserFactory(role=User.GENERAL_USER)
    other_user = UserFactory(role=User.GENERAL_USER)
    counselor_user = UserFactory(role=User.COUNSELOR)
    other_counselor_user = UserFactory(role=User.COUNSELOR)
    therapist_user = UserFactory(role=User.THERAPIST)
    other_therapist_user = UserFactory(role=User.THERAPIST)
    
    from accounts.tests.factories import GraduateCounselorFactory, LicensedTherapistFactory
    counselor = GraduateCounselorFactory(user=counselor_user)
    other_counselor = GraduateCounselorFactory(user=other_counselor_user)
    therapist = LicensedTherapistFactory(user=therapist_user)
    other_therapist = LicensedTherapistFactory(user=other_therapist_user)
    
    session = Session.objects.create(
        user=owner_user, counselor=counselor, therapist=therapist, status=Session.ACTIVE
    )
    url = reverse('session-end', kwargs={'session_id': session.id})
    
    # Other general user
    api_client.force_authenticate(user=other_user)
    response = api_client.post(url)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    
    # Other counselor
    api_client.force_authenticate(user=other_counselor_user)
    response = api_client.post(url)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    
    # Other therapist
    api_client.force_authenticate(user=other_therapist_user)
    response = api_client.post(url)
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.django_db
def test_calculate_earnings_task():
    from core.tasks import calculate_earnings
    
    user = UserFactory(role=User.GENERAL_USER)
    counselor_user = UserFactory(role=User.COUNSELOR)
    counselor = GraduateCounselorFactory(user=counselor_user, per_minute_rate=2.00)
    
    session = Session.objects.create(
        user=user, 
        counselor=counselor, 
        status=Session.ENDED,
        duration_minutes=30
    )
    
    res = calculate_earnings(session.id)
    assert "Earnings calculated" in res
    
    earnings = EarningsRecord.objects.get(session=session)
    assert earnings.gross_amount == 60.00
    assert earnings.net_amount == 48.00  # 20% platform fee
