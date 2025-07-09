from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Notification model.
    """
    class Meta:
        model = Notification
        fields = [
            'id',
            'user',
            'message',
            'notification_type',
            'timestamp',
            'is_read',
            'related_application',
            'related_internship',
            'status'
        ]
        read_only_fields = ['id', 'timestamp', 'user', 'status']  # 'user' might be set by the view/signal
