from rest_framework import serializers
from .models import SupportTicket, Feedback, TicketCommunication, TicketAttachment

class TicketAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketAttachment
        fields = ['id', 'file', 'file_name', 'created_at']

class TicketCommunicationSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    is_staff = serializers.SerializerMethodField()

    class Meta:
        model = TicketCommunication
        fields = ['id', 'sender', 'sender_name', 'message', 'is_internal', 'is_staff', 'created_at']
        read_only_fields = ['id', 'sender', 'sender_name', 'is_staff', 'created_at']

    def get_is_staff(self, obj):
        return hasattr(obj.sender, 'platform_staff_profile')

class SupportTicketSerializer(serializers.ModelSerializer):
    communications = TicketCommunicationSerializer(many=True, read_only=True)
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'tracking_code', 'name', 'email', 'subject', 'message', 
            'category', 'priority', 'status', 'related_entity_type', 
            'related_entity_id', 'assigned_to_id', 'assigned_to_name',
            'resolved_at', 'resolution_notes', 'communications', 
            'attachments', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'tracking_code', 'status', 'assigned_to_id', 
            'resolved_at', 'resolution_notes', 'created_at', 'updated_at'
        ]

    def get_assigned_to_name(self, obj):
        if not obj.assigned_to_id:
            return None
        try:
            from edulink.apps.platform_admin.queries import get_staff_profile_by_id
            profile = get_staff_profile_by_id(obj.assigned_to_id)
            if profile and profile.user:
                return profile.user.get_full_name()
        except Exception:
            pass
        return "Unknown Staff"

class FeedbackSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = Feedback
        fields = ['id', 'user', 'user_name', 'message', 'is_anonymous', 'created_at']
        read_only_fields = ['id', 'user', 'user_name', 'created_at']
