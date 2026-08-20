from django.urls import path
from .views import RegisterDeviceView, NotificationListView, NotificationMarkReadView

urlpatterns = [
    path('devices/register/', RegisterDeviceView.as_view(), name='device-register'),
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-read'),
]
