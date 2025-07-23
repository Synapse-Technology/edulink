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
from security.utils import ThreatDetector
from security.models import SecurityEvent, FailedLoginAttempt, AuditLog
from .serializers import (
    StudentRegistrationSerializer,
    LoginSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    PasswordChangeSerializer
)
from users.models import UserRole, StudentProfile
from institutions.models import Institution
from django.db import transaction

User = get_user_model()

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
                return Response({
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
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
                return Response({
                    'message': 'Password reset link has been sent to your email.'
                }, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({
                    'message': 'If an account exists with this email, you will receive a password reset link.'
                }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(APIView):
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
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            client_ip = self.get_client_ip(request)
            
            try:
                uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
                user = User.objects.get(pk=uid)
                
                if default_token_generator.check_token(user, serializer.validated_data['token']):
                    user.set_password(serializer.validated_data['new_password'])
                    user.save()
                    
                    # Log security event for password reset
                    SecurityEvent.objects.create(
                        event_type='password_reset',
                        severity='medium',
                        description=f'User {user.email} reset their password via email token',
                        user=user,
                        ip_address=client_ip,
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        metadata={
                            'reset_method': 'email_token',
                            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                            'uid': serializer.validated_data['uid']
                        }
                    )
                    
                    # Create audit log
                    AuditLog.objects.create(
                        action='password_reset',
                        user=user,
                        model_name='User',
                        object_id=str(user.pk),
                        description=f'User {user.email} reset their password via email token',
                        ip_address=client_ip,
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        metadata={
                            'reset_method': 'email_token'
                        }
                    )
                    
                    return Response({
                        'message': 'Password has been reset successfully.'
                    }, status=status.HTTP_200_OK)
                else:
                    # Log failed password reset attempt
                    SecurityEvent.objects.create(
                        event_type='failed_password_reset',
                        severity='medium',
                        description=f'Failed password reset attempt - invalid token',
                        user=user,
                        ip_address=client_ip,
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        metadata={
                            'failure_reason': 'invalid_token',
                            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                            'uid': serializer.validated_data['uid']
                        }
                    )
                    
                    return Response({
                        'error': 'Invalid token.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except (TypeError, ValueError, User.DoesNotExist):
                # Log failed password reset attempt with invalid user
                SecurityEvent.objects.create(
                    event_type='failed_password_reset',
                    severity='medium',
                    description=f'Failed password reset attempt - invalid user',
                    ip_address=client_ip,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    metadata={
                        'failure_reason': 'invalid_user',
                        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                        'uid': serializer.validated_data.get('uid', 'unknown')
                    }
                )
                
                return Response({
                    'error': 'Invalid user.'
                }, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
                    model_name='User',
                    object_id=str(user.pk),
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
