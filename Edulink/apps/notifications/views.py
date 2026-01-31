from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.conf import settings

from .models import Notification, EmailVerificationToken, PasswordResetToken
from .serializers import (
    NotificationSerializer,
    NotificationCreateSerializer,
    NotificationStatusUpdateSerializer,
    UnreadCountSerializer
)
from .services import (
    create_notification,
    mark_notification_sent,
    mark_notification_failed,
    mark_notification_delivered,
    mark_notification_read,
    get_user_notifications,
    get_unread_notification_count
)
from .permissions import IsNotificationRecipient, IsSystemAdmin


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for notification operations.
    Follows architecture rules: views contain no business logic, only call services.
    """
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return NotificationCreateSerializer
        elif self.action == 'update_status':
            return NotificationStatusUpdateSerializer
        return NotificationSerializer
    
    def get_permissions(self):
        """Return appropriate permissions based on action."""
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsNotificationRecipient()]
        return super().get_permissions()
    
    def list(self, request):
        """Get notifications for the authenticated user."""
        user_id = str(request.user.id)
        notifications = get_user_notifications(user_id=user_id)
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)
    
    def create(self, request):
        """Create a new notification."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            notification = create_notification(
                **serializer.validated_data,
                actor_id=str(request.user.id)
            )
            response_serializer = NotificationSerializer(notification)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def retrieve(self, request, pk=None):
        """Get a specific notification."""
        notification = get_object_or_404(Notification, pk=pk)
        self.check_object_permissions(request, notification)
        serializer = NotificationSerializer(notification)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = get_object_or_404(Notification, pk=pk)
        self.check_object_permissions(request, notification)
        
        success = mark_notification_read(notification_id=str(notification.id))
        if success:
            return Response({'status': 'marked as read'})
        return Response({'error': 'Failed to mark as read'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """Get unread notification count for the authenticated user."""
        user_id = str(request.user.id)
        count = get_unread_notification_count(user_id=user_id)
        return Response({'count': count, 'user_id': user_id})
    
    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """Mark all notifications as read for the authenticated user."""
        user_id = str(request.user.id)
        notifications = Notification.objects.filter(
            recipient_id=user_id,
            status__in=[Notification.STATUS_SENT, Notification.STATUS_DELIVERED]
        )
        
        updated_count = 0
        for notification in notifications:
            if mark_notification_read(notification_id=str(notification.id)):
                updated_count += 1
        
        return Response({'updated_count': updated_count})


class EmailVerificationViewSet(viewsets.ViewSet):
    """
    ViewSet for email verification operations.
    """
    permission_classes = []
    
    @action(detail=False, methods=['post'], url_path='verify')
    def verify_email(self, request):
        """Verify email using token."""
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .services import verify_email_token
        success = verify_email_token(token=token)
        
        if success:
            return Response({'status': 'email verified'})
        return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='resend')
    def resend_verification(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        from .services import create_email_verification_token, send_email_verification_notification

        User = get_user_model()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'status': 'verification email sent if user exists'})

        token = create_email_verification_token(
            user_id=str(user.id),
            email=email,
        )

        verification_url = f"{settings.FRONTEND_URL}/verify-email/{token}/"

        send_email_verification_notification(
            user_id=str(user.id),
            email=email,
            verification_token=token,
            verification_url=verification_url,
        )

        return Response({'status': 'verification email resent'})


class PasswordResetViewSet(viewsets.ViewSet):
    """
    ViewSet for password reset operations.
    """
    permission_classes = []
    
    @action(detail=False, methods=['post'], url_path='request')
    def request_reset(self, request):
        """Request password reset."""
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .services import create_password_reset_token, send_password_reset_notification
        
        # Create token (returns dummy token even if user doesn't exist for security)
        token = create_password_reset_token(email=email)
        
        # Send reset email if user exists
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            send_password_reset_notification(
                user_id=str(user.id),
                email=email,
                reset_token=token,
                reset_url=reset_url
            )
        except User.DoesNotExist:
            # Don't reveal that user doesn't exist
            pass
        
        return Response({'status': 'reset email sent if user exists'})
    
    @action(detail=False, methods=['post'], url_path='verify-token')
    def verify_token(self, request):
        """Verify password reset token."""
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .services import verify_password_reset_token
        is_valid = verify_password_reset_token(token=token)
        
        return Response({'valid': is_valid})
    
    @action(detail=False, methods=['post'], url_path='reset')
    def reset_password(self, request):
        """Reset password using token."""
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not token or not new_password:
            return Response(
                {'error': 'Token and new_password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .services import use_password_reset_token
        try:
            success = use_password_reset_token(token=token, new_password=new_password)
            if success:
                return Response({'status': 'password reset successful'})
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
