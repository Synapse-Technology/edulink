from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenBlacklistView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction

from .serializers import (
    StudentRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    InviteSerializer,
    InvitedUserRegisterSerializer,
    RegisterSerializer,
    PasswordChangeSerializer,
    TwoFALoginSerializer,
    VerifyOTPSerializer,
)

from users.models import UserRole, StudentProfile
from institutions.models import Institution
from .models import Invite
from .permissions import IsStudent, IsEmployer, IsInstitution, IsAdmin

from security.models import LoginHistory, SecurityLog
from security.views import get_client_ip

User = get_user_model()


# ------------------------
# ✅ Student Registration
# ------------------------
class StudentRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = StudentRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    user = serializer.save()
                    return Response({
                        'message': 'Registration successful. Please check your email to verify your account.',
                        'user': {
                            'email': user.email,
                            'role': 'student'
                        }
                    }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ------------------------
# ✅ LOGIN + LOGGING EVENTS
# ------------------------
class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # If login successful
        if response.status_code == 200:
            user = User.objects.get(email=request.data.get("email"))
            ip = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')

            LoginHistory.objects.create(
                user=user,
                ip_address=ip,
                user_agent=user_agent
            )

            SecurityLog.objects.create(
                user=user,
                action='LOGIN',
                description='User logged in successfully',
                ip_address=ip
            )

        return response

# ------------------------
# ✅ LOGOUT
# ------------------------
class CustomLogoutView(TokenBlacklistView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # Only log if the token was successfully blacklisted
        if response.status_code == 205 and request.user.is_authenticated:
            SecurityLog.objects.create(
                user=request.user,
                action="LOGOUT",
                description="User logged out and token blacklisted.",
                ip_address=get_client_ip(request)
            )

        return response
        

# ------------------------
# ✅ Password Reset Flow
# ------------------------
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

                send_mail(
                    'Password Reset Request',
                    f'Click the following link to reset your password: {reset_link}',
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )

                # Log request
                SecurityLog.objects.create(
                    user=user,
                    action="PASSWORD_RESET_REQUEST",
                    description="User requested password reset",
                    ip_address=get_client_ip(request)
                )

                return Response({'message': 'Password reset link sent.'}, status=200)
            except User.DoesNotExist:
                return Response({'message': 'If an account exists with this email, you will receive a reset link.'}, status=200)

        return Response(serializer.errors, status=400)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            try:
                uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
                user = User.objects.get(pk=uid)
                if default_token_generator.check_token(user, serializer.validated_data['token']):
                    user.set_password(serializer.validated_data['new_password'])
                    user.save()

                    # Log password reset
                    SecurityLog.objects.create(
                        user=user,
                        action="PASSWORD_RESET",
                        description="User successfully reset password",
                        ip_address=get_client_ip(request)
                    )

                    return Response({'message': 'Password has been reset successfully.'}, status=200)
                return Response({'error': 'Invalid token.'}, status=400)
            except (TypeError, ValueError, User.DoesNotExist):
                return Response({'error': 'Invalid user.'}, status=400)

        return Response(serializer.errors, status=400)


# ------------------------
# ✅ Change Password
# ------------------------
class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()

            SecurityLog.objects.create(
                user=request.user,
                action='PASSWORD_CHANGE',
                description='User changed their password',
                ip_address=get_client_ip(request)
            )

            return Response({'message': 'Password changed successfully.'}, status=200)

        return Response(serializer.errors, status=400)


# ------------------------
# ✅ Invite Registration
# ------------------------
class InviteCreateView(generics.CreateAPIView):
    queryset = Invite.objects.all()
    serializer_class = InviteSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class InviteRegisterView(generics.CreateAPIView):
    serializer_class = InvitedUserRegisterSerializer
    permission_classes = [AllowAny]


# ------------------------
# ✅ 2FA Support
# ------------------------
class TwoFALoginView(generics.GenericAPIView):
    serializer_class = TwoFALoginSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=200)
        return Response(serializer.errors, status=400)


class VerifyOTPView(generics.GenericAPIView):
    serializer_class = VerifyOTPSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=200)
        return Response(serializer.errors, status=400)


# ------------------------
# ✅ Role-Based Access Views (RBAC)
# ------------------------
class SubmitApplicationView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        return Response({"message": "Application submitted!"})


class ViewOwnApplicationsView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        return Response({"applications": ["Internship 1", "Internship 2"]})


class CreateInternshipView(APIView):
    permission_classes = [IsAuthenticated, IsEmployer]

    def post(self, request):
        return Response({"message": "Internship created!"})


class ViewOwnInternshipApplicationsView(APIView):
    permission_classes = [IsAuthenticated, IsEmployer]

    def get(self, request):
        return Response({"applications": ["John Doe", "Jane Doe"]})


class ViewInstitutionStudentsView(APIView):
    permission_classes = [IsAuthenticated, IsInstitution]

    def get(self, request):
        return Response({"students": ["Alice", "Bob"]})


class GenerateAnalyticsReportView(APIView):
    permission_classes = [IsAuthenticated, IsInstitution]

    def get(self, request):
        return Response({"report": "Student placement analytics"})


class ViewAllUsersView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({"users": ["Admin", "Student", "Employer", "Institution"]})
