from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from accounts.serializers import (
    LoginSerializer, TokenSerializer, RefreshTokenSerializer, LogoutSerializer, UserDetailSerializer,
    RequestOTPSerializer, VerifyOTPSerializer, RegisterGeneralUserSerializer,
    RegisterCounselorSerializer, RegisterTherapistSerializer
)
from accounts.throttles import LoginThrottle, RefreshTokenThrottle, RegisterThrottle
from accounts.token_service import DeviceTokenService
from accounts.otp_service import OTPService
from accounts.models import User, GraduateCounselor, LicensedTherapist, EmergencyContact
import accounts.throttles as throttles


def health(request):
    return JsonResponse({'status': 'ok', 'app': 'accounts'})


class LoginView(APIView):
    """
    User login endpoint.
    Accepts email or username with password.
    Returns JWT tokens (access, refresh) and full user profile.
    Implements device-based token tracking.
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    @extend_schema(request=LoginSerializer, responses=TokenSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']

        # Get device hash from User-Agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Generate tokens with device tracking
        tokens = DeviceTokenService.generate_tokens(user, user_agent)

        # Serialize user data
        user_serializer = UserDetailSerializer(user)

        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'device_hash': tokens['device_hash'],
            'user': user_serializer.data,
        }, status=status.HTTP_200_OK)


class RefreshTokenView(APIView):
    """
    Refresh access token using refresh token.
    Validates device-specific token storage.
    """
    permission_classes = [AllowAny]
    throttle_classes = [RefreshTokenThrottle]

    @extend_schema(request=RefreshTokenSerializer, responses=TokenSerializer)
    def post(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data['refresh']

        try:
            # Decode the refresh token to get user_id
            refresh = RefreshToken(refresh_token)
            user_id = refresh.payload.get('user_id')

            # Verify token is in Redis (device-specific check)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            if not DeviceTokenService.verify_token_valid(user_id, refresh_token, user_agent):
                return Response(
                    {'detail': 'Invalid or expired token for this device.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Generate new access token
            new_access_token = str(refresh.access_token)

            return Response({
                'access': new_access_token,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'detail': f'Token refresh failed: {str(e)}'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class LogoutView(APIView):
    """
    Logout endpoint. Invalidates the device-specific token.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=None)
    def post(self, request):
        user_id = request.user.id
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Invalidate token for this device
        DeviceTokenService.invalidate_token(user_id, user_agent)

        return Response(
            {'detail': 'Logged out successfully.'},
            status=status.HTTP_200_OK
        )


class LogoutAllDevicesView(APIView):
    """
    Logout from all devices by invalidating all tokens for the user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=None)
    def post(self, request):
        user_id = request.user.id

        # Invalidate all tokens
        DeviceTokenService.invalidate_all_user_tokens(user_id)

        return Response(
            {'detail': 'Logged out from all devices.'},
            status=status.HTTP_200_OK
        )


class MeView(APIView):
    """
    Get current user profile with full details including role-specific data.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UserDetailSerializer)
    def get(self, request):
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============= REGISTRATION VIEWS =============

