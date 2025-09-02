from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count, Avg
from django.db import transaction
from datetime import timedelta
import logging

from .models import (
    Notification, NotificationTemplate, NotificationLog,
    NotificationPreference, NotificationBatch,
    NotificationStatus, NotificationType
)
from .serializers import (
    NotificationSerializer, NotificationCreateSerializer,
    NotificationTemplateSerializer, NotificationLogSerializer,
    NotificationPreferenceSerializer, NotificationBatchSerializer,
    BulkNotificationSerializer, NotificationStatusUpdateSerializer,
    NotificationStatsSerializer
)
from .tasks import send_notification, send_bulk_notifications

logger = logging.getLogger(__name__)


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationListCreateView(generics.ListCreateAPIView):
    """List and create notifications"""
    queryset = Notification.objects.all()
    pagination_class = NotificationPagination
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return NotificationCreateSerializer
        return NotificationSerializer
    
    def get_queryset(self):
        queryset = Notification.objects.select_related('template')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by notification type
        type_filter = self.request.query_params.get('type')
        if type_filter:
            queryset = queryset.filter(notification_type=type_filter)
        
        # Filter by category
        category_filter = self.request.query_params.get('category')
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        
        # Filter by recipient
        recipient_filter = self.request.query_params.get('recipient')
        if recipient_filter:
            queryset = queryset.filter(
                Q(recipient_email__icontains=recipient_filter) |
                Q(recipient_phone__icontains=recipient_filter) |
                Q(recipient_user_id__icontains=recipient_filter)
            )
        
        # Filter by source service
        source_filter = self.request.query_params.get('source_service')
        if source_filter:
            queryset = queryset.filter(source_service=source_filter)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        notification = serializer.save()
        
        # Queue notification for sending
        if notification.scheduled_at <= timezone.now():
            send_notification.delay(str(notification.id))
            logger.info(f"Queued notification {notification.id} for immediate sending")
        else:
            send_notification.apply_async(
                args=[str(notification.id)],
                eta=notification.scheduled_at
            )
            logger.info(f"Scheduled notification {notification.id} for {notification.scheduled_at}")


class NotificationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a notification"""
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.select_related('template')


class NotificationTemplateListCreateView(generics.ListCreateAPIView):
    """List and create notification templates"""
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NotificationPagination
    
    def get_queryset(self):
        queryset = NotificationTemplate.objects.all()
        
        # Filter by category
        category_filter = self.request.query_params.get('category')
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        
        # Filter by notification type
        type_filter = self.request.query_params.get('type')
        if type_filter:
            queryset = queryset.filter(notification_type=type_filter)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.order_by('category', 'name')


class NotificationTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a notification template"""
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]


class NotificationLogListView(generics.ListAPIView):
    """List notification logs for a specific notification"""
    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NotificationPagination
    
    def get_queryset(self):
        notification_id = self.kwargs['notification_id']
        return NotificationLog.objects.filter(
            notification_id=notification_id
        ).order_by('-attempted_at')


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    """Retrieve and update notification preferences for a user"""
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'user_id'
    
    def get_queryset(self):
        return NotificationPreference.objects.all()
    
    def get_object(self):
        user_id = self.kwargs['user_id']
        obj, created = NotificationPreference.objects.get_or_create(
            user_id=user_id,
            defaults={
                'email_categories': [],
                'sms_categories': [],
                'push_categories': [],
                'in_app_categories': [],
            }
        )
        return obj


class NotificationBatchListCreateView(generics.ListCreateAPIView):
    """List and create notification batches"""
    queryset = NotificationBatch.objects.all()
    serializer_class = NotificationBatchSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NotificationPagination
    
    def get_queryset(self):
        queryset = NotificationBatch.objects.all()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by source service
        source_filter = self.request.query_params.get('source_service')
        if source_filter:
            queryset = queryset.filter(source_service=source_filter)
        
        return queryset.order_by('-created_at')


