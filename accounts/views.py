from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.serializers import (
    LoginSerializer, TokenSerializer, RefreshTokenSerializer, LogoutSerializer, UserDetailSerializer
)
from accounts.throttles import LoginThrottle, RefreshTokenThrottle
from accounts.token_service import DeviceTokenService


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

    def get(self, request):
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