class RequestOTPView(APIView):
    """
    Request OTP for registration.
    Sends 6-digit OTP to the provided email.
    """
    permission_classes = [AllowAny]
    throttle_classes = [throttles.RegisterThrottle]

    @extend_schema(request=RequestOTPSerializer)
    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        role = serializer.validated_data['role']

        # Generate and send OTP
        otp_code, _ = OTPService.create_otp_for_email(email)

        # Send email
        success = OTPService.send_otp_email(email, otp_code)

        if not success:
            return Response(
                {'detail': 'Failed to send OTP email. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            'detail': f'OTP sent to {email}. Valid for 10 minutes.',
            'email': email,
            'role': role,
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    """
    Verify OTP code from email.
    """
    permission_classes = [AllowAny]

    @extend_schema(request=VerifyOTPSerializer)
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp_code']

        # Verify OTP
        if OTPService.verify_otp(email, otp_code):
            return Response({
                'detail': 'OTP verified successfully.',
                'email': email,
                'verified': True,
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'detail': 'Invalid or expired OTP.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class RegisterGeneralUserView(APIView):
    """
    Complete registration for a general user (patient).
    Requires verified email via OTP.
    """
    permission_classes = [AllowAny]
    throttle_classes = [throttles.RegisterThrottle]

    @extend_schema(request=RegisterGeneralUserSerializer, responses=TokenSerializer)
    def post(self, request):
        serializer = RegisterGeneralUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        first_name = serializer.validated_data.get('first_name', '')
        last_name = serializer.validated_data.get('last_name', '')
        phone = serializer.validated_data.get('phone', '')
        emergency_contacts_data = serializer.validated_data['emergency_contacts']

        # Verify email
        if not OTPService.is_email_verified(email):
            return Response(
                {'detail': 'Email not verified. Please request and verify OTP first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create user
        try:
            user = User.objects.create_user(
                email=email,
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                role=User.GENERAL_USER,
                is_active=True,
            )

            # Create emergency contacts
            for contact_data in emergency_contacts_data:
                EmergencyContact.objects.create(
                    user=user,
                    **contact_data
                )

            # Generate tokens
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            tokens = DeviceTokenService.generate_tokens(user, user_agent)

            # Return response with tokens and user
            user_serializer = UserDetailSerializer(user)

            return Response({
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'device_hash': tokens['device_hash'],
                'user': user_serializer.data,
                'detail': 'Registration successful. You are now logged in.',
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'detail': f'Registration failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class RegisterCounselorView(APIView):
    """
    Complete registration for a graduate counselor.
    Requires verified email via OTP.
    Created account will have is_verified=False until admin approval.
    """
    permission_classes = [AllowAny]
    throttle_classes = [throttles.RegisterThrottle]

    @extend_schema(request=RegisterCounselorSerializer, responses=TokenSerializer)
    def post(self, request):
        serializer = RegisterCounselorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        # Verify email
        if not OTPService.is_email_verified(email):
            return Response(
                {'detail': 'Email not verified. Please request and verify OTP first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create user
        try:
            user = User.objects.create_user(
                email=email,
                username=username,
                password=password,
                first_name=serializer.validated_data['first_name'],
                last_name=serializer.validated_data['last_name'],
                phone=serializer.validated_data.get('phone', ''),
                role=User.COUNSELOR,
                is_active=True,
            )

            # Create counselor profile (is_verified=False by default)
            GraduateCounselor.objects.create(
                user=user,
                graduation_year=serializer.validated_data['graduation_year'],
                university=serializer.validated_data['university'],
                specialization=serializer.validated_data['specialization'],
                years_experience=serializer.validated_data['years_experience'],
                bio=serializer.validated_data.get('bio', ''),
                per_minute_rate=serializer.validated_data['per_minute_rate'],
                is_verified=False,  # Requires admin approval
            )

            # Generate tokens
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            tokens = DeviceTokenService.generate_tokens(user, user_agent)

            user_serializer = UserDetailSerializer(user)

            return Response({
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'device_hash': tokens['device_hash'],
                'user': user_serializer.data,
                'detail': 'Registration successful. Your account is pending admin verification.',
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'detail': f'Registration failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class RegisterTherapistView(APIView):
    """
    Complete registration for a licensed therapist.
    Requires verified email via OTP.
    Created account will have is_verified=False until admin approval.
    """
    permission_classes = [AllowAny]
    throttle_classes = [throttles.RegisterThrottle]

    @extend_schema(request=RegisterTherapistSerializer, responses=TokenSerializer)
    def post(self, request):
        serializer = RegisterTherapistSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        # Verify email
        if not OTPService.is_email_verified(email):
            return Response(
                {'detail': 'Email not verified. Please request and verify OTP first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create user
        try:
            user = User.objects.create_user(
                email=email,
                username=username,
                password=password,
                first_name=serializer.validated_data['first_name'],
                last_name=serializer.validated_data['last_name'],
                phone=serializer.validated_data.get('phone', ''),
                role=User.THERAPIST,
                is_active=True,
            )

            # Create therapist profile (is_verified=False by default)
            LicensedTherapist.objects.create(
                user=user,
                license_number=serializer.validated_data['license_number'],
                modalities=serializer.validated_data['modalities'],
                languages=serializer.validated_data['languages'],
                bio=serializer.validated_data.get('bio', ''),
                per_minute_rate=serializer.validated_data['per_minute_rate'],
                per_session_rate=serializer.validated_data['per_session_rate'],
                two_factor_phone=serializer.validated_data.get('two_factor_phone', ''),
                is_verified=False,  # Requires admin approval
            )

            # Generate tokens
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            tokens = DeviceTokenService.generate_tokens(user, user_agent)

            user_serializer = UserDetailSerializer(user)

            return Response({
                'access': tokens['access'],
                'refresh': tokens['refresh'],
                'device_hash': tokens['device_hash'],
                'user': user_serializer.data,
                'detail': 'Registration successful. Your account is pending admin verification.',
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'detail': f'Registration failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
