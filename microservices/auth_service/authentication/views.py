from rest_framework import status, generics, permissions
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.db import transaction
from django.shortcuts import get_object_or_404
from datetime import timedelta
import uuid
import logging

from .models import (
    User, EmailOTP, Invite, PasswordResetToken, 
    RefreshToken as CustomRefreshToken, RoleChoices
)
from .serializers import (
     UserRegistrationSerializer, CustomTokenObtainPairSerializer,
     StudentRegistrationSerializer, EmailOTPSerializer,
     UserProfileSerializer, InviteSerializer, UserListSerializer
)
from .permissions import IsOwnerOrAdmin, IsAdminUser
from .tasks import send_email_task, log_security_event

logger = logging.getLogger(__name__)

User = get_user_model()


class UserRegistrationView(generics.CreateAPIView):
    """User registration endpoint."""
    
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def perform_create(self, serializer):
        with transaction.atomic():
            user = serializer.save()
            
            # Send email verification OTP
            otp_serializer = EmailOTPSerializer(data={
                'email': user.email,
                'purpose': 'email_verification'
            })
            if otp_serializer.is_valid():
                otp = otp_serializer.save()
                
                # Send verification email
                send_email_task.delay(
                    subject='Verify your email address',
                    template='authentication/email_verification.html',
                    context={'user': user.email, 'otp_code': otp.code},
                    recipient_list=[user.email]
                )
            
            # Log security event
            log_security_event.delay(
                user_id=str(user.id),
                event_type='user_registration',
                ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
                metadata={'role': user.role}
            )
    
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            response.data = {
                'message': 'User registered successfully. Please check your email for verification code.',
                'user_id': response.data['id']
            }
        return response


