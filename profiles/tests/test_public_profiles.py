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


@pytest.mark.django_db
class TestPublicCounselorProfiles:
    def make(self, verified=True):
        from accounts.models import GraduateCounselor
        user = UserFactory(role=User.COUNSELOR, first_name='Asha', last_name='Rao')
        return GraduateCounselor.objects.create(
            user=user, is_verified=verified, university='Delhi University', graduation_year=2022,
            specialization='Anxiety', per_minute_rate=2.5, bio='Peer counselor')

    def test_counselor_profile_loads_by_slug(self, client):
        c = self.make()
        r = client.get(reverse('public-counselor-profile', kwargs={'slug': c.slug}))
        assert r.status_code == 200          # used to be a 500: GraduateCounselor was never imported
        data = r.json()
        assert data['name'] == 'Asha Rao' and data['role'] == 'COUNSELOR'
        assert data['university'] == 'Delhi University' and data['per_minute_rate'] == 2.5

    def test_profiles_load_by_numeric_id_too(self, client):
        c = self.make()
        r = client.get(reverse('public-counselor-profile', kwargs={'slug': str(c.id)}))
        assert r.status_code == 200 and r.json()['id'] == c.id
        tu = UserFactory(role=User.THERAPIST)
        t = LicensedTherapist.objects.create(user=tu, is_verified=True)
        r = client.get(reverse('public-therapist-profile', kwargs={'slug': str(t.id)}))
        assert r.status_code == 200 and r.json()['role'] == 'THERAPIST'

    def test_unverified_counselor_is_hidden(self, client):
        c = self.make(verified=False)
        assert client.get(reverse('public-counselor-profile', kwargs={'slug': c.slug})).status_code == 404
        assert client.get(reverse('public-counselor-profile', kwargs={'slug': str(c.id)})).status_code == 404

    def test_session_list_carries_the_provider_name(self, client):
        from rest_framework.test import APIClient
        from core.models import Session
        c = self.make()
        seeker = UserFactory(role=User.GENERAL_USER)
        Session.objects.create(user=seeker, counselor=c, status=Session.ACTIVE)
        api = APIClient()
        api.force_authenticate(user=seeker)
        rows = api.get(reverse('my-sessions')).json()
        assert rows[0]['provider_name'] == 'Asha Rao'
