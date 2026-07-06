import pytest
from django.urls import reverse
from accounts.models import User, LicensedTherapist
from accounts.tests.factories import UserFactory

@pytest.mark.django_db
class TestPublicProfiles:
    def test_public_profile_view_success(self, client):
        # Create user
        user = UserFactory(
            username='jane_doe', 
            email='jane@example.com', 
            role=User.THERAPIST,
            first_name='Jane',
            last_name='Doe'
        )
        # Create therapist profile
        therapist = LicensedTherapist.objects.create(
            user=user,
            is_verified=True,
            per_session_rate=150.00,
            bio='Expert therapist',
            languages=['English', 'Spanish'],
            modalities=['CBT', 'EMDR']
        )
        
        # Access public profile using slug
        url = reverse('public-therapist-profile', kwargs={'slug': therapist.slug})
        response = client.get(url)
        
        assert response.status_code == 200
        data = response.json()
        assert data['id'] == therapist.id
        assert data['name'] == 'Jane Doe'
        assert data['bio'] == 'Expert therapist'
        assert data['per_session_rate'] == 150.00
        assert 'English' in data['languages']
        assert 'CBT' in data['modalities']

    def test_public_profile_not_found(self, client):
        url = reverse('public-therapist-profile', kwargs={'slug': 'non-existent-slug'})
        response = client.get(url)
        assert response.status_code == 404

    def test_public_profile_unverified(self, client):
        # Create user
        user = UserFactory(
            username='john_doe', 
            email='john@example.com', 
            role=User.THERAPIST,
            first_name='John',
            last_name='Doe'
        )
        # Create unverified therapist profile
        therapist = LicensedTherapist.objects.create(
            user=user,
            is_verified=False,
            per_session_rate=100.00
        )
        
        url = reverse('public-therapist-profile', kwargs={'slug': therapist.slug})
        response = client.get(url)
        assert response.status_code == 404
