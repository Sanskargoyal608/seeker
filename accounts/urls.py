from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health, name='accounts-health'),

    # Authentication endpoints
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/refresh/', views.RefreshTokenView.as_view(), name='refresh-token'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/logout-all/', views.LogoutAllDevicesView.as_view(), name='logout-all'),
    path('auth/me/', views.MeView.as_view(), name='me'),
]
