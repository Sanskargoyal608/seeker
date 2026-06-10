import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from core.models import Session
from feedback.models import SessionFeedback
from accounts.tests.factories import UserFactory, GraduateCounselorFactory

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
def test_submit_feedback_success(auth_client):
    user = UserFactory(role=User.GENERAL_USER)
    counselor_user = UserFactory(role=User.COUNSELOR)
    counselor = GraduateCounselorFactory(user=counselor_user)
    
    session = Session.objects.create(user=user, counselor=counselor, status=Session.ENDED)
    
    client = auth_client(user)
    url = reverse('session-feedback', kwargs={'session_id': session.id})
    
    data = {
        'q1_before_session': 'Anxious',
        'q2_after_session': 'Calmer',
        'q3_what_helped': 'Talking it out',
        'q4_what_improve': 'Nothing'
    }
    
    response = client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    
    feedback = SessionFeedback.objects.get(session=session)
    assert feedback.q1_before_session == 'Anxious'
    assert feedback.user == user

@pytest.mark.django_db
def test_submit_feedback_unauthorized_user(auth_client):
    # Setup
    user1 = UserFactory(role=User.GENERAL_USER)
    user2 = UserFactory(role=User.GENERAL_USER)
    counselor_user = UserFactory(role=User.COUNSELOR)
    counselor = GraduateCounselorFactory(user=counselor_user)
    
    session = Session.objects.create(user=user1, counselor=counselor, status=Session.ENDED)
    
    # Authenticate as user2
    client = auth_client(user2)
    url = reverse('session-feedback', kwargs={'session_id': session.id})
    
    data = {'q1_before_session': 'Test'}
    response = client.post(url, data, format='json')
    
    # Should be forbidden
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.django_db
def test_submit_feedback_counselor_blocked(auth_client):
    user = UserFactory(role=User.GENERAL_USER)
    counselor_user = UserFactory(role=User.COUNSELOR)
    counselor = GraduateCounselorFactory(user=counselor_user)
    
    session = Session.objects.create(user=user, counselor=counselor, status=Session.ENDED)
    
    client = auth_client(counselor_user)
    url = reverse('session-feedback', kwargs={'session_id': session.id})
    
    data = {'q1_before_session': 'Test'}
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.django_db
def test_submit_feedback_duplicate(auth_client):
    user = UserFactory(role=User.GENERAL_USER)
    counselor_user = UserFactory(role=User.COUNSELOR)
    counselor = GraduateCounselorFactory(user=counselor_user)
    session = Session.objects.create(user=user, counselor=counselor, status=Session.ENDED)
    
    SessionFeedback.objects.create(
        session=session, user=user, q1_before_session='Good'
    )
    
    client = auth_client(user)
    url = reverse('session-feedback', kwargs={'session_id': session.id})
    data = {'q1_before_session': 'Duplicate'}
    response = client.post(url, data, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
def test_get_feedback(auth_client):
    user = UserFactory(role=User.GENERAL_USER)
    counselor_user = UserFactory(role=User.COUNSELOR)
    counselor = GraduateCounselorFactory(user=counselor_user)
    session = Session.objects.create(user=user, counselor=counselor, status=Session.ENDED)
    
    SessionFeedback.objects.create(
        session=session, user=user, q1_before_session='Good'
    )
    
    # Authorized user
    client = auth_client(user)
    url = reverse('session-feedback', kwargs={'session_id': session.id})
    response = client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['q1_before_session'] == 'Good'
    
    # Authorized counselor
    counselor_client = auth_client(counselor_user)
    response2 = counselor_client.get(url)
    assert response2.status_code == status.HTTP_200_OK
    
    # Unauthorized general user
    user2 = UserFactory(role=User.GENERAL_USER)
    client2 = auth_client(user2)
    response3 = client2.get(url)
    assert response3.status_code == status.HTTP_403_FORBIDDEN
    
@pytest.mark.django_db
def test_get_feedback_not_found(auth_client):
    user = UserFactory(role=User.GENERAL_USER)
    counselor_user = UserFactory(role=User.COUNSELOR)
    counselor = GraduateCounselorFactory(user=counselor_user)
    session = Session.objects.create(user=user, counselor=counselor, status=Session.ENDED)
    
    client = auth_client(user)
    url = reverse('session-feedback', kwargs={'session_id': session.id})
    response = client.get(url)
    assert response.status_code == status.HTTP_404_NOT_FOUND
