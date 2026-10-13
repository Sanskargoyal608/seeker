from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from core.models import MoodEntry, MentorshipRequest, CounselorAvailability
from accounts.models import LicensedTherapist, GraduateCounselor

User = get_user_model()

class NewFeaturesTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            username='user',
            email='test@example.com',
            password='testpassword',
            first_name='Test',
            last_name='User'
        )
        self.counselor_user = User.objects.create_user(
            username='counselor',
            email='counselor@example.com',
            password='testpassword',
            first_name='Test',
            last_name='Counselor',
            role='COUNSELOR'
        )
        self.therapist_user = User.objects.create_user(
            username='therapist',
            email='therapist@example.com',
            password='testpassword',
            first_name='Test',
            last_name='Therapist',
            role='THERAPIST'
        )
        
        self.counselor_profile = GraduateCounselor.objects.create(
            user=self.counselor_user,
            is_verified=True
        )
        self.therapist_profile = LicensedTherapist.objects.create(
            user=self.therapist_user,
            is_verified=True
        )

    def test_mood_entry(self):
        self.client.force_authenticate(user=self.user)
        
        # Test POST
        response = self.client.post('/api/core/mood/', {
            'mood': 'good',
            'note': 'Feeling good today'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MoodEntry.objects.count(), 1)
        
        # Test GET
        response = self.client.get('/api/core/mood/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['mood'], 'good')

    def test_counselor_availability(self):
        self.client.force_authenticate(user=self.counselor_user)
        
        # Test PATCH
        response = self.client.patch('/api/core/counselor/availability/', {
            'status': 'AWAY'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'AWAY')
        
        # Test GET
        response = self.client.get('/api/core/counselor/availability/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'AWAY')

    def test_mentorship_request(self):
        self.client.force_authenticate(user=self.counselor_user)
        
        # Create mentorship request
        response = self.client.post('/api/core/mentorship/', {
            'therapist_id': self.therapist_profile.id,
            'sop_message': 'I would like to be mentored.'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MentorshipRequest.objects.count(), 1)
        
        req_id = response.data['id']
        
        # Accept mentorship request as therapist
        self.client.force_authenticate(user=self.therapist_user)
        response = self.client.post(f'/api/core/mentorship/{req_id}/respond/', {
            'action': 'ACCEPT'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify status
        req = MentorshipRequest.objects.get(id=req_id)
        self.assertEqual(req.status, 'ACCEPTED')
        
        # Send chat message
        response = self.client.post(f'/api/core/mentorship/{req_id}/chat/', {
            'text': 'Hello mentor!'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Get chat messages
        response = self.client.get(f'/api/core/mentorship/{req_id}/chat/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['text'], 'Hello mentor!')
