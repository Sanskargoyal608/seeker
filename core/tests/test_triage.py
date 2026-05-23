import pytest
import json
from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from core.models import TriageSession, TriageMessage, Session, SessionNote

@pytest.fixture
def auth_client(django_user_model):
    user = django_user_model.objects.create(username="testuser")
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user

@pytest.mark.django_db
@patch('core.services.triage_service.TriageService._call_gemini')
class TestTriageFlow:

    def test_start_triage(self, mock_gemini, auth_client):
        client, user = auth_client
        
        # Mock Gemini response
        mock_gemini.return_value = json.dumps({
            "message_to_user": "Hello, how can I help you?",
            "form_state": {},
            "is_complete": False,
            "routing_decision": None
        })

        url = reverse('triage-start')
        response = client.post(url)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data['is_complete'] is False
        assert len(data['messages']) == 2 # 1 user initial, 1 ai
        assert data['messages'][1]['content'] == "Hello, how can I help you?"
        
        # Verify DB
        assert TriageSession.objects.filter(user=user).count() == 1

    def test_process_response_incomplete(self, mock_gemini, auth_client):
        client, user = auth_client
        triage_session = TriageSession.objects.create(user=user)
        
        # Mock Gemini response
        mock_gemini.return_value = json.dumps({
            "message_to_user": "I see. And what kind of support are you looking for?",
            "form_state": {
                "emotional_state": "anxious",
                "primary_concern": "work stress"
            },
            "is_complete": False,
            "routing_decision": None
        })

        url = reverse('triage-respond')
        response = client.post(url, data={
            "triage_session_id": triage_session.id,
            "response": "I'm stressed from work"
        }, content_type='application/json')
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data['emotional_state'] == "anxious"
        assert data['primary_concern'] == "work stress"
        assert data['is_complete'] is False
        assert len(data['messages']) == 2
        
    def test_process_response_complete(self, mock_gemini, auth_client):
        client, user = auth_client
        triage_session = TriageSession.objects.create(
            user=user, 
            emotional_state="anxious", 
            primary_concern="work stress"
        )
        
        # Mock Gemini response for completion
        mock_gemini.return_value = json.dumps({
            "message_to_user": "I am connecting you to a listener.",
            "form_state": {
                "support_preference": "peer",
                "urgency": "medium"
            },
            "is_complete": True,
            "routing_decision": "PEER_SUPPORT"
        })

        url = reverse('triage-respond')
        response = client.post(url, data={
            "triage_session_id": triage_session.id,
            "response": "I just want to talk to someone like me."
        }, content_type='application/json')
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data['is_complete'] is True
        assert data['routing_decision'] == "PEER_SUPPORT"
        assert data['resulting_session'] is not None
        
        # Verify Session and SessionNote were created
        session = Session.objects.get(id=data['resulting_session'])
        assert session.status == Session.WAITING
        assert session.user == user
        
        note = SessionNote.objects.get(session=session)
        assert note.is_private is True
        assert "Emotional State: anxious" in note.note_text
        assert "PEER_SUPPORT" in note.note_text
