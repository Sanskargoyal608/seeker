import factory
from datetime import timedelta
from django.utils import timezone
from accounts.models import User, GraduateCounselor, LicensedTherapist, EmergencyContact, OTPToken


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ('email',)
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f'user{n}')
    email = factory.Sequence(lambda n: f'user{n}@example.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    phone = factory.Faker('phone_number')
    role = User.GENERAL_USER
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')


class GraduateCounselorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = GraduateCounselor

    user = factory.SubFactory(UserFactory, role=User.COUNSELOR)
    graduation_year = 2023
    university = 'Test University'
    specialization = 'Anxiety'
    years_experience = 3
    bio = 'Experienced counselor for mental wellness.'
    per_minute_rate = '25.00'
    is_verified = True


class LicensedTherapistFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = LicensedTherapist

    user = factory.SubFactory(UserFactory, role=User.THERAPIST)
    license_number = 'LIC-12345'
    modalities = ['CBT', 'DBT']
    languages = ['English']
    bio = 'Licensed therapist with strong clinical experience.'
    per_minute_rate = '50.00'
    per_session_rate = '120.00'
    two_factor_enabled = True
    two_factor_phone = '555-123-4567'
    is_verified = True


class EmergencyContactFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = EmergencyContact

    user = factory.SubFactory(UserFactory)
    name = factory.Faker('name')
    phone = factory.Faker('phone_number')
    relationship = factory.Iterator(['Family', 'Friend', 'Partner'])


class OTPTokenFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OTPToken

    email = factory.Sequence(lambda n: f'otp{n}@example.com')
    otp_code = '123456'
    expires_at = factory.LazyFunction(
        lambda: timezone.now() + timedelta(minutes=10))
    is_verified = False
