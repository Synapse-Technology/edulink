from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenBlacklistView,
)
from .views import (
    InviteRegisterTemplateView,
    RegisterView,
    CustomTokenObtainPairView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    ChangePasswordView,
    InviteRegisterView,
    InviteCreateView,
    TwoFALoginView,
    VerifyOTPView,
    StudentRegistrationView,
    PasswordResetConfirmTemplateView,
    RegistrationSuccessView,
    PasswordResetSuccessView,
)

urlpatterns = [
    path('register/', StudentRegistrationView.as_view(), name='student-register'),
    path('invite/', InviteCreateView.as_view(), name='send-invite'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', TokenBlacklistView.as_view(), name='token_blacklist'),

    # 2FA: Step 1 - Login to receive OTP
    path("2fa/login/", TwoFALoginView.as_view(), name="2fa_login"),

    # 2FA: Step 2 - Verify OTP
    path("2fa/verify/", VerifyOTPView.as_view(), name="2fa_verify"),

    # Password reset
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('reset-password-confirm/<uidb64>/<token>/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    # Change password for logged-in user
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),

    # Template-based registration and password reset
    path("invite-register/", InviteRegisterTemplateView.as_view(), name="invite_register_template"),
    path("reset-password/<uidb64>/<token>/", PasswordResetConfirmTemplateView.as_view(), name="password_reset_confirm_template"),
    
    # Success pages
    path("registration-success/", RegistrationSuccessView.as_view(), name="registration_success"),
    path("password-reset/success/", PasswordResetSuccessView.as_view(), name="password_reset_success"),
]