class StudentRegistrationView(APIView):
    """Enhanced student registration with profile creation."""
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = StudentRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                user = serializer.save()
                
                # Log successful registration
                logger.info(
                    f"Student registration successful: {user.email} "
                    f"using method {request.data.get('registration_method')}"
                )
                
                # Log security event
                log_security_event(
                    user_id=str(user.id),
                    event_type='student_registration',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    metadata={
                        'role': user.role,
                        'registration_method': request.data.get('registration_method')
                    }
                )
                
                return Response({
                    'success': True,
                    'message': 'Student registered successfully. Please check your email for verification code.',
                    'data': {
                        'user_id': str(user.id),
                        'email': user.email,
                        'profile_service_id': str(user.profile_service_id) if user.profile_service_id else None
                    }
                }, status=status.HTTP_201_CREATED)
        
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


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view with enhanced security."""
    
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == status.HTTP_200_OK:
            # Extract user info from response
            user_data = response.data.get('user', {})
            user_id = user_data.get('id')
            
            if user_id:
                # Log successful login
                log_security_event.delay(
                    user_id=user_id,
                    event_type='login_success',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    metadata={'two_factor_enabled': user_data.get('two_factor_enabled', False)}
                )
                
                # Store refresh token for tracking
                refresh_token = response.data.get('refresh')
                if refresh_token:
                    try:
                        user = User.objects.get(id=user_id)
                        CustomRefreshToken.objects.create(
                            user=user,
                            token=refresh_token,
                            expires_at=timezone.now() + timedelta(days=7),  # JWT refresh token expiry
                            ip_address=request.META.get('REMOTE_ADDR', ''),
                            user_agent=request.META.get('HTTP_USER_AGENT', ''),
                            device_id=request.data.get('device_id', '')
                        )
                    except Exception as e:
                        logger.error(f"Failed to store refresh token: {e}")
        
        return response


class CustomTokenRefreshView(TokenRefreshView):
    """Custom token refresh view with device tracking."""
    
    serializer_class = TokenRefreshSerializer
    
    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')
        
        # Check if refresh token is blacklisted
        try:
            token_obj = CustomRefreshToken.objects.get(token=refresh_token)
            if not token_obj.is_valid():
                return Response(
                    {'error': 'Refresh token is invalid or expired'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except CustomRefreshToken.DoesNotExist:
            pass  # Token might not be tracked yet
        
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == status.HTTP_200_OK:
            # Update token tracking
            try:
                if token_obj:
                    # Blacklist old token
                    token_obj.blacklist()
                    
                    # Create new token record
                    new_refresh = response.data.get('refresh')
                    if new_refresh:
                        CustomRefreshToken.objects.create(
                            user=token_obj.user,
                            token=new_refresh,
                            expires_at=timezone.now() + timedelta(days=7),
                            ip_address=request.META.get('REMOTE_ADDR', ''),
                            user_agent=request.META.get('HTTP_USER_AGENT', ''),
                            device_id=request.data.get('device_id', token_obj.device_id)
                        )
            except Exception as e:
                logger.error(f"Failed to update refresh token tracking: {e}")
        
        return response


class LogoutView(APIView):
    """Logout view that blacklists refresh token."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                # Blacklist the refresh token
                token = RefreshToken(refresh_token)
                token.blacklist()
                
                # Blacklist in our tracking system
                try:
                    token_obj = CustomRefreshToken.objects.get(token=refresh_token)
                    token_obj.blacklist()
                except CustomRefreshToken.DoesNotExist:
                    pass
                
                # Log logout event
                log_security_event.delay(
                    user_id=str(request.user.id),
                    event_type='logout',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
        except TokenError:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


class EmailOTPRequestView(generics.CreateAPIView):
    """Request email OTP for various purposes."""
    
    serializer_class = EmailOTPSerializer
    permission_classes = [permissions.AllowAny]
    
    def perform_create(self, serializer):
        otp = serializer.save()
        
        # Send OTP email
        purpose_templates = {
            'login': 'authentication/login_otp.html',
            'password_reset': 'authentication/password_reset_otp.html',
            'email_verification': 'authentication/email_verification.html',
            'two_factor': 'authentication/two_factor_otp.html',
        }
        
        template = purpose_templates.get(otp.purpose, 'authentication/generic_otp.html')
        
        send_email_task.delay(
            subject=f'Your verification code - {otp.purpose.replace("_", " ").title()}',
            template=template,
            context={'otp_code': otp.code, 'email': otp.email},
            recipient_list=[otp.email]
        )
    
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            response.data = {'message': 'OTP sent successfully'}
        return response


class EmailOTPVerificationView(APIView):
    """Verify email OTP."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = EmailOTPVerificationSerializer(data=request.data)
        if serializer.is_valid():
            otp = serializer.save()
            
            # Handle email verification
            if otp.purpose == 'email_verification':
                try:
                    user = User.objects.get(email=otp.email)
                    user.is_email_verified = True
                    user.email_verified = True
                    user.save(update_fields=['is_email_verified', 'email_verified'])
                    
                    # Log email verification
                    log_security_event.delay(
                        user_id=str(user.id),
                        event_type='email_verified',
                        ip_address=request.META.get('REMOTE_ADDR'),
                        user_agent=request.META.get('HTTP_USER_AGENT', '')
                    )
                except User.DoesNotExist:
                    pass
            
            return Response({
                'message': 'OTP verified successfully',
                'purpose': otp.purpose
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """Request password reset."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            try:
                user = User.objects.get(email=email, is_active=True)
                
                # Create password reset token
                reset_token = PasswordResetToken.objects.create(
                    user=user,
                    ip_address=request.META.get('REMOTE_ADDR', '')
                )
                
                # Send reset email
                send_email_task.delay(
                    subject='Password Reset Request',
                    template='authentication/password_reset_email.html',
                    context={
                        'user': user.email,
                        'reset_token': str(reset_token.token),
                        'reset_url': f"{settings.FRONTEND_URL}/reset-password/{reset_token.token}"
                    },
                    recipient_list=[user.email]
                )
                
                # Log password reset request
                log_security_event.delay(
                    user_id=str(user.id),
                    event_type='password_reset_requested',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
            except User.DoesNotExist:
                # Don't reveal if email exists
                pass
            
            return Response({
                'message': 'If the email exists, a password reset link has been sent.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    """Confirm password reset with token."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            password = serializer.validated_data['password']
            
            try:
                reset_token = PasswordResetToken.objects.get(token=token)
                
                if not reset_token.is_valid():
                    return Response(
                        {'error': 'Invalid or expired reset token'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Reset password
                user = reset_token.user
                user.set_password(password)
                user.password_changed_at = timezone.now()
                user.last_password_reset = timezone.now()
                user.save(update_fields=['password', 'password_changed_at', 'last_password_reset'])
                
                # Mark token as used
                reset_token.use()
                
                # Blacklist all refresh tokens for this user
                CustomRefreshToken.objects.filter(user=user, is_blacklisted=False).update(
                    is_blacklisted=True
                )
                
                # Log password reset
                log_security_event.delay(
                    user_id=str(user.id),
                    event_type='password_reset_completed',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                return Response({
                    'message': 'Password reset successfully'
                }, status=status.HTTP_200_OK)
                
            except PasswordResetToken.DoesNotExist:
                return Response(
                    {'error': 'Invalid reset token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordChangeView(APIView):
    """Change password for authenticated user."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            new_password = serializer.validated_data['new_password']
            
            user.set_password(new_password)
            user.password_changed_at = timezone.now()
            user.save(update_fields=['password', 'password_changed_at'])
            
            # Blacklist all refresh tokens except current session
            current_token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
            CustomRefreshToken.objects.filter(user=user, is_blacklisted=False).exclude(
                token=current_token
            ).update(is_blacklisted=True)
            
            # Log password change
            log_security_event.delay(
                user_id=str(user.id),
                event_type='password_changed',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """User profile view."""
    
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class InviteCreateView(generics.CreateAPIView):
    """Create user invitation (admin only)."""
    
    serializer_class = InviteSerializer
    permission_classes = [IsAdminUser]
    
    def perform_create(self, serializer):
        invite = serializer.save()
        
        # Send invitation email
        send_email_task.delay(
            subject='You have been invited to join Edulink',
            template='authentication/invitation_email.html',
            context={
                'invite': invite,
                'invite_url': f"{settings.FRONTEND_URL}/register?invite={invite.token}",
                'invited_by': invite.invited_by.email if invite.invited_by else 'System'
            },
            recipient_list=[invite.email]
        )


class InviteListView(generics.ListAPIView):
    """List invitations (admin only)."""
    
    serializer_class = InviteSerializer
    permission_classes = [IsAdminUser]
    queryset = Invite.objects.all().order_by('-created_at')


class UserListView(generics.ListAPIView):
    """List users (admin only)."""
    
    serializer_class = UserListSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.all().order_by('-date_joined')


class TwoFactorSetupView(APIView):
    """Setup two-factor authentication."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = TwoFactorSetupSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            enable = serializer.validated_data['enable']
            
            if enable:
                # Verify OTP before enabling
                otp_code = serializer.validated_data.get('otp_code')
                try:
                    otp = EmailOTP.objects.get(
                        email=user.email,
                        code=otp_code,
                        purpose='two_factor'
                    )
                    if not otp.is_valid():
                        return Response(
                            {'error': 'Invalid or expired OTP'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    otp.use()
                except EmailOTP.DoesNotExist:
                    return Response(
                        {'error': 'Invalid OTP code'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            user.two_factor_enabled = enable
            user.save(update_fields=['two_factor_enabled'])
            
            # Log 2FA change
            log_security_event.delay(
                user_id=str(user.id),
                event_type='two_factor_enabled' if enable else 'two_factor_disabled',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'message': f'Two-factor authentication {"enabled" if enable else "disabled"}',
                'two_factor_enabled': user.two_factor_enabled
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    """Health check endpoint."""
    return Response({
        'status': 'healthy',
        'service': 'auth_service',
        'timestamp': timezone.now().isoformat()
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def validate_token(request):
    """Validate JWT token (for other services)."""
    user = request.user
    return Response({
        'valid': True,
        'user': {
            'id': str(user.id),
            'email': user.email,
            'role': user.role,
            'is_active': user.is_active,
            'is_email_verified': user.is_email_verified,
            'profile_service_id': str(user.profile_service_id) if user.profile_service_id else None,
        }
    })