# accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from accounts.models import User, GraduateCounselor, LicensedTherapist, EmergencyContact, OTPToken


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


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating the user's profile.
    Handles User fields and delegates to counselor/therapist profile serializers.
    """
    counselor_profile = CounselorProfileSerializer(required=False)
    therapist_profile = TherapistProfileSerializer(required=False)
    emergency_contacts = EmergencyContactSerializer(many=True, required=False)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'counselor_profile', 'therapist_profile', 'emergency_contacts']
        
    def update(self, instance, validated_data):
        # Update user fields
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.phone = validated_data.get('phone', instance.phone)
        instance.save()
        
        # Update counselor profile if provided
        counselor_data = validated_data.get('counselor_profile')
        if counselor_data and hasattr(instance, 'counselor_profile'):
            counselor_serializer = CounselorProfileSerializer(
                instance.counselor_profile, data=counselor_data, partial=True
            )
            if counselor_serializer.is_valid():
                counselor_serializer.save()
                
        # Update therapist profile if provided
        therapist_data = validated_data.get('therapist_profile')
        if therapist_data and hasattr(instance, 'therapist_profile'):
            therapist_serializer = TherapistProfileSerializer(
                instance.therapist_profile, data=therapist_data, partial=True
            )
            if therapist_serializer.is_valid():
                therapist_serializer.save()

        # Update emergency contacts if provided
        emergency_contacts_data = validated_data.get('emergency_contacts')
        if emergency_contacts_data is not None:
            # For simplicity, we delete existing and recreate them when updating.
            instance.emergency_contacts.all().delete()
            for contact_data in emergency_contacts_data:
                EmergencyContact.objects.create(user=instance, **contact_data)
                
        return instance


class ForgotPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No account found with this email")
        return value


class ForgotPasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        otp_code = data.get('otp_code')
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("No account found with this email")

        try:
            from django.utils import timezone
            otp = OTPToken.objects.get(email=email, otp_code=otp_code, expires_at__gt=timezone.now())
        except OTPToken.DoesNotExist:
            raise serializers.ValidationError("Invalid or expired OTP")
            
        data['user'] = user
        data['otp'] = otp
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