class NotificationBatchDetailView(generics.RetrieveAPIView):
    """Retrieve notification batch details"""
    queryset = NotificationBatch.objects.all()
    serializer_class = NotificationBatchSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_bulk_notifications_view(request):
    """Send bulk notifications"""
    serializer = BulkNotificationSerializer(data=request.data)
    if serializer.is_valid():
        try:
            with transaction.atomic():
                # Create batch
                batch = NotificationBatch.objects.create(
                    name=serializer.validated_data['batch_name'],
                    description=serializer.validated_data.get('batch_description', ''),
                    total_count=len(serializer.validated_data['recipients']),
                    source_service=serializer.validated_data.get('source_service', ''),
                    created_by=str(request.user.id) if hasattr(request.user, 'id') else 'system'
                )
                
                # Queue bulk notification task
                send_bulk_notifications.delay(
                    str(batch.id),
                    serializer.validated_data
                )
                
                logger.info(f"Created bulk notification batch {batch.id} with {batch.total_count} recipients")
                
                return Response({
                    'batch_id': batch.id,
                    'message': f'Bulk notification batch created with {batch.total_count} recipients',
                    'status': 'queued'
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error creating bulk notification batch: {str(e)}")
            return Response({
                'error': 'Failed to create bulk notification batch',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_notification_status(request, notification_id):
    """Update notification status (webhook endpoint for providers)"""
    notification = get_object_or_404(Notification, id=notification_id)
    serializer = NotificationStatusUpdateSerializer(data=request.data)
    
    if serializer.is_valid():
        new_status = serializer.validated_data['status']
        
        # Validate status transition
        valid_transitions = {
            NotificationStatus.PENDING: [NotificationStatus.PROCESSING, NotificationStatus.CANCELLED],
            NotificationStatus.PROCESSING: [NotificationStatus.SENT, NotificationStatus.FAILED],
            NotificationStatus.SENT: [NotificationStatus.DELIVERED, NotificationStatus.FAILED],
            NotificationStatus.FAILED: [NotificationStatus.PROCESSING],  # For retries
        }
        
        if notification.status not in valid_transitions or new_status not in valid_transitions[notification.status]:
            return Response({
                'error': f'Invalid status transition from {notification.status} to {new_status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update notification
        notification.status = new_status
        
        if new_status == NotificationStatus.SENT:
            notification.sent_at = timezone.now()
            if 'external_id' in serializer.validated_data:
                notification.external_id = serializer.validated_data['external_id']
            if 'provider' in serializer.validated_data:
                notification.provider = serializer.validated_data['provider']
        
        elif new_status == NotificationStatus.DELIVERED:
            notification.delivered_at = timezone.now()
        
        elif new_status == NotificationStatus.FAILED:
            notification.retry_count += 1
            if 'error_message' in serializer.validated_data:
                notification.error_message = serializer.validated_data['error_message']
        
        notification.save()
        
        # Create log entry
        NotificationLog.objects.create(
            notification=notification,
            attempt_number=notification.retry_count,
            status=new_status,
            provider_response=serializer.validated_data.get('provider_response', {}),
            error_message=serializer.validated_data.get('error_message', '')
        )
        
        logger.info(f"Updated notification {notification_id} status to {new_status}")
        
        return Response({
            'message': f'Notification status updated to {new_status}',
            'notification_id': notification_id,
            'status': new_status
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def retry_failed_notification(request, notification_id):
    """Retry a failed notification"""
    notification = get_object_or_404(Notification, id=notification_id)
    
    if not notification.can_retry():
        return Response({
            'error': 'Notification cannot be retried',
            'reason': f'Status: {notification.status}, Retry count: {notification.retry_count}/{notification.max_retries}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Reset status and queue for retry
    notification.status = NotificationStatus.PENDING
    notification.error_message = ''
    notification.save(update_fields=['status', 'error_message', 'updated_at'])
    
    # Queue for sending
    send_notification.delay(str(notification.id))
    
    logger.info(f"Queued notification {notification_id} for retry (attempt {notification.retry_count + 1})")
    
    return Response({
        'message': 'Notification queued for retry',
        'notification_id': notification_id,
        'retry_attempt': notification.retry_count + 1
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def notification_stats(request):
    """Get notification statistics"""
    # Date range filter
    days = int(request.query_params.get('days', 30))
    start_date = timezone.now() - timedelta(days=days)
    
    # Base queryset
    queryset = Notification.objects.filter(created_at__gte=start_date)
    
    # Filter by source service if provided
    source_service = request.query_params.get('source_service')
    if source_service:
        queryset = queryset.filter(source_service=source_service)
    
    # Calculate statistics
    total_notifications = queryset.count()
    
    status_counts = queryset.values('status').annotate(count=Count('id'))
    status_dict = {item['status']: item['count'] for item in status_counts}
    
    type_counts = queryset.values('notification_type').annotate(count=Count('id'))
    type_dict = {item['notification_type']: item['count'] for item in type_counts}
    
    # Success rate calculation
    sent_count = status_dict.get(NotificationStatus.SENT, 0) + status_dict.get(NotificationStatus.DELIVERED, 0)
    success_rate = (sent_count / total_notifications * 100) if total_notifications > 0 else 0
    
    # Average delivery time (for delivered notifications)
    delivered_notifications = queryset.filter(
        status=NotificationStatus.DELIVERED,
        sent_at__isnull=False,
        delivered_at__isnull=False
    )
    
    avg_delivery_time = 0
    if delivered_notifications.exists():
        # Calculate average time between sent_at and delivered_at
        delivery_times = []
        for notif in delivered_notifications:
            if notif.sent_at and notif.delivered_at:
                delivery_time = (notif.delivered_at - notif.sent_at).total_seconds()
                delivery_times.append(delivery_time)
        
        if delivery_times:
            avg_delivery_time = sum(delivery_times) / len(delivery_times)
    
    # Daily statistics
    daily_stats = []
    for i in range(days):
        day = start_date + timedelta(days=i)
        day_end = day + timedelta(days=1)
        
        day_queryset = queryset.filter(
            created_at__gte=day,
            created_at__lt=day_end
        )
        
        day_counts = day_queryset.values('status').annotate(count=Count('id'))
        day_status_dict = {item['status']: item['count'] for item in day_counts}
        
        daily_stats.append({
            'date': day.strftime('%Y-%m-%d'),
            'total': day_queryset.count(),
            'sent': day_status_dict.get(NotificationStatus.SENT, 0) + day_status_dict.get(NotificationStatus.DELIVERED, 0),
            'failed': day_status_dict.get(NotificationStatus.FAILED, 0),
            'pending': day_status_dict.get(NotificationStatus.PENDING, 0)
        })
    
    stats_data = {
        'total_notifications': total_notifications,
        'pending_notifications': status_dict.get(NotificationStatus.PENDING, 0),
        'sent_notifications': sent_count,
        'failed_notifications': status_dict.get(NotificationStatus.FAILED, 0),
        'email_notifications': type_dict.get(NotificationType.EMAIL, 0),
        'sms_notifications': type_dict.get(NotificationType.SMS, 0),
        'push_notifications': type_dict.get(NotificationType.PUSH, 0),
        'success_rate': round(success_rate, 2),
        'average_delivery_time': round(avg_delivery_time, 2),
        'daily_stats': daily_stats
    }
    
    serializer = NotificationStatsSerializer(stats_data)
    return Response(serializer.data)


@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({
        'status': 'healthy',
        'service': 'notification_service',
        'timestamp': timezone.now().isoformat(),
        'version': '1.0.0'
    })