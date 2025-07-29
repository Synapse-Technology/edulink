from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.shortcuts import render, redirect
from django.views import View
from django.views.generic import TemplateView
from django.db import transaction
from security.utils import ThreatDetector
from security.models import SecurityEvent, FailedLoginAttempt, AuditLog
from users.roles import RoleChoices
from .serializers import (
    EmployerRegistrationSerializer,
    InstitutionRegistrationSerializer,
    StudentRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    InviteSerializer,
    ChangePasswordSerializer,
    TwoFALoginSerializer,
    VerifyOTPSerializer,
)
from authentication.models import Invite
from .permissions import IsStudent, IsEmployer, IsInstitution, IsAdmin

User = get_user_model()


class PasswordResetConfirmTemplateView(View):
    def get(self, request, uidb64, token):
        context = {
            "uidb64": uidb64,
            "token": token,
        }
        return render(request, "password_reset_confirm.html", context)

    def post(self, request, uidb64, token):
        new_password = request.POST.get("new_password")
        confirm_password = request.POST.get("confirm_password")

        if new_password != confirm_password:
            return render(
                request,
                "password_reset_confirm.html",
                {
                    "error": {
                        "password_mismatch": ["The two password fields didn't match."]
                    },
                    "uidb64": uidb64,
                    "token": token,
                },
            )

        data = {
            "uidb64": uidb64,
            "token": token,
            "new_password": new_password,
        }

        serializer = PasswordResetConfirmSerializer(data=data)

        if serializer.is_valid():
            serializer.save()
            return redirect("password_reset_success")

        return render(
            request,
            "password_reset_confirm.html",
            {
                "error": serializer.errors,
                "uidb64": uidb64,
                "token": token,
            },
        )


class InviteRegisterTemplateView(View):
    def get(self, request):
        token = request.GET.get("token")
        context = {"invite_token": token}

        try:
            invite = Invite.objects.get(token=token, is_used=False)  # type: ignore[attr-defined]
            context["email"] = invite.email
            context["role"] = invite.role  # ✅ include role for conditional form fields
        except Invite.DoesNotExist:  # type: ignore[attr-defined]
            context["error"] = {"invite_token": "Invalid or expired invitation link."}

        return render(request, "invite_register.html", context)

    def post(self, request):
        # Basic shared data
        data = {
            "invite_token": request.POST.get("invite_token"),
            "email": request.POST.get("email"),
            "password": request.POST.get("password"),
            "phone_number": request.POST.get("phone_number"),
            "national_id": request.POST.get("national_id"),
        }

        # Get invite to determine role-specific fields
        try:
            invite = Invite.objects.get(token=data["invite_token"], is_used=False)  # type: ignore[attr-defined]
            role = invite.role
        except Invite.DoesNotExist:  # type: ignore[attr-defined]
            return render(
                request,
                "invite_register.html",
                {
                    "error": {"invite_token": "Invalid or expired invitation token."},
                    **data,
                },
            )

        # Define required fields for each role
        required_fields = ["email", "password", "phone_number"]
        if role == "institution_admin":
            data.update(
                {
                    "first_name": request.POST.get("first_name"),
                    "last_name": request.POST.get("last_name"),
                    "institution_name": request.POST.get("institution_name"),
                    "institution_type": request.POST.get("institution_type"),
                    "registration_number": request.POST.get("registration_number"),
                    "address": request.POST.get("address"),
                    "website": request.POST.get("website"),
                    "position": request.POST.get("position"),
                }
            )
            required_fields += [
                "first_name",
                "last_name",
                "institution_name",
                "institution_type",
                "registration_number",
                "address",
            ]
            serializer_class = InstitutionRegistrationSerializer
        elif role == "employer":
            data.update(
                {
                    "first_name": request.POST.get("first_name"),
                    "last_name": request.POST.get("last_name"),
                    "company_name": request.POST.get("company_name"),
                    "industry": request.POST.get("industry"),
                    "company_size": request.POST.get("company_size"),
                    "location": request.POST.get("location"),
                    "website": request.POST.get("website"),
                    "department": request.POST.get("department"),
                    "position": request.POST.get("position"),
                }
            )
            required_fields += [
                "first_name",
                "last_name",
                "company_name",
                "industry",
                "company_size",
                "location",
            ]
            serializer_class = EmployerRegistrationSerializer
        else:
            return render(
                request,
                "invite_register.html",
                {
                    "error": {"role": "Invalid role for invited registration."},
                    **data,
                    "role": role,
                },
            )

        # Pre-validate required fields
        missing = [field for field in required_fields if not data.get(field)]
        if missing:
            return render(
                request,
                "invite_register.html",
                {
                    "error": {
                        "missing_fields": f"Please fill in all required fields: {', '.join(missing)}."
                    },
                    **data,
                    "role": role,
                },
            )

        serializer = serializer_class(data=data)
        if serializer.is_valid():
            serializer.save()
            invite.is_used = True
            invite.save()
            return redirect("registration_success")

        return render(
            request,
            "invite_register.html",
            {"error": serializer.errors, **data, "role": role},
        )


class StudentRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = StudentRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():  # type: ignore[attr-defined]
                    user = serializer.save()
                    return Response(
                        {
                            "message": "Registration successful. Please check your email to verify your account.",
                            "user": {
                                "email": user.email,  # type: ignore[attr-defined]
                                "role": "student",
                            },
                        },
                        status=status.HTTP_201_CREATED,
                    )
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        # Initialize threat detector
        threat_detector = ThreatDetector()
        
        # Get client IP
        client_ip = self.get_client_ip(request)
        
        # Check for brute force attempts before processing login
        email = request.data.get('email', '')
        if threat_detector.check_brute_force(email, client_ip):
            # Log security event for brute force attempt
            SecurityEvent.objects.create(
                event_type='brute_force_attempt',
                severity='high',
                ip_address=client_ip,
                description=f'Brute force login attempt detected for email: {email}',
                metadata={
                    'email': email,
                    'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    'detection_method': 'brute_force_threshold'
                }
            )
            return Response(
                {'error': 'Too many failed login attempts. Please try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Process normal login
        response = super().post(request, *args, **kwargs)
        
        # If login was successful, log security event
        if response.status_code == 200:
            try:
                user = User.objects.get(email=email)
                SecurityEvent.objects.create(
                    user=user,
                    event_type='user_login',
                    severity='info',
                    ip_address=client_ip,
                    description=f'Successful login for user: {email}',
                    metadata={
                        'login_method': 'jwt_token',
                        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                        'session_key': request.session.session_key
                    }
                )
            except User.DoesNotExist:
                pass
        
        return response
    
    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PasswordResetRequestView(APIView):  # type: ignore[attr-defined]
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]  # type: ignore[attr-defined]
            try:
                user = User.objects.get(email=email)
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

                send_mail(
                    "Password Reset Request",
                    f"Click the following link to reset your password: {reset_link}",
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
                return Response(
                    {"message": "Password reset link has been sent to your email."},
                    status=status.HTTP_200_OK,
                )
            except User.DoesNotExist:  # type: ignore[attr-defined]
                return Response(
                    {
                        "message": "If an account exists with this email, you will receive a password reset link."
                    },
                    status=status.HTTP_200_OK,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InviteCreateView(generics.CreateAPIView):
    queryset = Invite.objects.all()  # type: ignore[attr-defined]
    serializer_class = InviteSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class InviteRegisterView(APIView):
    permission_classes = [AllowAny]
    
    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def post(self, request):
        invite_token = request.data.get("invite_token")
        if not invite_token:
            return Response({"invite_token": "This field is required."}, status=400)

        try:
            invite = Invite.objects.get(token=invite_token, is_used=False)  # type: ignore[attr-defined]
        except Invite.DoesNotExist:  # type: ignore[attr-defined]
            return Response({"invite_token": "Invalid or used token."}, status=400)

        role = invite.role

        # Dynamically choose serializer based on role
        if role == RoleChoices.INSTITUTION_ADMIN:
            serializer_class = InstitutionRegistrationSerializer
        elif role == RoleChoices.EMPLOYER:
            serializer_class = EmployerRegistrationSerializer
        else:
            return Response(
                {"detail": "Invalid role for invited registration."}, status=400
            )

        serializer = serializer_class(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Mark invite as used
            invite.is_used = True
            invite.save()

            return Response(
                {
                    "message": f"{role.replace('_', ' ').title()} registered successfully.",
                    "user": {"email": user.email, "role": role},  # type: ignore[attr-defined]
                },
                status=201,
            )

        return Response(serializer.errors, status=400)

class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            client_ip = self.get_client_ip(request)
            
            if user.check_password(serializer.validated_data['old_password']):
                user.set_password(serializer.validated_data['new_password'])
                user.save()
                
                # Log security event for password change
                SecurityEvent.objects.create(
                    event_type='password_change',
                    severity='medium',
                    description=f'User {user.email} changed their password',
                    user=user,
                    ip_address=client_ip,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    metadata={
                        'change_method': 'authenticated_user',
                        'user_agent': request.META.get('HTTP_USER_AGENT', '')
                    }
                )
                
                # Create audit log
                AuditLog.objects.create(
                    action='password_change',
                    user=user,
                    resource_type='User',
                    resource_id=str(user.pk),
                    description=f'User {user.email} changed their password',
                    ip_address=client_ip,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    metadata={
                        'change_method': 'authenticated_user'
                    }
                )
                
                return Response({
                    'message': 'Password changed successfully.'
                }, status=status.HTTP_200_OK)
            else:
                # Log failed password change attempt
                SecurityEvent.objects.create(
                    event_type='failed_password_change',
                    severity='medium',
                    description=f'Failed password change attempt for user {user.email} - incorrect current password',
                    user=user,
                    ip_address=client_ip,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    metadata={
                        'failure_reason': 'incorrect_current_password',
                        'user_agent': request.META.get('HTTP_USER_AGENT', '')
                    }
                )
                
                return Response({
                    'error': 'Current password is incorrect.'
                }, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


# Login endpoint


@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# Public: Request a password reset


class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"detail": "Password reset link sent."}, status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Public: Reset password with token


class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]

    def post(self, request, uidb64, token):
        data = {
            "uidb64": uidb64,
            "token": token,
            "new_password": request.data.get("new_password"),
        }
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"detail": "Password has been reset."}, status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Authenticated users only: Update their own password


class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# STUDENT-only: Submit an application


class SubmitApplicationView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        return Response({"message": "Application submitted!"})


# STUDENT-only: View their own applications


class ViewOwnApplicationsView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        return Response({"applications": ["Internship 1", "Internship 2"]})


# EMPLOYER-only: Create an internship


class CreateInternshipView(APIView):
    permission_classes = [IsAuthenticated, IsEmployer]

    def post(self, request):
        return Response({"message": "Internship created!"})


# EMPLOYER-only: View applications to their internships


class ViewOwnInternshipApplicationsView(APIView):
    permission_classes = [IsAuthenticated, IsEmployer]

    def get(self, request):
        return Response({"applications": ["John Doe", "Jane Doe"]})


# INSTITUTION ADMIN-only: View institution's registered students


class ViewInstitutionStudentsView(APIView):
    permission_classes = [IsAuthenticated, IsInstitution]

    def get(self, request):
        return Response({"students": ["Alice", "Bob"]})


# INSTITUTION ADMIN-only: Generate analytics reports


class GenerateAnalyticsReportView(APIView):
    permission_classes = [IsAuthenticated, IsInstitution]

    def get(self, request):
        return Response({"report": "Student placement analytics"})


# ADMIN-only: View all users (SuperAdmin)


class ViewAllUsersView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({"users": ["Admin", "Student", "Employer", "Institution"]})


class RegistrationSuccessView(TemplateView):
    template_name = "registration_success.html"


class PasswordResetSuccessView(TemplateView):
    template_name = "password_reset_success.html"


class VerifyEmailView(View):
    def get(self, request, uidb64, token):
        client_ip = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):  # type: ignore[attr-defined]
            user = None
            
        if user is not None and default_token_generator.check_token(user, token):
            user.is_email_verified = True  # type: ignore[attr-defined]
            user.save()
            
            # Log successful email verification
            SecurityEvent.objects.create(
                event_type='email_verification_success',
                severity='low',
                description=f'Email verification successful for user {user.email}',
                user=user,
                ip_address=client_ip,
                user_agent=user_agent,
                metadata={
                    'email': user.email,
                    'verification_method': 'email_link'
                }
            )
            
            # Create audit log
            AuditLog.objects.create(
                action='email_verification_success',
                user=user,
                resource_type='User',
                resource_id=str(user.pk),
                description=f'Email verification successful for user {user.email}',
                ip_address=client_ip,
                user_agent=user_agent,
                metadata={
                    'email': user.email,
                    'verification_method': 'email_link'
                }
            )
            
            # Get first name for personalization
            first_name = user.email.split("@")[0]  # type: ignore[attr-defined]
            # type: ignore[attr-defined]
            if (
                user.profile  # type: ignore[attr-defined]
                and hasattr(user.profile, "first_name")  # type: ignore[attr-defined]
                and user.profile.first_name  # type: ignore[attr-defined]
            ):
                first_name = user.profile.first_name  # type: ignore[attr-defined]
            return render(request, "email_verified.html", {"first_name": first_name})
        else:
            # Log failed email verification
            SecurityEvent.objects.create(
                event_type='email_verification_failed',
                severity='medium',
                description=f'Failed email verification attempt - invalid token or user',
                user=user if user else None,
                ip_address=client_ip,
                user_agent=user_agent,
                metadata={
                    'uid': uidb64,
                    'failure_reason': 'invalid_token_or_user'
                }
            )
            return render(request, "email_verification_failed.html")
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
