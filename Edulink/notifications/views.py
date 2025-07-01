from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from .models import Notification
from .serializers import NotificationSerializer
# You might need to import tasks if you're using Celery for async sending
# from .tasks import send_notification_async 

class UserNotificationList(generics.ListAPIView):
    """
    API endpoint to list notifications for the authenticated user.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return notifications for the current authenticated user, ordered by timestamp.
        """
        return Notification.objects.filter(user=self.request.user).order_by('-timestamp')

@api_view(['POST'])
@permission_classes([IsAuthenticated]) # Or a custom permission for internal services
def mark_notification_as_read(request, pk):
    """
    API endpoint to mark a specific notification as read.
    """
    notification = get_object_or_404(Notification, pk=pk, user=request.user)
    notification.is_read = True
    notification.save()
    serializer = NotificationSerializer(notification)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
# You might want a more restricted permission here, as this is likely an internal API
# For example, only authenticated internal services can call this.
def send_notification_internal(request):
    """
    Internal API endpoint to create and potentially send a notification.
    This would typically be called by other services (e.g., Application Tracker).
    
    Expected request.data: {
        "user_id": int,
        "message": str,
        "notification_type": str, // 'email', 'sms', 'push'
        "related_application_id": int (optional),
        "related_internship_id": int (optional)
    }
    """
    serializer = NotificationSerializer(data=request.data)
    if serializer.is_valid():
        notification = serializer.save()
        # Trigger asynchronous sending if using a task queue
        # if settings.USE_CELERY_FOR_NOTIFICATIONS: # Example setting
        #     send_notification_async.delay(notification.id) 
        # Else, handle synchronous sending here (not recommended for actual sending)
        
        # Mark as sent for now if not using async. In a real system, this would be updated by the async task.
        notification.status = 'sent' 
        notification.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)