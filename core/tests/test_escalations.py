import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from accounts.models import User, GraduateCounselor, LicensedTherapist
from core.models import Session, EscalationRequest
from profiles.models import Booking

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user():
    return User.objects.create_user(username="user1", email="user@test.com", password="pwd", role=User.GENERAL_USER)

@pytest.fixture
def counselor_user():
    user = User.objects.create_user(username="counselor1", email="counselor@test.com", password="pwd", role=User.COUNSELOR)
    GraduateCounselor.objects.create(user=user, is_verified=True)
    return user

@pytest.fixture
def therapist_user():
    user = User.objects.create_user(username="therapist1", email="therapist@test.com", password="pwd", role=User.THERAPIST)
    LicensedTherapist.objects.create(user=user, is_verified=True)
    return user

@pytest.mark.django_db
def test_create_escalation_request(api_client, user, counselor_user, therapist_user):
    api_client.force_authenticate(user=counselor_user)
    session = Session.objects.create(user=user, counselor=counselor_user.counselor_profile, status=Session.ACTIVE)
    
    url = reverse('escalate-create')
    data = {
        'session_id': session.id,
        'therapist_id': therapist_user.therapist_profile.id,
        'urgency': 'HIGH',
        'reason': 'Crisis situation'
    }
    
    response = api_client.post(url, data)
    assert response.status_code == 201
    
    escalation = EscalationRequest.objects.get(id=response.data['id'])
    assert escalation.urgency == 'HIGH'
    assert escalation.status == 'PENDING'
    assert escalation.therapist == therapist_user.therapist_profile

@pytest.mark.django_db
def test_respond_escalation_request(api_client, user, counselor_user, therapist_user):
    api_client.force_authenticate(user=therapist_user)
    session = Session.objects.create(user=user, counselor=counselor_user.counselor_profile, status=Session.ACTIVE)
    
    escalation = EscalationRequest.objects.create(
        counselor=counselor_user.counselor_profile,
        therapist=therapist_user.therapist_profile,
        session=session,
        urgency='MEDIUM',
        reason='Need support',
        status=EscalationRequest.PENDING
    )
    
    url = reverse('escalation-respond', kwargs={'escalation_id': escalation.id})
    data = {'action': 'ACCEPT'}
    
    response = api_client.post(url, data)
    assert response.status_code == 200
    
    escalation.refresh_from_db()
    assert escalation.status == 'ACCEPTED'
    
    session.refresh_from_db()
    assert session.therapist == therapist_user.therapist_profile

@pytest.mark.django_db
def test_therapist_follow_up(api_client, user, therapist_user):
    api_client.force_authenticate(user=therapist_user)
    
    # Follow up without prior booking should fail
    url = reverse('therapist-follow-up')
    data = {'user_id': user.id}
    
    response = api_client.post(url, data)
    assert response.status_code == 403
    
    # Create a prior booking
    import datetime
    from django.utils import timezone
    Booking.objects.create(
        user=user,
        therapist=therapist_user.therapist_profile,
        scheduled_datetime=timezone.now() - datetime.timedelta(days=1),
        status=Booking.COMPLETED
    )
    
    # Follow up should succeed now
    response = api_client.post(url, data)
    assert response.status_code == 201
    assert response.data['status'] == 'ACTIVE'
    assert response.data['therapist'] == therapist_user.therapist_profile.id
