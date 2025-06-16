from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenBlacklistView,
)
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    ChangePasswordView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
]
