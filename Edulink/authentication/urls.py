from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenBlacklistView,
)
from .views import (
    InviteRegisterTemplateView,
    CustomTokenObtainPairView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    ChangePasswordView,
    InviteCreateView,
    TwoFALoginView,
    VerifyOTPView,
    StudentRegistrationView,
    PasswordResetConfirmTemplateView,
    RegistrationSuccessView,
    PasswordResetSuccessView,
    VerifyEmailView,
)
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.views.generic import TemplateView
from django.views.generic import View

urlpatterns = [
    path("register/", StudentRegistrationView.as_view(), name="student-register"),
    path("invite/", InviteCreateView.as_view(), name="send-invite"),
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", TokenBlacklistView.as_view(), name="token_blacklist"),
    # 2FA: Step 1 - Login to receive OTP
    path("2fa/login/", TwoFALoginView.as_view(), name="2fa_login"),
    # 2FA: Step 2 - Verify OTP
    path("2fa/verify/", VerifyOTPView.as_view(), name="2fa_verify"),
    # Password reset
    path("password-reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path(
        "reset-password-confirm/<uidb64>/<token>/",
        PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    # Change password for logged-in user
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    # Template-based registration and password reset
    path(
        "invite-register/",
        InviteRegisterTemplateView.as_view(),
        name="invite_register_template",
    ),
    path(
        "reset-password/<uidb64>/<token>/",
        PasswordResetConfirmTemplateView.as_view(),
        name="password_reset_confirm_template",
    ),
    # Success pages
    path(
        "registration-success/",
        RegistrationSuccessView.as_view(),
        name="registration_success",
    ),
    path(
        "password-reset/success/",
        PasswordResetSuccessView.as_view(),
        name="password_reset_success",
    ),
    path(
        "verify-email/<uidb64>/<token>/", VerifyEmailView.as_view(), name="verify_email"
    ),
]

def web_login_view(request):
    if request.method == 'POST':
        email = request.POST['email']
        password = request.POST['password']
        user = authenticate(request, email=email, password=password)
        if user is not None:
            login(request, user)
            return redirect('dashboard')  # or your protected page
        else:
            return render(request, 'authentication/web_login.html', {'error': 'Invalid credentials'})
    return render(request, 'authentication/web_login.html')

def web_logout_view(request):
    logout(request)
    return redirect('web_login')

urlpatterns += [
    path('web-login/', web_login_view, name='web_login'),
    path('web-logout/', web_logout_view, name='web_logout'),
]
