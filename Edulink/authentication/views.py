from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.shortcuts import render, redirect
from django.views import View
from django.views.generic import TemplateView
from django.db import transaction, models
from django.core.exceptions import ValidationError
from security.utils import ThreatDetector
from security.models import SecurityEvent, FailedLoginAttempt, AuditLog
from users.roles import RoleChoices
from application.validators import RegistrationValidator
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

from rest_framework.decorators import api_view, permission_classes
from django.utils import timezone
from django.middleware.csrf import get_token
from authentication.models import Invite
from users.models import StudentProfile
from institutions.models import Institution, UniversityRegistrationCode, CodeUsageLog
from .permissions import IsStudent, IsEmployer, IsInstitution, IsAdmin
import logging
import json

User = get_user_model()


class CSRFTokenView(APIView):
    """View to get CSRF token for frontend authentication."""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Return CSRF token."""
        csrf_token = get_token(request)
        return Response({'csrfToken': csrf_token})


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

        # Debug: Log received data
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Registration attempt for role {role}:")
        logger.info(f"Received data: {data}")
        logger.info(f"Required fields: {required_fields}")
        
        # Pre-validate required fields
        missing = [field for field in required_fields if not data.get(field)]
        if missing:
            logger.warning(f"Missing required fields: {missing}")
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

        # Validate registration data based on role
        try:
            if role == "institution_admin":
                institution_data = {
                    'name': data.get('institution_name'),
                    'institution_type': data.get('institution_type'),
                    'registration_number': data.get('registration_number'),
                    'website': data.get('website')
                }
                RegistrationValidator.validate_institution_registration(institution_data)
            elif role == "employer":
                company_data = {
                    'company_name': data.get('company_name'),
                    'industry': data.get('industry'),
                    'company_size': data.get('company_size'),
                    'website': data.get('website')
                }
                RegistrationValidator.validate_employer_registration(company_data)
        except ValidationError as e:
            return render(
                request,
                "invite_register.html",
                {
                    "error": {"validation": e.messages if hasattr(e, 'messages') else [str(e)]},
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
    """
    Unified student registration endpoint that handles all registration methods.
    Supports university code and university search registration with automatic method detection.
    """
    permission_classes = [AllowAny]
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def post(self, request):
        """
        Handle student registration with automatic method detection or explicit method specification.
        """
        try:
            # Auto-detect registration method if not explicitly provided
            if 'registration_method' not in request.data:
                request.data['registration_method'] = self._detect_registration_method(request.data)
            
            from .serializers import UnifiedStudentRegistrationSerializer
            serializer = UnifiedStudentRegistrationSerializer(
                data=request.data, 
                context={'request': request}
            )
            
            if serializer.is_valid():
                with transaction.atomic():
                    user = serializer.save()
                    
                    # Log successful registration
                    logging.getLogger(__name__).info(
                        f"Student registration successful: {user.email} "
                        f"using method {request.data.get('registration_method')}"
                    )
                    
                    # Determine response data based on registration method
                    response_data = self._build_response_data(user, request.data.get('registration_method'))
                    
                    return Response({
                        'success': True,
                        'message': 'Registration completed successfully! Please check your email for verification.',
                        'data': response_data
                    }, status=status.HTTP_201_CREATED)
            
            else:
                # Log validation errors
                logging.getLogger(__name__).warning(
                    f"Student registration validation failed: {serializer.errors} "
                    f"for email {request.data.get('email')}"
                )
                
                return Response({
                    'success': False,
                    'message': 'Registration failed due to validation errors',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            # Log unexpected errors
            logging.getLogger(__name__).error(
                f"Unexpected error during student registration: {str(e)} "
                f"for email {request.data.get('email')}"
            )
            
            # Log security event for unexpected errors
            SecurityEvent.objects.create(
                event_type='registration_system_error',
                severity='high',
                description=f'Unexpected error during unified registration: {str(e)}',
                user=None,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                metadata={
                    'error': str(e),
                    'registration_method': request.data.get('registration_method'),
                    'university_code': request.data.get('university_code'),
                    'institution_name': request.data.get('institution_name'),
                    'email': request.data.get('email')
                }
            )
            
            return Response({
                'success': False,
                'message': 'An unexpected error occurred during registration',
                'error': 'Please try again later or contact support'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _detect_registration_method(self, data):
        """
        Auto-detect registration method based on provided data.
        """
        if data.get('university_code'):
            return 'university_code'
        elif data.get('institution_name'):
            return 'university_search'
        else:
            # Default to university_code if neither is clearly specified
            return 'university_code'
    
    def _build_response_data(self, user, registration_method):
        """
        Build response data based on registration method.
        """
        base_data = {
            'user_id': user.id,
            'email': user.email,
            'student_id': user.student_profile.id,
            'institution': user.student_profile.institution.name,
            'registration_method': registration_method
        }
        
        if registration_method == 'university_code':
            base_data.update({
                'university_verified': user.student_profile.university_verified,
                'verification_required': not user.student_profile.university_verified,
                'university_code_used': user.student_profile.university_code_used
            })
        elif registration_method == 'university_search':
            base_data.update({
                'university_verified': user.student_profile.university_verified,
                'registration_number': user.student_profile.registration_number
            })
        
        return base_data


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

        # Validate registration data based on role
        try:
            if role == RoleChoices.INSTITUTION_ADMIN:
                institution_data = {
                    'name': request.data.get('institution_name'),  # Map institution_name to name for validation
                    'institution_type': request.data.get('institution_type'),
                    'registration_number': request.data.get('registration_number'),
                    'website': request.data.get('website')
                }
                RegistrationValidator.validate_institution_registration(institution_data)
            elif role == RoleChoices.EMPLOYER:
                company_data = {
                    'company_name': request.data.get('company_name'),
                    'industry': request.data.get('industry'),
                    'company_size': request.data.get('company_size'),
                    'website': request.data.get('website')
                }
                RegistrationValidator.validate_employer_registration(company_data)
        except ValidationError as e:
            return Response(
                {"validation_errors": e.messages if hasattr(e, 'messages') else [str(e)]},
                status=400
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


# Code-based registration views
logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def code_based_student_registration(request):
    """
    Register a student using university-generated registration code
    
    This endpoint handles student registration using the EDUJKUAT24-XX format codes
    generated by universities. It supports both API verification and code-based verification.
    """
    try:
        from .serializers import CodeBasedStudentRegistrationSerializer
        serializer = CodeBasedStudentRegistrationSerializer(
            data=request.data, 
            context={'request': request}
        )
        
        if serializer.is_valid():
            with transaction.atomic():
                student_profile = serializer.save()
                
                # Log successful registration event
                logger.info(
                    f"Student registration successful: {student_profile.user.email} "
                    f"using code {request.data.get('university_code')}"
                )
                
                return Response({
                    'success': True,
                    'message': 'Registration completed successfully',
                    'data': {
                        'user_id': student_profile.user.id,
                        'email': student_profile.user.email,
                        'student_id': student_profile.id,
                        'institution': student_profile.institution.name,
                        'university_verified': student_profile.university_verified,
                        'verification_required': not student_profile.university_verified
                    }
                }, status=status.HTTP_201_CREATED)
        
        else:
            # Log validation errors
            logger.warning(
                f"Student registration validation failed: {serializer.errors} "
                f"for email {request.data.get('email')}"
            )
            
            return Response({
                'success': False,
                'message': 'Registration failed due to validation errors',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        # Log unexpected errors
        logger.error(
            f"Unexpected error during student registration: {str(e)} "
            f"for email {request.data.get('email')}"
        )
        
        # Log security event for unexpected errors
        SecurityEvent.objects.create(
            event_type='registration_system_error',
            severity='high',
            description=f'Unexpected error during code-based registration: {str(e)}',
            user=None,
            ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'error': str(e),
                'university_code': request.data.get('university_code'),
                'email': request.data.get('email')
            }
        )
        
        return Response({
            'success': False,
            'message': 'An unexpected error occurred during registration',
            'error': 'Please try again later or contact support'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_university_code(request):
    """
    Validate a university registration code without creating an account
    
    This endpoint allows users to check if their university code is valid
    before proceeding with full registration.
    """
    university_code = request.data.get('university_code', '').upper()
    
    if not university_code:
        return Response({
            'success': False,
            'message': 'University code is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        code = UniversityRegistrationCode.objects.get(code=university_code)
        is_valid, error_message = code.is_valid()
        
        if is_valid:
            return Response({
                'success': True,
                'message': 'University code is valid',
                'data': {
                    'institution_name': code.institution.name,
                    'institution_type': code.institution.institution_type,
                    'code_year': code.year,
                    'remaining_uses': code.max_uses - code.current_uses if code.max_uses else None,
                    'expires_at': code.expires_at.isoformat() if code.expires_at else None
                }
            }, status=status.HTTP_200_OK)
        else:
            # Log invalid code attempt
            CodeUsageLog.objects.create(
                registration_code=code,
                email=request.data.get('email', ''),
                usage_status='validation_failed',
                ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                error_message=error_message
            )
            
            return Response({
                'success': False,
                'message': error_message
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except UniversityRegistrationCode.DoesNotExist:
        # Log invalid code attempt
        CodeUsageLog.objects.create(
            registration_code=None,
            email=request.data.get('email', ''),
            usage_status='invalid_code',
            ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            error_message='University code does not exist'
        )
        
        return Response({
            'success': False,
            'message': 'Invalid university code'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        logger.error(f"Error validating university code {university_code}: {str(e)}")
        
        return Response({
            'success': False,
            'message': 'An error occurred while validating the code'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_code_usage_stats(request, code):
    """
    Get usage statistics for a university registration code
    
    This endpoint provides analytics for institution administrators
    to track how their codes are being used.
    """
    try:
        registration_code = UniversityRegistrationCode.objects.get(code=code.upper())
        
        # Get usage logs
        usage_logs = CodeUsageLog.objects.filter(registration_code=registration_code)
        
        # Calculate statistics
        total_attempts = usage_logs.count()
        successful_registrations = usage_logs.filter(usage_status='success').count()
        failed_attempts = usage_logs.exclude(usage_status='success').count()
        
        # Get recent activity (last 7 days)
        recent_activity = usage_logs.filter(
            created_at__gte=timezone.now() - timezone.timedelta(days=7)
        ).count()
        
        # Get failure reasons
        failure_reasons = usage_logs.exclude(usage_status='success').values(
            'usage_status'
        ).annotate(
            count=models.Count('usage_status')
        ).order_by('-count')
        
        return Response({
            'success': True,
            'data': {
                'code': registration_code.code,
                'institution': registration_code.institution.name,
                'is_active': registration_code.is_active,
                'created_at': registration_code.created_at.isoformat(),
                'expires_at': registration_code.expires_at.isoformat() if registration_code.expires_at else None,
                'max_uses': registration_code.max_uses,
                'current_uses': registration_code.current_uses,
                'remaining_uses': registration_code.max_uses - registration_code.current_uses if registration_code.max_uses else None,
                'statistics': {
                    'total_attempts': total_attempts,
                    'successful_registrations': successful_registrations,
                    'failed_attempts': failed_attempts,
                    'success_rate': round((successful_registrations / total_attempts * 100), 2) if total_attempts > 0 else 0,
                    'recent_activity_7_days': recent_activity,
                    'failure_reasons': list(failure_reasons)
                }
            }
        }, status=status.HTTP_200_OK)
    
    except UniversityRegistrationCode.DoesNotExist:
        return Response({
            'success': False,
            'message': 'University code not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        logger.error(f"Error getting code usage stats for {code}: {str(e)}")
        
        return Response({
            'success': False,
            'message': 'An error occurred while retrieving statistics'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
