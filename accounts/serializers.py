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
    counselor_profile = CounselorProfileSerializer(
        source='counselor_profile', read_only=True)
    therapist_profile = TherapistProfileSerializer(
        source='therapist_profile', read_only=True)
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
