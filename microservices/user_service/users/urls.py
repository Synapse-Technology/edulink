from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for viewsets
router = DefaultRouter()
router.register(r'manage', views.UserViewSet, basename='user-manage')

app_name = 'users'

urlpatterns = [
    # Authentication endpoints
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('login/', views.UserLoginView.as_view(), name='login'),
    path('logout/', views.UserLogoutView.as_view(), name='logout'),
    
    # Email verification
    path('verify-email/<str:uidb64>/<str:token>/', 
         views.EmailVerificationView.as_view(), name='verify-email'),
    path('resend-verification/', 
         views.ResendVerificationView.as_view(), name='resend-verification'),
    
    # Profile management
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('current/', views.current_user_view, name='current-user'),
    
    # Password and email management
    path('change-password/', 
         views.PasswordChangeView.as_view(), name='change-password'),
    path('change-email/', 
         views.EmailChangeView.as_view(), name='change-email'),
    path('confirm-email-change/<str:token>/', 
         views.confirm_email_change_view, name='confirm-email-change'),
    
    # Session management
    path('sessions/', views.UserSessionsView.as_view(), name='sessions'),
    path('sessions/<uuid:session_id>/terminate/', 
         views.TerminateSessionView.as_view(), name='terminate-session'),
    
    # Activity and preferences
    path('activity/', views.UserActivityView.as_view(), name='activity'),
    path('preferences/', views.UserPreferencesView.as_view(), name='preferences'),
    
    # Admin/management endpoints (include router)
    path('', include(router.urls)),
    
    # Health check
    path('health/', views.health_check_view, name='health-check'),
]