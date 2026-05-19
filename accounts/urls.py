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

    # Registration endpoints
    path('auth/register/request-otp/', views.RequestOTPView.as_view(), name='request-otp'),
    path('auth/register/verify-otp/', views.VerifyOTPView.as_view(), name='verify-otp'),
    path('auth/register/general-user/', views.RegisterGeneralUserView.as_view(), name='register-general-user'),
    path('auth/register/counselor/', views.RegisterCounselorView.as_view(), name='register-counselor'),
    path('auth/register/therapist/', views.RegisterTherapistView.as_view(), name='register-therapist'),
]
