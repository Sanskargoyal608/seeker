import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, GraduateCounselor, LicensedTherapist
from accounts.tests.factories import UserFactory

@pytest.mark.django_db
class TestProfileSearch:
    def setup_method(self):
        self.api_client = APIClient()
        
        # Setup users
        self.counselor_user = UserFactory(role=User.COUNSELOR, first_name="Grad", last_name="Couns")
        self.counselor = GraduateCounselor.objects.create(user=self.counselor_user, is_verified=True)
        
        self.general_user = UserFactory(role=User.GENERAL_USER)
        
        # Setup therapists
        self.t1_user = UserFactory(role=User.THERAPIST, first_name="T1", is_active=True)
        self.t1 = LicensedTherapist.objects.create(
            user=self.t1_user, 
            is_verified=True, 
            languages=["English", "Spanish"],
            modalities=["CBT", "DBT"],
            per_session_rate=100.00
        )
        
        self.t2_user = UserFactory(role=User.THERAPIST, first_name="T2", is_active=True)
        self.t2 = LicensedTherapist.objects.create(
            user=self.t2_user, 
            is_verified=True, 
            languages=["English", "French"],
            modalities=["CBT", "EMDR"],
            per_session_rate=150.00
        )

        self.t3_user = UserFactory(role=User.THERAPIST, first_name="T3", is_active=True)
        self.t3 = LicensedTherapist.objects.create(
            user=self.t3_user, 
            is_verified=False, # unverified should not show up
            languages=["English"],
            modalities=["CBT"],
            per_session_rate=50.00
        )

    @pytest.fixture(autouse=True)
    def mock_typesense(self):
        from unittest.mock import patch
        
        # We need to start the patcher
        self.patcher = patch('profiles.services.typesense_service.TypesenseService')
        self.mock_service = self.patcher.start()
        
        self.mock_instance = self.mock_service.return_value
        
        # Setup default mock search response
        self.mock_instance.search_therapists.return_value = {
            'hits': [
                {'document': {'id': '1', 'name': 'T1 Name', 'languages': ['English', 'Spanish'], 'modalities': ['CBT', 'DBT'], 'per_session_rate': 100.0}},
                {'document': {'id': '2', 'name': 'T2 Name', 'languages': ['English', 'French'], 'modalities': ['CBT', 'EMDR'], 'per_session_rate': 150.0}}
            ],
            'found': 2,
            'page': 1
        }
        
        yield
        
        self.patcher.stop()

    def test_therapist_search_no_filters(self):
        self.api_client.force_authenticate(user=self.counselor_user)
        url = reverse('therapist-search')
        response = self.api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()['hits']
        assert len(data) == 2 
        self.mock_instance.search_therapists.assert_called_once_with(query='*', filters=None, page=1)
        
    def test_therapist_search_language_filter(self):
        self.mock_instance.search_therapists.return_value = {
            'hits': [
                {'document': {'id': '1', 'name': 'T1 Name', 'languages': ['English', 'Spanish'], 'modalities': ['CBT', 'DBT'], 'per_session_rate': 100.0}}
            ]
        }
        self.api_client.force_authenticate(user=self.counselor_user)
        url = reverse('therapist-search')
        response = self.api_client.get(url, {'language': 'Spanish'})
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()['hits']
        assert len(data) == 1
        self.mock_instance.search_therapists.assert_called_once_with(query='*', filters="languages:=`Spanish`", page=1)

    def test_therapist_search_modality_filter(self):
        self.mock_instance.search_therapists.return_value = {
            'hits': [
                {'document': {'id': '2', 'name': 'T2 Name', 'languages': ['English', 'French'], 'modalities': ['CBT', 'EMDR'], 'per_session_rate': 150.0}}
            ]
        }
        self.api_client.force_authenticate(user=self.counselor_user)
        url = reverse('therapist-search')
        response = self.api_client.get(url, {'modality': 'EMDR'})
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()['hits']
        assert len(data) == 1
        self.mock_instance.search_therapists.assert_called_once_with(query='*', filters="modalities:=`EMDR`", page=1)

    def test_therapist_search_max_price_filter(self):
        self.mock_instance.search_therapists.return_value = {
            'hits': [
                {'document': {'id': '1', 'name': 'T1 Name', 'languages': ['English', 'Spanish'], 'modalities': ['CBT', 'DBT'], 'per_session_rate': 100.0}}
            ]
        }
        self.api_client.force_authenticate(user=self.counselor_user)
        url = reverse('therapist-search')
        response = self.api_client.get(url, {'max_price': '120.00'})
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()['hits']
        assert len(data) == 1
        self.mock_instance.search_therapists.assert_called_once_with(query='*', filters="per_session_rate:<=120.00", page=1)

    def test_therapist_search_allowed_for_general_user(self):
        self.api_client.force_authenticate(user=self.general_user)
        url = reverse('therapist-search')
        response = self.api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'hits' in response.json()

    def test_budget_counselor_search(self):
        self.api_client.force_authenticate(user=self.general_user)
        url = reverse('budget-counselor-search')
        response = self.api_client.get(url, {'max_budget': 120})
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()['therapists']
        assert len(data) == 1
        assert data[0]['name'] == f"T1 {self.t1_user.last_name}"
        assert data[0]['per_session_rate'] == 100.0

    def test_budget_counselor_search_invalid_budget(self):
        self.api_client.force_authenticate(user=self.general_user)
        url = reverse('budget-counselor-search')
        response = self.api_client.get(url, {'max_budget': 'abc'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_budget_counselor_search_forbidden_for_counselor(self):
        self.api_client.force_authenticate(user=self.counselor_user)
        url = reverse('budget-counselor-search')
        response = self.api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
