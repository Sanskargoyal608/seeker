from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import UserDevice
from .serializers import UserDeviceSerializer

class RegisterDeviceView(APIView):
    """
    POST /api/notifications/devices/register/
    Registers an FCM token for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = UserDeviceSerializer(data=request.data)
        if serializer.is_valid():
            fcm_token = serializer.validated_data['fcm_token']
            platform = serializer.validated_data['platform']
            
            # Update or create the device for this user
            device, created = UserDevice.objects.update_or_create(
                user=request.user,
                fcm_token=fcm_token,
                defaults={'platform': platform, 'is_active': True}
            )
            
            return Response({'status': 'Device registered'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
