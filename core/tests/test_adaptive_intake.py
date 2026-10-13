from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch
import json
from core.models import TriageSession, Session, SessionNote
from core.services.triage_service import TriageService, SOFT_TURN_LIMIT, HARD_TURN_LIMIT
from accounts.models import LicensedTherapist, GraduateCounselor

User = get_user_model()

class AdaptiveIntakeTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='patient',
            email='patient@example.com',
            password='password123',
            role=User.GENERAL_USER,
            first_name='Alex',
            last_name='Smith'
        )
        self.therapist_user = User.objects.create_user(
            username='therapist_sarah',
            email='therapist@example.com',
            password='password123',
            role=User.THERAPIST,
            first_name='Dr. Sarah',
            last_name='Chen'
        )
        self.therapist = LicensedTherapist.objects.create(
            user=self.therapist_user,
            is_verified=True,
            per_session_rate=120.0,
            modalities=['CBT', 'ACT'],
            languages=['English']
        )
        self.service = TriageService()

    @patch('core.services.triage_service.TriageService._call_openai')
    def test_start_triage_returns_chips(self, mock_openai):
        mock_openai.return_value = json.dumps({
            "message_to_user": "Welcome to Seeker. How are you feeling today?",
            "suggested_chips": ["Feeling overwhelmed", "Struggling with stress", "Just need to talk"],
            "internal_reasoning": "Starting intake",
            "extracted_data": {},
            "is_complete": False
        })

        session = self.service.start_triage(self.user)
        self.assertEqual(session.conversation_phase, "OPENING")
        self.assertEqual(session.turn_count, 0)
        self.assertFalse(session.is_complete)
        self.assertTrue(len(session.suggested_chips) >= 3)
        self.assertIn("Feeling overwhelmed", session.suggested_chips)

    @patch('core.services.triage_service.TriageService._call_openai')
    def test_life_stress_routes_to_graduate_counselor(self, mock_openai):
        """
        Life stress (loneliness, exam stress) should route to GRADUATE_COUNSELOR
        and automatically place patient into active counselor queue (Session.WAITING).
        """
        # Turn 1
        mock_openai.return_value = json.dumps({
            "message_to_user": "I hear you. How long have you felt stressed about your career?",
            "suggested_chips": ["A few weeks", "Several months", "Just started"],
            "internal_reasoning": "Life stress detected",
            "extracted_data": {
                "chief_complaint": "career stress and loneliness",
                "emotional_state": "overwhelmed",
                "provisional_conditions": ["Life Transition Stress"],
                "suspected_conditions": ["career", "loneliness"],
                "provider_tier_recommendation": "GRADUATE_COUNSELOR",
                "urgency": "low"
            },
            "is_complete": False
        })
        triage = self.service.start_triage(self.user)
        triage = self.service.process_response(triage.id, "Stressed about finding a job after college")
        self.assertEqual(triage.conversation_phase, "EXPLORATION")
        self.assertEqual(triage.turn_count, 1)

        # Turn 2 -> provide duration & symptoms -> simulate AI closing
        mock_openai.return_value = json.dumps({
            "message_to_user": "Thank you for sharing. I've prepared your intake summary and am connecting you with a counselor.",
            "suggested_chips": ["Ready for counselor"],
            "internal_reasoning": "Life stress fully characterized, wrapping up",
            "extracted_data": {
                "duration": "1 month",
                "sleep_quality": "fine",
                "appetite_change": "normal",
                "functional_impairment": {"occupational": "mild fatigue"},
                "provisional_conditions": ["Career Burnout / Adjustment"],
                "suspected_conditions": ["career", "burnout"],
                "therapy_goals": ["Actionable career coping strategies"],
                "recommended_modalities": ["Supportive Counseling", "CBT"],
                "specialization_tags": ["career-burnout", "work-stress"],
                "provider_tier_recommendation": "GRADUATE_COUNSELOR",
                "urgency": "low"
            },
            "intake_dossier": (
                "> [!NOTE]\n"
                "> **AI-Assisted Provisional Assessment**\n"
                "> *For clinical guidance only; requires formal practitioner evaluation.*\n\n"
                "### Clinical Intake Dossier\n"
                "- **Presenting Concern:** Career transition stress\n"
                "- **Timeline:** 1 month\n"
                "- **Provisional Impression:** Adjustment & Life Stress\n"
                "- **Provider Tier:** Graduate Counselor\n"
            ),
            "is_complete": True
        })
        triage = self.service.process_response(triage.id, "It has been about 1 month, sleep is fine")
        
        self.assertTrue(triage.is_complete)
        self.assertEqual(triage.routing_decision, "GRADUATE_COUNSELOR")
        self.assertIsNotNone(triage.resulting_session)
        self.assertEqual(triage.resulting_session.status, Session.WAITING)
        self.assertIn("AI-Assisted Provisional Assessment", triage.intake_dossier)
        
        # Verify SessionNote created
        note = SessionNote.objects.filter(session=triage.resulting_session).first()
        self.assertIsNotNone(note)
        self.assertIn("Career transition stress", note.note_text)

    @patch('profiles.services.typesense_service.TypesenseService.search_therapists')
    @patch('core.services.triage_service.TriageService._call_openai')
    def test_clinical_disorder_routes_to_licensed_therapist_with_recommendations(self, mock_openai, mock_ts):
        """
        Severe clinical conditions (PTSD, MDD, severe OCD, panic) route to LICENSED_THERAPIST
        and populate recommended_therapists shortlist.
        """
        mock_ts.return_value = {
            'hits': [{
                'document': {
                    'id': str(self.therapist.id),
                    'name': 'Dr. Sarah Chen',
                    'bio': 'Specialist in trauma and PTSD',
                    'per_session_rate': 120.0,
                    'languages': ['English'],
                    'modalities': ['CBT', 'EMDR']
                }
            }]
        }
        mock_openai.return_value = json.dumps({
            "message_to_user": "I am so sorry you are going through this. I have completed your intake for our clinical specialists.",
            "suggested_chips": ["See specialists"],
            "internal_reasoning": "Severe PTSD symptoms meeting clinical disorder threshold",
            "extracted_data": {
                "chief_complaint": "Severe flashbacks and nightmares after a car accident",
                "duration": "6 months",
                "emotional_state": "hypervigilant, terrified",
                "triggers": ["car rides", "loud noises"],
                "sleep_quality": "severe insomnia with nightmares",
                "functional_impairment": {"occupational": "unable to drive to work", "social": "isolated"},
                "provisional_conditions": ["Post-Traumatic Stress Disorder (PTSD)"],
                "suspected_conditions": ["ptsd", "severe trauma"],
                "recommended_modalities": ["CBT", "EMDR"],
                "specialization_tags": ["ptsd", "trauma"],
                "provider_tier_recommendation": "LICENSED_THERAPIST",
                "urgency": "high"
            },
            "intake_dossier": (
                "> [!NOTE]\n"
                "> **AI-Assisted Provisional Assessment**\n"
                "> *For clinical guidance only; requires formal practitioner evaluation.*\n\n"
                "### Clinical Intake Dossier\n"
                "- **Presenting Concern:** Severe PTSD flashbacks\n"
                "- **Onset:** 6 months post-accident\n"
                "- **Provisional Impression:** Post-Traumatic Stress Disorder\n"
                "- **Provider Tier:** Licensed Therapist\n"
            ),
            "is_complete": True
        })

        triage = self.service.start_triage(self.user)
        triage = self.service.process_response(triage.id, "I have severe PTSD flashbacks and can't sleep for 6 months")

        self.assertTrue(triage.is_complete)
        self.assertEqual(triage.routing_decision, "LICENSED_THERAPIST")
        self.assertGreaterEqual(len(triage.recommended_therapists), 1)
        first_match = triage.recommended_therapists[0]
        self.assertEqual(first_match['id'], self.therapist.id)
        self.assertEqual(first_match['name'], "Dr. Sarah Chen")
        self.assertEqual(first_match['per_session_rate'], 120.0)

    @patch('core.services.triage_service.TriageService._call_openai')
    def test_evasive_patient_hard_limit_completion(self, mock_openai):
        """
        If a user answers 'no', 'idk', or gives one-word answers,
        the system should gracefully conclude by HARD_TURN_LIMIT (6 turns)
        without looping infinitely.
        """
        mock_openai.return_value = json.dumps({
            "message_to_user": "That's completely okay. We don't have to put any pressure on this.",
            "suggested_chips": ["I don't know", "Not sure", "Skip"],
            "internal_reasoning": "Client evasive / low energy, recording unspecified",
            "extracted_data": {
                "chief_complaint": "unspecified discomfort",
                "emotional_state": "withdrawn"
            },
            "is_complete": False
        })

        triage = self.service.start_triage(self.user)

        # Simulate 6 consecutive evasive turns
        for i in range(1, HARD_TURN_LIMIT + 1):
            triage = self.service.process_response(triage.id, "i don't know")
            if i < HARD_TURN_LIMIT:
                self.assertFalse(triage.is_complete)
            else:
                self.assertTrue(triage.is_complete)

        self.assertEqual(triage.turn_count, HARD_TURN_LIMIT)
        self.assertTrue(triage.is_complete)
        self.assertIn("AI-Assisted Provisional Assessment", triage.intake_dossier)
        self.assertEqual(triage.routing_decision, "GRADUATE_COUNSELOR")
