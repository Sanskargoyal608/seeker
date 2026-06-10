from django.urls import path
from .views import RegisterDeviceView

urlpatterns = [
    path('devices/register/', RegisterDeviceView.as_view(), name='device-register'),
]
