# accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from accounts.models import User, GraduateCounselor, LicensedTherapist, EmergencyContact


class UserSimpleSerializer(serializers.ModelSerializer):
    """Simple user info for general responses"""
    class Meta:
        model = User
        fields = ['id', 'email', 'username',
                  'first_name', 'last_name', 'role', 'phone']


class CounselorProfileSerializer(serializers.ModelSerializer):
    """Serializer for GraduateCounselor profile"""
    class Meta:
        model = GraduateCounselor
        fields = [
            'id', 'degree_file', 'graduation_certificate', 'graduation_year',
            'university', 'specialization', 'years_experience', 'bio',
            'profile_photo', 'per_minute_rate', 'is_verified',
            'verification_date', 'slug', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_verified',
                            'verification_date', 'slug', 'created_at', 'updated_at']


class TherapistProfileSerializer(serializers.ModelSerializer):
    """Serializer for LicensedTherapist profile"""
    class Meta:
        model = LicensedTherapist
        fields = [
            'id', 'license_number', 'license_file', 'modalities', 'languages',
            'bio', 'profile_photo', 'per_minute_rate', 'per_session_rate',
            'is_verified', 'verification_date', 'two_factor_enabled',
            'two_factor_phone', 'slug', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_verified',
                            'verification_date', 'slug', 'created_at', 'updated_at']


class EmergencyContactSerializer(serializers.ModelSerializer):
    """Serializer for emergency contacts"""
    class Meta:
        model = EmergencyContact
        fields = ['id', 'name', 'phone', 'relationship', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserDetailSerializer(serializers.ModelSerializer):
    """Full user profile including role-specific data"""
    counselor_profile = CounselorProfileSerializer(read_only=True)
    therapist_profile = TherapistProfileSerializer(read_only=True)
    emergency_contacts = EmergencyContactSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'role',
            'phone', 'is_active', 'created_at',
            'counselor_profile', 'therapist_profile', 'emergency_contacts'
        ]
        read_only_fields = ['id', 'is_active', 'created_at']


class LoginSerializer(serializers.Serializer):
    """Serializer for login endpoint"""
    email_or_username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email_or_username = data.get('email_or_username')
        password = data.get('password')

        if not email_or_username or not password:
            raise serializers.ValidationError(
                "Email/Username and password are required")

        try:
            # Try to find user by email first, then username
            user = User.objects.get(email=email_or_username)
        except User.DoesNotExist:
            try:
                user = User.objects.get(username=email_or_username)
            except User.DoesNotExist:
                raise serializers.ValidationError(
                    "Invalid email/username or password")

        # Authenticate
        if not user.check_password(password):
            raise serializers.ValidationError(
                "Invalid email/username or password")

        if not user.is_active:
            raise serializers.ValidationError("User account is inactive")

        data['user'] = user
        return data


class TokenSerializer(serializers.Serializer):
    """Serializer for token response"""
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserDetailSerializer()


class RefreshTokenSerializer(serializers.Serializer):
    """Serializer for refresh token endpoint"""
    refresh = serializers.CharField()


class LogoutSerializer(serializers.Serializer):
    """Serializer for logout endpoint"""
    refresh = serializers.CharField()


# ============= REGISTRATION SERIALIZERS =============

class RequestOTPSerializer(serializers.Serializer):
    """Serializer for requesting OTP"""
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['GENERAL_USER', 'COUNSELOR', 'THERAPIST'])

    def validate_email(self, value):
        # Check if user already exists
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value


class VerifyOTPSerializer(serializers.Serializer):
    """Serializer for verifying OTP"""
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)

    def validate_otp_code(self, value):
        # Ensure OTP is numeric
        if not value.isdigit():
            raise serializers.ValidationError("OTP must be numeric.")
        return value


class RegisterGeneralUserSerializer(serializers.Serializer):
    """Serializer for registering a general user"""
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    emergency_contacts = EmergencyContactSerializer(many=True)

    def validate(self, data):
        # Password confirmation
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })

        # Email verified check (handled by view)
        # Username uniqueness
        if User.objects.filter(username=data.get('username')).exists():
            raise serializers.ValidationError({
                'username': 'This username is already taken.'
            })

        return data

    def validate_emergency_contacts(self, value):
        if len(value) < 2:
            raise serializers.ValidationError(
                "Minimum 2 emergency contacts are required."
            )
        return value


class RegisterCounselorSerializer(serializers.Serializer):
    """Serializer for registering a graduate counselor"""
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # Counselor specific
    graduation_year = serializers.IntegerField(min_value=1900, max_value=2100)
    university = serializers.CharField(max_length=200)
    specialization = serializers.CharField(max_length=200)
    years_experience = serializers.IntegerField(min_value=0)
    bio = serializers.CharField(required=False, allow_blank=True)
    per_minute_rate = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=0)

    # File uploads
    degree_file = serializers.FileField(required=False)
    graduation_certificate = serializers.FileField(required=False)

    def validate(self, data):
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })

        if User.objects.filter(username=data.get('username')).exists():
            raise serializers.ValidationError({
                'username': 'This username is already taken.'
            })

        if User.objects.filter(email=data.get('email')).exists():
            raise serializers.ValidationError({
                'email': 'This email is already registered.'
            })

        return data


class RegisterTherapistSerializer(serializers.Serializer):
    """Serializer for registering a licensed therapist"""
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # Therapist specific
    license_number = serializers.CharField(max_length=100)
    modalities = serializers.ListField(child=serializers.CharField())
    languages = serializers.ListField(child=serializers.CharField())
    bio = serializers.CharField(required=False, allow_blank=True)
    per_minute_rate = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=0)
    per_session_rate = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=0)
    two_factor_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # File uploads
    license_file = serializers.FileField(required=False)

    def validate(self, data):
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })

        if User.objects.filter(username=data.get('username')).exists():
            raise serializers.ValidationError({
                'username': 'This username is already taken.'
            })

        if User.objects.filter(email=data.get('email')).exists():
            raise serializers.ValidationError({
                'email': 'This email is already registered.'
            })

        return data
