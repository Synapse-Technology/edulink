from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from django.contrib.auth import login, logout
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q, Count
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
import csv
import json
import logging
from datetime import timedelta

from .models import User, UserSession, UserActivity, UserPreference
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserSerializer,
    UserUpdateSerializer, PasswordChangeSerializer, EmailChangeSerializer,
    UserSessionSerializer, UserActivitySerializer, UserPreferenceSerializer,
    UserListSerializer, UserStatsSerializer, UserSearchSerializer,
    UserExportSerializer, BulkUserActionSerializer
)
from utils.permissions import (
    IsOwnerOrReadOnly, IsSystemAdmin, IsSuperAdminOrSystemAdmin,
    IsActiveUser, IsVerifiedUser, CanManageProfiles
)
from utils.helpers import (
    generate_token, send_notification_email, paginate_queryset,
    get_client_ip, health_check
)
from utils.exceptions import (
    UserNotFoundError, InvalidTokenError, ServiceUnavailableError
)

logger = logging.getLogger(__name__)


class UserRegistrationView(generics.CreateAPIView):
    """
    User registration endpoint.
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        """
        Create new user account.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.save()
        
        # Send verification email
        self.send_verification_email(user)
        
        # Log activity
        UserActivity.objects.create(
            user=user,
            action='REGISTRATION',
            description='User registered',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Return user data
        user_serializer = UserSerializer(user)
        
        return Response({
            'message': 'Registration successful. Please check your email for verification.',
            'user': user_serializer.data
        }, status=status.HTTP_201_CREATED)
    
    def send_verification_email(self, user):
        """
        Send email verification link.
        """
        try:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            verification_url = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"
            
            send_notification_email(
                to_email=user.email,
                subject='Verify your email address',
                template='emails/verify_email.html',
                context={
                    'user': user,
                    'verification_url': verification_url
                }
            )
        except Exception as e:
            logger.error(f"Failed to send verification email to {user.email}: {str(e)}")


class UserLoginView(APIView):
    """
    User login endpoint.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """
        Authenticate user and create session.
        """
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        remember_me = serializer.validated_data.get('remember_me', False)
        
        # Login user
        login(request, user)
        
        # Set session expiry
        if remember_me:
            request.session.set_expiry(settings.SESSION_COOKIE_AGE)
        else:
            request.session.set_expiry(0)  # Browser session
        
        # Create user session record
        user_session = UserSession.objects.create(
            user=user,
            session_key=request.session.session_key,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            device_type=self.get_device_type(request),
            location=self.get_location(request),
            expires_at=timezone.now() + timedelta(seconds=request.session.get_expiry_age())
        )
        
        # Update last login
        user.update_last_login()
        
        # Log activity
        UserActivity.objects.create(
            user=user,
            action='LOGIN',
            description='User logged in',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Return user data
        user_serializer = UserSerializer(user)
        session_serializer = UserSessionSerializer(user_session)
        
        return Response({
            'message': 'Login successful',
            'user': user_serializer.data,
            'session': session_serializer.data
        })
    
    def get_device_type(self, request):
        """
        Determine device type from user agent.
        """
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        
        if 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent:
            return 'mobile'
        elif 'tablet' in user_agent or 'ipad' in user_agent:
            return 'tablet'
        else:
            return 'desktop'
    
    def get_location(self, request):
        """
        Get user location from IP address.
        """
        # This would typically use a geolocation service
        # For now, return None or implement basic location detection
        return None


class UserLogoutView(APIView):
    """
    User logout endpoint.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Logout user and terminate session.
        """
        user = request.user
        
        # Deactivate user session
        if hasattr(request, 'session') and request.session.session_key:
            UserSession.objects.filter(
                user=user,
                session_key=request.session.session_key
            ).update(is_active=False)
        
        # Log activity
        UserActivity.objects.create(
            user=user,
            action='LOGOUT',
            description='User logged out',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Logout user
        logout(request)
        
        return Response({'message': 'Logout successful'})


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    User profile view and update.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_object(self):
        """
        Return current user.
        """
        return self.request.user
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on request method.
        """
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer
    
    def update(self, request, *args, **kwargs):
        """
        Update user profile.
        """
        response = super().update(request, *args, **kwargs)
        
        # Log activity
        UserActivity.objects.create(
            user=request.user,
            action='PROFILE_UPDATE',
            description='User updated profile',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return response


class PasswordChangeView(APIView):
    """
    Password change endpoint.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Change user password.
        """
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        user = serializer.save()
        
        # Log activity
        UserActivity.objects.create(
            user=user,
            action='PASSWORD_CHANGE',
            description='User changed password',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Invalidate all other sessions
        UserSession.objects.filter(user=user).exclude(
            session_key=request.session.session_key
        ).update(is_active=False)
        
        return Response({'message': 'Password changed successfully'})


class EmailChangeView(APIView):
    """
    Email change endpoint.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Request email change.
        """
        serializer = EmailChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        new_email = serializer.validated_data['new_email']
        user = request.user
        
        # Generate token for email change
        token = generate_token()
        cache_key = f"email_change_{user.id}_{token}"
        
        # Store email change request in cache (expires in 1 hour)
        cache.set(cache_key, {
            'user_id': user.id,
            'new_email': new_email,
            'old_email': user.email
        }, 3600)
        
        # Send confirmation email to new address
        confirmation_url = f"{settings.FRONTEND_URL}/confirm-email-change/{token}/"
        
        try:
            send_notification_email(
                to_email=new_email,
                subject='Confirm email address change',
                template='emails/confirm_email_change.html',
                context={
                    'user': user,
                    'new_email': new_email,
                    'confirmation_url': confirmation_url
                }
            )
        except Exception as e:
            logger.error(f"Failed to send email change confirmation: {str(e)}")
            return Response(
                {'error': 'Failed to send confirmation email'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'message': f'Confirmation email sent to {new_email}'
        })


class EmailVerificationView(APIView):
    """
    Email verification endpoint.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, uidb64, token):
        """
        Verify user email address.
        """
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise UserNotFoundError("Invalid verification link")
        
        if not default_token_generator.check_token(user, token):
            raise InvalidTokenError("Invalid or expired verification token")
        
        if user.is_verified:
            return Response({'message': 'Email already verified'})
        
        # Verify email
        user.verify_email()
        
        # Log activity
        UserActivity.objects.create(
            user=user,
            action='EMAIL_VERIFICATION',
            description='User verified email',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'message': 'Email verified successfully'})


class ResendVerificationView(APIView):
    """
    Resend email verification endpoint.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Resend email verification.
        """
        user = request.user
        
        if user.is_verified:
            return Response(
                {'message': 'Email already verified'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check rate limiting
        cache_key = f"verification_sent_{user.id}"
        if cache.get(cache_key):
            return Response(
                {'error': 'Verification email already sent. Please wait before requesting again.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Send verification email
        try:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            verification_url = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"
            
            send_notification_email(
                to_email=user.email,
                subject='Verify your email address',
                template='emails/verify_email.html',
                context={
                    'user': user,
                    'verification_url': verification_url
                }
            )
            
            # Set rate limiting (5 minutes)
            cache.set(cache_key, True, 300)
            
        except Exception as e:
            logger.error(f"Failed to send verification email: {str(e)}")
            return Response(
                {'error': 'Failed to send verification email'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({'message': 'Verification email sent'})


class UserSessionsView(generics.ListAPIView):
    """
    User sessions list.
    """
    serializer_class = UserSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return user's active sessions.
        """
        return UserSession.objects.filter(
            user=self.request.user,
            is_active=True
        ).order_by('-last_activity')


class TerminateSessionView(APIView):
    """
    Terminate user session.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request, session_id):
        """
        Terminate specific session.
        """
        try:
            session = UserSession.objects.get(
                id=session_id,
                user=request.user,
                is_active=True
            )
            session.terminate()
            
            return Response({'message': 'Session terminated'})
        except UserSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class UserActivityView(generics.ListAPIView):
    """
    User activity log.
    """
    serializer_class = UserActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['action']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Return user's activities.
        """
        return UserActivity.objects.filter(
            user=self.request.user
        )


class UserPreferencesView(generics.RetrieveUpdateAPIView):
    """
    User preferences view and update.
    """
    serializer_class = UserPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """
        Get or create user preferences.
        """
        preferences, created = UserPreference.objects.get_or_create(
            user=self.request.user
        )
        return preferences


class UserViewSet(ModelViewSet):
    """
    User management viewset for admin operations.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageProfiles]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'is_verified', 'is_staff']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'last_login', 'email']
    ordering = ['-date_joined']
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'list':
            return UserListSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activate user account.
        """
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])
        
        return Response({'message': 'User activated successfully'})
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """
        Deactivate user account.
        """
        user = self.get_object()
        
        if user.is_superuser:
            return Response(
                {'error': 'Cannot deactivate superuser'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = False
        user.save(update_fields=['is_active'])
        
        # Terminate all sessions
        UserSession.objects.filter(user=user).update(is_active=False)
        
        return Response({'message': 'User deactivated successfully'})
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """
        Verify user account.
        """
        user = self.get_object()
        user.verify_email()
        
        return Response({'message': 'User verified successfully'})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get user statistics.
        """
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        stats = {
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'verified_users': User.objects.filter(is_verified=True).count(),
            'new_users_today': User.objects.filter(date_joined__date=today).count(),
            'new_users_this_week': User.objects.filter(date_joined__date__gte=week_ago).count(),
            'new_users_this_month': User.objects.filter(date_joined__date__gte=month_ago).count(),
            'users_by_role': {},  # Would be populated from roles service
            'users_by_status': {
                'active': User.objects.filter(is_active=True).count(),
                'inactive': User.objects.filter(is_active=False).count(),
                'verified': User.objects.filter(is_verified=True).count(),
                'unverified': User.objects.filter(is_verified=False).count(),
            }
        }
        
        serializer = UserStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def search(self, request):
        """
        Advanced user search.
        """
        serializer = UserSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        queryset = self.get_queryset()
        
        # Apply filters
        query = serializer.validated_data.get('query')
        if query:
            queryset = queryset.filter(
                Q(email__icontains=query) |
                Q(username__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query)
            )
        
        is_active = serializer.validated_data.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        
        is_verified = serializer.validated_data.get('is_verified')
        if is_verified is not None:
            queryset = queryset.filter(is_verified=is_verified)
        
        date_from = serializer.validated_data.get('date_joined_from')
        if date_from:
            queryset = queryset.filter(date_joined__date__gte=date_from)
        
        date_to = serializer.validated_data.get('date_joined_to')
        if date_to:
            queryset = queryset.filter(date_joined__date__lte=date_to)
        
        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = UserListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = UserListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def export(self, request):
        """
        Export user data.
        """
        serializer = UserExportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        format_type = serializer.validated_data.get('format', 'csv')
        fields = serializer.validated_data.get('fields')
        filters = serializer.validated_data.get('filters', {})
        
        # Apply filters
        queryset = self.get_queryset()
        for field, value in filters.items():
            if hasattr(User, field):
                queryset = queryset.filter(**{field: value})
        
        # Export data
        if format_type == 'csv':
            return self.export_csv(queryset, fields)
        elif format_type == 'json':
            return self.export_json(queryset, fields)
        else:
            return Response(
                {'error': 'Unsupported export format'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def export_csv(self, queryset, fields):
        """
        Export users as CSV.
        """
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users.csv"'
        
        if not fields:
            fields = ['id', 'email', 'username', 'first_name', 'last_name', 'is_active', 'date_joined']
        
        writer = csv.writer(response)
        writer.writerow(fields)
        
        for user in queryset:
            row = []
            for field in fields:
                value = getattr(user, field, '')
                if hasattr(value, 'strftime'):
                    value = value.strftime('%Y-%m-%d %H:%M:%S')
                row.append(str(value))
            writer.writerow(row)
        
        return response
    
    def export_json(self, queryset, fields):
        """
        Export users as JSON.
        """
        data = []
        
        if not fields:
            fields = ['id', 'email', 'username', 'first_name', 'last_name', 'is_active', 'date_joined']
        
        for user in queryset:
            user_data = {}
            for field in fields:
                value = getattr(user, field, None)
                if hasattr(value, 'strftime'):
                    value = value.strftime('%Y-%m-%d %H:%M:%S')
                elif hasattr(value, '__str__'):
                    value = str(value)
                user_data[field] = value
            data.append(user_data)
        
        response = HttpResponse(
            json.dumps(data, indent=2),
            content_type='application/json'
        )
        response['Content-Disposition'] = 'attachment; filename="users.json"'
        
        return response
    
    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """
        Perform bulk actions on users.
        """
        serializer = BulkUserActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_ids = serializer.validated_data['user_ids']
        action = serializer.validated_data['action']
        
        users = User.objects.filter(id__in=user_ids)
        
        if action == 'activate':
            users.update(is_active=True)
            message = f"Activated {users.count()} users"
        elif action == 'deactivate':
            users.update(is_active=False)
            # Terminate sessions for deactivated users
            UserSession.objects.filter(user__in=users).update(is_active=False)
            message = f"Deactivated {users.count()} users"
        elif action == 'verify':
            users.update(is_verified=True, email_verified_at=timezone.now())
            message = f"Verified {users.count()} users"
        elif action == 'unverify':
            users.update(is_verified=False, email_verified_at=None)
            message = f"Unverified {users.count()} users"
        elif action == 'delete':
            count = users.count()
            users.delete()
            message = f"Deleted {count} users"
        
        return Response({'message': message})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check_view(request):
    """
    Health check endpoint.
    """
    try:
        health_status = health_check()
        return Response(health_status)
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return Response(
            {'status': 'unhealthy', 'error': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user_view(request):
    """
    Get current authenticated user.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def confirm_email_change_view(request, token):
    """
    Confirm email address change.
    """
    cache_key = f"email_change_*_{token}"
    
    # Find the cache entry
    cache_data = None
    for key in cache.keys(cache_key.replace('*', '*')):
        if token in key:
            cache_data = cache.get(key)
            cache.delete(key)
            break
    
    if not cache_data:
        return Response(
            {'error': 'Invalid or expired token'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(id=cache_data['user_id'])
        old_email = user.email
        user.email = cache_data['new_email']
        user.save(update_fields=['email'])
        
        # Log activity
        UserActivity.objects.create(
            user=user,
            action='EMAIL_CHANGE',
            description=f'Email changed from {old_email} to {user.email}',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'message': 'Email address updated successfully'})
    
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )