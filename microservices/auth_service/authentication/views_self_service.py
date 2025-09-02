from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.conf import settings
from django.db import transaction
import logging
import requests
import uuid

from .models import User, EmailOTP, RoleChoices
from .serializers_self_service import (
    StudentSelfRegistrationSerializer,
    InstitutionAdminSelfRegistrationSerializer,
    EmployerSelfRegistrationSerializer,
    RegistrationStatusSerializer
)
from .tasks import (
    send_email_task,
    log_security_event,
    sync_user_profile,
    notify_user_service
)

logger = logging.getLogger(__name__)


class StudentSelfRegistrationView(APIView):
    """
    Self-service registration for students.
    Supports university code and institution search methods.
    """
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = StudentSelfRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    # Create user
                    user = serializer.save()
                    
                    # Create registration request
                    registration_request = self._create_registration_request(
                        user, 
                        user._student_data,
                        request
                    )
                    
                    # Send verification email
                    self._send_verification_email(user)
                    
                    # Log security event
                    log_security_event.delay(
                        user_id=str(user.id),
                        event_type='student_registration_initiated',
                        ip_address=request.META.get('REMOTE_ADDR'),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        metadata={
                            'registration_method': user._student_data['registration_method'],
                            'institution_id': user._student_data['institution_data'].get('id')
                        }
                    )
                    
                    return Response({
                        'message': 'Registration initiated successfully',
                        'user_id': str(user.id),
                        'email': user.email,
                        'status': 'pending_email_verification',
                        'next_step': 'Please check your email and verify your email address',
                        'registration_request_id': registration_request.get('id') if registration_request else None
                    }, status=status.HTTP_201_CREATED)
                    
            except Exception as e:
                logger.error(f"Student registration failed: {e}")
                return Response({
                    'error': 'Registration failed. Please try again later.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _create_registration_request(self, user, student_data, request):
        """Create registration request in registration_request_service."""
        try:
            registration_service_url = getattr(settings, 'REGISTRATION_REQUEST_SERVICE_URL', 'http://localhost:8005')
            
            request_data = {
                'user_id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone_number': user.phone_number,
                'national_id': user.national_id,
                'role': user.role,
                'registration_type': 'student',
                'registration_method': student_data['registration_method'],
                'institution_data': student_data['institution_data'],
                'student_data': student_data['student_fields'],
                'verified_data': student_data.get('verified_student_data'),
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'status': 'pending_email_verification'
            }
            
            response = requests.post(
                f"{registration_service_url}/api/requests/",
                json=request_data,
                headers={
                    'Content-Type': 'application/json',
                    'X-Service-Token': getattr(settings, 'SERVICE_TOKEN', '')
                },
                timeout=10
            )
            
            if response.status_code == 201:
                return response.json()
            else:
                logger.error(f"Failed to create registration request: {response.status_code} - {response.text}")
                return None
                
        except requests.RequestException as e:
            logger.error(f"Failed to communicate with registration service: {e}")
            return None
    
    def _send_verification_email(self, user):
        """Send email verification."""
        try:
            # Create OTP
            otp = EmailOTP.objects.create(
                email=user.email,
                purpose='email_verification'
            )
            
            # Send verification email
            send_email_task.delay(
                subject='Verify Your Email - Edulink Registration',
                template='authentication/email_verification.html',
                context={
                    'user': user,
                    'otp_code': otp.code,
                    'verification_url': f"{settings.FRONTEND_URL}/verify-email?email={user.email}&code={otp.code}"
                },
                recipient_list=[user.email]
            )
            
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")


class InstitutionAdminSelfRegistrationView(APIView):
    """
    Self-service registration for institution administrators.
    Requires admin approval after email verification.
    """
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = InstitutionAdminSelfRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    # Create user
                    user = serializer.save()
                    
                    # Create registration request
                    registration_request = self._create_registration_request(
                        user,
                        user._institution_admin_data,
                        request
                    )
                    
                    # Send verification email
                    self._send_verification_email(user)
                    
                    # Notify admins about new registration
                    self._notify_admins_new_registration(user, user._institution_admin_data)
                    
                    # Log security event
                    log_security_event.delay(
                        user_id=str(user.id),
                        event_type='institution_admin_registration_initiated',
                        ip_address=request.META.get('REMOTE_ADDR'),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        metadata={
                            'institution_name': user._institution_admin_data['institution_name'],
                            'work_email': user._institution_admin_data['work_email']
                        }
                    )
                    
                    return Response({
                        'message': 'Registration submitted successfully',
                        'user_id': str(user.id),
                        'email': user.email,
                        'status': 'pending_email_verification',
                        'next_step': 'Please check your email and verify your email address. After verification, your application will be reviewed by our administrators.',
                        'registration_request_id': registration_request.get('id') if registration_request else None,
                        'estimated_review_time': '2-3 business days'
                    }, status=status.HTTP_201_CREATED)
                    
            except Exception as e:
                logger.error(f"Institution admin registration failed: {e}")
                return Response({
                    'error': 'Registration failed. Please try again later.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _create_registration_request(self, user, institution_data, request):
        """Create registration request in registration_request_service."""
        try:
            registration_service_url = getattr(settings, 'REGISTRATION_REQUEST_SERVICE_URL', 'http://localhost:8005')
            
            request_data = {
                'user_id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone_number': user.phone_number,
                'national_id': user.national_id,
                'role': user.role,
                'registration_type': 'institution_admin',
                'institution_data': institution_data,
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'status': 'pending_email_verification'
            }
            
            response = requests.post(
                f"{registration_service_url}/api/requests/",
                json=request_data,
                headers={
                    'Content-Type': 'application/json',
                    'X-Service-Token': getattr(settings, 'SERVICE_TOKEN', '')
                },
                timeout=10
            )
            
            if response.status_code == 201:
                return response.json()
            else:
                logger.error(f"Failed to create registration request: {response.status_code} - {response.text}")
                return None
                
        except requests.RequestException as e:
            logger.error(f"Failed to communicate with registration service: {e}")
            return None
    
    def _send_verification_email(self, user):
        """Send email verification."""
        try:
            # Create OTP
            otp = EmailOTP.objects.create(
                email=user.email,
                purpose='email_verification'
            )
            
            # Send verification email
            send_email_task.delay(
                subject='Verify Your Email - Edulink Institution Admin Registration',
                template='authentication/institution_admin_verification.html',
                context={
                    'user': user,
                    'otp_code': otp.code,
                    'verification_url': f"{settings.FRONTEND_URL}/verify-email?email={user.email}&code={otp.code}"
                },
                recipient_list=[user.email]
            )
            
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
    
    def _notify_admins_new_registration(self, user, institution_data):
        """Notify super admins about new institution admin registration."""
        try:
            # Get super admin emails
            super_admins = User.objects.filter(
                role=RoleChoices.SUPER_ADMIN,
                is_active=True,
                is_email_verified=True
            ).values_list('email', flat=True)
            
            if super_admins:
                send_email_task.delay(
                    subject='New Institution Admin Registration - Review Required',
                    template='authentication/admin_notification_institution.html',
                    context={
                        'user': user,
                        'institution_data': institution_data,
                        'admin_url': f"{settings.FRONTEND_URL}/admin/registrations"
                    },
                    recipient_list=list(super_admins)
                )
                
        except Exception as e:
            logger.error(f"Failed to notify admins: {e}")


class EmployerSelfRegistrationView(APIView):
    """
    Self-service registration for employers.
    Requires admin approval after email verification.
    """
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = EmployerSelfRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    # Create user
                    user = serializer.save()
                    
                    # Create registration request
                    registration_request = self._create_registration_request(
                        user,
                        user._employer_data,
                        request
                    )
                    
                    # Send verification email
                    self._send_verification_email(user)
                    
                    # Notify admins about new registration
                    self._notify_admins_new_registration(user, user._employer_data)
                    
                    # Log security event
                    log_security_event.delay(
                        user_id=str(user.id),
                        event_type='employer_registration_initiated',
                        ip_address=request.META.get('REMOTE_ADDR'),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        metadata={
                            'company_name': user._employer_data['company_name'],
                            'work_email': user._employer_data['work_email']
                        }
                    )
                    
                    return Response({
                        'message': 'Registration submitted successfully',
                        'user_id': str(user.id),
                        'email': user.email,
                        'status': 'pending_email_verification',
                        'next_step': 'Please check your email and verify your email address. After verification, your application will be reviewed by our administrators.',
                        'registration_request_id': registration_request.get('id') if registration_request else None,
                        'estimated_review_time': '2-3 business days'
                    }, status=status.HTTP_201_CREATED)
                    
            except Exception as e:
                logger.error(f"Employer registration failed: {e}")
                return Response({
                    'error': 'Registration failed. Please try again later.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _create_registration_request(self, user, employer_data, request):
        """Create registration request in registration_request_service."""
        try:
            registration_service_url = getattr(settings, 'REGISTRATION_REQUEST_SERVICE_URL', 'http://localhost:8005')
            
            request_data = {
                'user_id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone_number': user.phone_number,
                'national_id': user.national_id,
                'role': user.role,
                'registration_type': 'employer',
                'employer_data': employer_data,
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'status': 'pending_email_verification'
            }
            
            response = requests.post(
                f"{registration_service_url}/api/requests/",
                json=request_data,
                headers={
                    'Content-Type': 'application/json',
                    'X-Service-Token': getattr(settings, 'SERVICE_TOKEN', '')
                },
                timeout=10
            )
            
            if response.status_code == 201:
                return response.json()
            else:
                logger.error(f"Failed to create registration request: {response.status_code} - {response.text}")
                return None
                
        except requests.RequestException as e:
            logger.error(f"Failed to communicate with registration service: {e}")
            return None
    
    def _send_verification_email(self, user):
        """Send email verification."""
        try:
            # Create OTP
            otp = EmailOTP.objects.create(
                email=user.email,
                purpose='email_verification'
            )
            
            # Send verification email
            send_email_task.delay(
                subject='Verify Your Email - Edulink Employer Registration',
                template='authentication/employer_verification.html',
                context={
                    'user': user,
                    'otp_code': otp.code,
                    'verification_url': f"{settings.FRONTEND_URL}/verify-email?email={user.email}&code={otp.code}"
                },
                recipient_list=[user.email]
            )
            
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
    
    def _notify_admins_new_registration(self, user, employer_data):
        """Notify super admins about new employer registration."""
        try:
            # Get super admin emails
            super_admins = User.objects.filter(
                role=RoleChoices.SUPER_ADMIN,
                is_active=True,
                is_email_verified=True
            ).values_list('email', flat=True)
            
            if super_admins:
                send_email_task.delay(
                    subject='New Employer Registration - Review Required',
                    template='authentication/admin_notification_employer.html',
                    context={
                        'user': user,
                        'employer_data': employer_data,
                        'admin_url': f"{settings.FRONTEND_URL}/admin/registrations"
                    },
                    recipient_list=list(super_admins)
                )
                
        except Exception as e:
            logger.error(f"Failed to notify admins: {e}")


class RegistrationStatusView(APIView):
    """
    Check registration status for a given email.
    """
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = RegistrationStatusSerializer(data=request.data)
        
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            try:
                user = User.objects.get(email=email)
                
                # Get registration request status
                registration_status = self._get_registration_request_status(str(user.id))
                
                response_data = {
                    'email': user.email,
                    'user_id': str(user.id),
                    'role': user.role,
                    'is_active': user.is_active,
                    'is_email_verified': user.is_email_verified,
                    'date_joined': user.date_joined.isoformat(),
                    'registration_status': registration_status
                }
                
                # Add status-specific information
                if not user.is_email_verified:
                    response_data['next_step'] = 'Please verify your email address'
                    response_data['can_resend_verification'] = True
                elif not user.is_active:
                    if user.role in [RoleChoices.INSTITUTION_ADMIN, RoleChoices.EMPLOYER]:
                        response_data['next_step'] = 'Your application is under review by our administrators'
                    else:
                        response_data['next_step'] = 'Your account is inactive. Please contact support.'
                else:
                    response_data['next_step'] = 'Registration complete. You can now log in.'
                
                return Response(response_data, status=status.HTTP_200_OK)
                
            except User.DoesNotExist:
                return Response({
                    'error': 'No registration found for this email address'
                }, status=status.HTTP_404_NOT_FOUND)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _get_registration_request_status(self, user_id):
        """Get registration request status from registration service."""
        try:
            registration_service_url = getattr(settings, 'REGISTRATION_REQUEST_SERVICE_URL', 'http://localhost:8005')
            
            response = requests.get(
                f"{registration_service_url}/api/requests/by-user/{user_id}/",
                headers={
                    'X-Service-Token': getattr(settings, 'SERVICE_TOKEN', '')
                },
                timeout=5
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {'status': 'unknown', 'message': 'Unable to retrieve registration status'}
                
        except requests.RequestException:
            return {'status': 'unknown', 'message': 'Unable to retrieve registration status'}


class ResendVerificationEmailView(APIView):
    """
    Resend email verification for pending registrations.
    """
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response({
                'error': 'Email is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            
            # Check if user needs email verification
            if user.is_email_verified:
                return Response({
                    'error': 'Email is already verified'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check rate limiting (max 3 requests per hour)
            recent_otps = EmailOTP.objects.filter(
                email=email,
                purpose='email_verification',
                created_at__gte=timezone.now() - timezone.timedelta(hours=1)
            ).count()
            
            if recent_otps >= 3:
                return Response({
                    'error': 'Too many verification emails sent. Please wait before requesting another.'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            # Create new OTP
            otp = EmailOTP.objects.create(
                email=user.email,
                purpose='email_verification'
            )
            
            # Send verification email
            template_mapping = {
                RoleChoices.STUDENT: 'authentication/email_verification.html',
                RoleChoices.INSTITUTION_ADMIN: 'authentication/institution_admin_verification.html',
                RoleChoices.EMPLOYER: 'authentication/employer_verification.html'
            }
            
            template = template_mapping.get(user.role, 'authentication/email_verification.html')
            
            send_email_task.delay(
                subject='Verify Your Email - Edulink Registration',
                template=template,
                context={
                    'user': user,
                    'otp_code': otp.code,
                    'verification_url': f"{settings.FRONTEND_URL}/verify-email?email={user.email}&code={otp.code}"
                },
                recipient_list=[user.email]
            )
            
            # Log security event
            log_security_event.delay(
                user_id=str(user.id),
                event_type='verification_email_resent',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'message': 'Verification email sent successfully'
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            # Don't reveal if email exists
            return Response({
                'message': 'If the email exists and needs verification, a verification email has been sent.'
            }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def complete_email_verification(request):
    """
    Complete email verification and update registration status.
    """
    email = request.data.get('email')
    code = request.data.get('code')
    
    if not email or not code:
        return Response({
            'error': 'Email and verification code are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Verify OTP
        otp = EmailOTP.objects.get(
            email=email,
            code=code,
            purpose='email_verification'
        )
        
        if not otp.is_valid():
            if otp.is_expired():
                return Response({
                    'error': 'Verification code has expired'
                }, status=status.HTTP_400_BAD_REQUEST)
            elif otp.is_used:
                return Response({
                    'error': 'Verification code has already been used'
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'error': 'Invalid verification code'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark OTP as used
        otp.use()
        
        # Update user email verification status
        user = User.objects.get(email=email)
        user.is_email_verified = True
        user.email_verified = True
        user.save(update_fields=['is_email_verified', 'email_verified'])
        
        # Update registration request status
        _update_registration_request_status(str(user.id), 'email_verified')
        
        # Handle post-verification logic based on user role
        next_step = _handle_post_verification(user)
        
        # Log security event
        log_security_event.delay(
            user_id=str(user.id),
            event_type='email_verified',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'message': 'Email verified successfully',
            'user_id': str(user.id),
            'email': user.email,
            'role': user.role,
            'is_active': user.is_active,
            'next_step': next_step
        }, status=status.HTTP_200_OK)
        
    except EmailOTP.DoesNotExist:
        return Response({
            'error': 'Invalid verification code'
        }, status=status.HTTP_400_BAD_REQUEST)
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)


def _update_registration_request_status(user_id, status):
    """Update registration request status in registration service."""
    try:
        registration_service_url = getattr(settings, 'REGISTRATION_REQUEST_SERVICE_URL', 'http://localhost:8005')
        
        requests.patch(
            f"{registration_service_url}/api/requests/by-user/{user_id}/",
            json={'status': status},
            headers={
                'Content-Type': 'application/json',
                'X-Service-Token': getattr(settings, 'SERVICE_TOKEN', '')
            },
            timeout=5
        )
        
    except requests.RequestException as e:
        logger.error(f"Failed to update registration request status: {e}")


def _handle_post_verification(user):
    """Handle post-verification logic based on user role."""
    if user.role == RoleChoices.STUDENT:
        # Students can be activated immediately after email verification
        user.is_active = True
        user.save(update_fields=['is_active'])
        
        # Update registration request status
        _update_registration_request_status(str(user.id), 'approved')
        
        # Create user profile
        _create_user_profile(user)
        
        return 'Registration complete! You can now log in to your account.'
    
    elif user.role in [RoleChoices.INSTITUTION_ADMIN, RoleChoices.EMPLOYER]:
        # Institution admins and employers need manual approval
        _update_registration_request_status(str(user.id), 'pending_admin_review')
        
        return 'Email verified! Your application is now under review by our administrators. You will be notified once approved.'
    
    else:
        return 'Email verified! Please contact support for further assistance.'


def _create_user_profile(user):
    """Create user profile in user service."""
    try:
        # Get student data from user object (stored during registration)
        if hasattr(user, '_student_data'):
            student_data = user._student_data
        else:
            # Fallback: get from registration request service
            student_data = _get_student_data_from_registration_service(str(user.id))
        
        if student_data:
            sync_user_profile.delay(
                user_id=str(user.id),
                profile_data={
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'phone_number': user.phone_number,
                    'national_id': user.national_id,
                    'role': user.role,
                    'institution_data': student_data.get('institution_data'),
                    'student_fields': student_data.get('student_fields'),
                    'verified_data': student_data.get('verified_student_data')
                },
                action='create'
            )
            
    except Exception as e:
        logger.error(f"Failed to create user profile: {e}")


def _get_student_data_from_registration_service(user_id):
    """Get student data from registration request service."""
    try:
        registration_service_url = getattr(settings, 'REGISTRATION_REQUEST_SERVICE_URL', 'http://localhost:8005')
        
        response = requests.get(
            f"{registration_service_url}/api/requests/by-user/{user_id}/",
            headers={
                'X-Service-Token': getattr(settings, 'SERVICE_TOKEN', '')
            },
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                'institution_data': data.get('institution_data'),
                'student_fields': data.get('student_data'),
                'verified_student_data': data.get('verified_data')
            }
        
        return None
        
    except requests.RequestException:
        return None