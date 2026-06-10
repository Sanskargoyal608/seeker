import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, GraduateCounselor, LicensedTherapist
from core.models import Session, SessionNote, ChatMessage

@pytest.fixture
def notes_setup(db):
    user = User.objects.create(email="user@test.com", username="testuser", role=User.GENERAL_USER)
    counselor_user = User.objects.create(email="counselor@test.com", username="counselor", role=User.COUNSELOR)
    therapist_user = User.objects.create(email="therapist@test.com", username="therapist", role=User.THERAPIST)
    other_counselor_user = User.objects.create(email="othercounselor@test.com", username="othercounselor", role=User.COUNSELOR)
    
    counselor = GraduateCounselor.objects.create(user=counselor_user, is_verified=True)
    therapist = LicensedTherapist.objects.create(user=therapist_user, is_verified=True)
    other_counselor = GraduateCounselor.objects.create(user=other_counselor_user, is_verified=True)
    
    session = Session.objects.create(user=user, counselor=counselor, therapist=therapist, status=Session.ACTIVE)
    other_session = Session.objects.create(user=user, counselor=other_counselor, status=Session.ACTIVE)
    
    note = SessionNote.objects.create(session=session, author=counselor_user, note_text="Test note")
    message = ChatMessage.objects.create(session=session, sender=user, message_text="I feel sad")
    
    client = APIClient()
    
    return client, user, counselor_user, therapist_user, other_counselor_user, session, other_session, note, message

@pytest.mark.django_db
class TestNotesPrivacy:
    
    def test_general_user_cannot_access_notes(self, notes_setup):
        client, user, _, _, _, session, _, _, _ = notes_setup
        client.force_authenticate(user=user)
        
        # Test GET
        url = reverse('session-notes-list', kwargs={'session_id': session.id})
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Test POST
        response = client.post(url, {'note_text': 'I should not be able to write this'})
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
    def test_counselor_can_access_own_session_notes(self, notes_setup):
        client, _, counselor_user, _, _, session, _, note, _ = notes_setup
        client.force_authenticate(user=counselor_user)
        
        url = reverse('session-notes-list', kwargs={'session_id': session.id})
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['note_text'] == "Test note"
        
    def test_counselor_cannot_access_other_session_notes(self, notes_setup):
        client, _, _, _, other_counselor_user, session, _, _, _ = notes_setup
        client.force_authenticate(user=other_counselor_user)
        
        url = reverse('session-notes-list', kwargs={'session_id': session.id})
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_counselor_post_note(self, notes_setup):
        client, _, counselor_user, _, _, session, _, _, _ = notes_setup
        client.force_authenticate(user=counselor_user)
        
        url = reverse('session-notes-list', kwargs={'session_id': session.id})
        response = client.post(url, {'note_text': 'Counselor Note'})
        assert response.status_code == status.HTTP_201_CREATED

    def test_therapist_access_session_notes(self, notes_setup):
        client, _, _, therapist_user, _, session, _, note, _ = notes_setup
        client.force_authenticate(user=therapist_user)
        
        url = reverse('session-notes-list', kwargs={'session_id': session.id})
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK

        response = client.post(url, {'note_text': 'Therapist Note'})
        assert response.status_code == status.HTTP_201_CREATED

    def test_delete_note(self, notes_setup):
        client, _, counselor_user, _, _, session, _, note, _ = notes_setup
        client.force_authenticate(user=counselor_user)
        url = reverse('session-note-detail', kwargs={'session_id': session.id, 'note_id': note.id})
        response = client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_message_highlighting_creates_note(self, notes_setup):
        client, _, counselor_user, _, _, session, _, _, message = notes_setup
        client.force_authenticate(user=counselor_user)
        
        url = reverse('message-highlight', kwargs={'message_id': message.id})
        response = client.patch(url, {'note': 'Important point'})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_highlighted'] is True
        
        # Verify note was created
        note = SessionNote.objects.filter(linked_message=message).first()
        assert note is not None
        assert note.note_text == 'Important point'
        assert note.author == counselor_user

    def test_message_unhighlighting_deletes_note(self, notes_setup):
        client, _, counselor_user, _, _, session, _, _, message = notes_setup
        client.force_authenticate(user=counselor_user)
        
        # First highlight
        url = reverse('message-highlight', kwargs={'message_id': message.id})
        client.patch(url, {'note': 'Important point'})
        
        # Unhighlight
        response = client.patch(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_highlighted'] is False
        
        # Verify note was deleted
        note = SessionNote.objects.filter(linked_message=message).first()
        assert note is None
