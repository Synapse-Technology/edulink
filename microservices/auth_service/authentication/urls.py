from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'authentication'

# API URL patterns
urlpatterns = [
    # Self-service registration
    path('self-service/', include('authentication.urls_self_service')),
    # Authentication endpoints
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('register/student/', views.StudentRegistrationView.as_view(), name='student_register'),
    path('login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', views.CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('token/validate/', views.validate_token, name='validate_token'),
    
    # Email OTP endpoints
    path('otp/request/', views.EmailOTPRequestView.as_view(), name='otp_request'),
    path('otp/verify/', views.EmailOTPVerificationView.as_view(), name='otp_verify'),
    
    # Password management
    path('password/reset/request/', views.PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password/reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('password/change/', views.PasswordChangeView.as_view(), name='password_change'),
    
    # User profile
    path('profile/', views.UserProfileView.as_view(), name='user_profile'),
    
    # Two-factor authentication
    path('2fa/setup/', views.TwoFactorSetupView.as_view(), name='two_factor_setup'),
    
    # Invitations (admin)
    path('invites/', views.InviteListView.as_view(), name='invite_list'),
    path('invites/create/', views.InviteCreateView.as_view(), name='invite_create'),
    
    # User management (admin)
    path('users/', views.UserListView.as_view(), name='user_list'),
    
    # Health check
    path('health/', views.health_check, name='health_check'),
]