from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import NotificationViewSet, EmailVerificationViewSet, PasswordResetViewSet

router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    path(
        'email-verification/verify/',
        EmailVerificationViewSet.as_view({'post': 'verify_email'}),
        name='email-verify',
    ),
    path(
        'email-verification/resend/',
        EmailVerificationViewSet.as_view({'post': 'resend_verification'}),
        name='email-verify-resend',
    ),
    path(
        'password-reset/request/',
        PasswordResetViewSet.as_view({'post': 'request_reset'}),
        name='password-reset-request',
    ),
    path(
        'password-reset/verify-token/',
        PasswordResetViewSet.as_view({'post': 'verify_token'}),
        name='password-reset-verify-token',
    ),
    path(
        'password-reset/reset/',
        PasswordResetViewSet.as_view({'post': 'reset_password'}),
        name='password-reset-reset',
    ),
]
