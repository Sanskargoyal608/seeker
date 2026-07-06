from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema')),
    path('api/accounts/', include('accounts.urls')),
    path('api/core/', include('core.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/profiles/', include('profiles.urls')),
    path('api/helpline/', include('helpline.urls')),
    path('api/', include('feedback.urls')),
]
