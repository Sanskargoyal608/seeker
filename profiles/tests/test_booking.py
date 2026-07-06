from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from accounts.models import User, LicensedTherapist
from profiles.models import AvailabilitySlot, BlockedDate, Booking, IntakeResponse
from core.models import Session

class BookingTests(APITestCase):
    def setUp(self):
        # Create therapist user
        self.therapist_user = User.objects.create_user(
            username='therapist_test',
            email='therapist@test.com',
            password='testpassword',
            role=User.THERAPIST,
            first_name='Test',
            last_name='Therapist'
        )
        self.therapist = LicensedTherapist.objects.create(
            user=self.therapist_user,
            license_number='LIC123',
            per_session_rate=100.00,
            is_verified=True
        )

        # Create general user
        self.client_user = User.objects.create_user(
            username='client_test',
            email='client@test.com',
            password='testpassword',
            role=User.GENERAL_USER,
            first_name='Test',
            last_name='Client'
        )

        # Define dates
        self.now = timezone.now()
        # Find a future date (e.g. tomorrow)
        self.tomorrow = self.now.date() + timedelta(days=1)
        self.day_of_week = self.tomorrow.weekday() # 0-6

        # Create an availability slot for tomorrow's day of week
        self.slot = AvailabilitySlot.objects.create(
            therapist=self.therapist,
            day_of_week=self.day_of_week,
            start_time=timezone.datetime.strptime('10:00', '%H:%M').time(),
            end_time=timezone.datetime.strptime('11:00', '%H:%M').time()
        )

    def test_available_slots(self):
        self.client.force_authenticate(user=self.client_user)
        url = reverse('available-slots', kwargs={'therapist_id': self.therapist.id})
        response = self.client.get(url, {'days': 7})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        available_slots = response.data.get('available_slots', [])
        
        # Should have at least one day (tomorrow)
        found_tomorrow = False
        for day in available_slots:
            if day['date'] == self.tomorrow.isoformat():
                found_tomorrow = True
                self.assertEqual(len(day['slots']), 1)
                self.assertEqual(day['slots'][0]['start_time'], '10:00')
        self.assertTrue(found_tomorrow, "Tomorrow should be listed as available")

    def test_available_slots_blocked_date(self):
        # Block tomorrow
        BlockedDate.objects.create(therapist=self.therapist, date=self.tomorrow, reason="Vacation")

        self.client.force_authenticate(user=self.client_user)
        url = reverse('available-slots', kwargs={'therapist_id': self.therapist.id})
        response = self.client.get(url, {'days': 7})
        
        available_slots = response.data.get('available_slots', [])
        for day in available_slots:
            self.assertNotEqual(day['date'], self.tomorrow.isoformat(), "Blocked date should not be available")

    def test_create_booking(self):
        self.client.force_authenticate(user=self.client_user)
        url = reverse('booking-create')
        
        datetime_str = f"{self.tomorrow.isoformat()}T10:00:00"
        
        payload = {
            'therapist': self.therapist.id,
            'scheduled_datetime': datetime_str,
            'duration_minutes': 60,
            'intake_data': {
                'reason': 'Feeling anxious'
            }
        }
        
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check if booking is created
        booking = Booking.objects.get(id=response.data['id'])
        self.assertEqual(booking.status, Booking.SCHEDULED)
        
        # Check intake
        intake = IntakeResponse.objects.get(booking=booking)
        self.assertEqual(intake.responses_json['reason'], 'Feeling anxious')

    def test_available_slots_after_booking(self):
        # First book a slot
        datetime_str = f"{self.tomorrow.isoformat()}T10:00:00"
        Booking.objects.create(
            user=self.client_user,
            therapist=self.therapist,
            scheduled_datetime=datetime_str,
            duration_minutes=60,
            status=Booking.SCHEDULED
        )

        self.client.force_authenticate(user=self.client_user)
        url = reverse('available-slots', kwargs={'therapist_id': self.therapist.id})
        response = self.client.get(url, {'days': 7})
        
        available_slots = response.data.get('available_slots', [])
        for day in available_slots:
            if day['date'] == self.tomorrow.isoformat():
                # Should not have 10:00 slot
                for slot in day['slots']:
                    self.assertNotEqual(slot['start_time'], '10:00')

    def test_start_booking_session(self):
        datetime_str = f"{self.tomorrow.isoformat()}T10:00:00"
        booking = Booking.objects.create(
            user=self.client_user,
            therapist=self.therapist,
            scheduled_datetime=datetime_str,
            duration_minutes=60,
            status=Booking.SCHEDULED
        )

        self.client.force_authenticate(user=self.client_user)
        url = reverse('booking-start', kwargs={'pk': booking.id})
        
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.COMPLETED)
        
        session = Session.objects.get(id=response.data['session_id'])
        self.assertEqual(session.status, Session.ACTIVE)
        self.assertEqual(session.duration_minutes, 60)
