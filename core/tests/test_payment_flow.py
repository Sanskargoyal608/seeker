import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from core.models import Session, SessionTimer, ChatMessage

@pytest.fixture
def payment_setup(db):
    user = User.objects.create(email="user@test.com", username="testuser")
    session = Session.objects.create(user=user, status=Session.PAYMENT_PENDING)
    
    # Create some held messages
    ChatMessage.objects.create(session=session, sender=user, message_text="Hello", is_held_for_payment=True)
    ChatMessage.objects.create(session=session, sender=user, message_text="Are you there?", is_held_for_payment=True)
    
    client = APIClient()
    client.force_authenticate(user=user)
    
    return client, session

@pytest.mark.django_db
class TestPaymentFlow:
    def test_verify_payment_success(self, payment_setup):
        client, session = payment_setup
        
        url = reverse('verify-payment', kwargs={'session_id': session.id})
        response = client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Check session status
        session.refresh_from_db()
        assert session.status == Session.PAID
        
        # Check timer status
        timer = SessionTimer.objects.get(session=session)
        assert timer.is_paid is True
        
        # Check messages released
        held_messages = ChatMessage.objects.filter(session=session, is_held_for_payment=True)
        assert held_messages.count() == 0
        
        released_messages = ChatMessage.objects.filter(session=session, is_held_for_payment=False)
        assert released_messages.count() == 2

    def test_verify_payment_not_found(self, payment_setup):
        client, _ = payment_setup
        
        url = reverse('verify-payment', kwargs={'session_id': 9999})
        response = client.post(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
