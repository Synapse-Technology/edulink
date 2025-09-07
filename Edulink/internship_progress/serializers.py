from rest_framework import serializers
from .models import LogbookEntry, SupervisorFeedback

class SupervisorFeedbackSerializer(serializers.ModelSerializer):
    # Only show private_note if context['request'].user is a supervisor
    private_note = serializers.SerializerMethodField()

    class Meta:
        model = SupervisorFeedback
        fields = [
            'id', 'log_entry', 'company_supervisor', 'institution_supervisor',
            'public_comment', 'private_note', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_private_note(self, obj):
        user = self.context['request'].user if 'request' in self.context else None
        # Only show private_note to supervisors or staff
        if user and (getattr(user, 'is_staff', False) or hasattr(user, 'employerprofile') or hasattr(user, 'institutionprofile')):
            return obj.private_note
        return None

class LogbookEntrySerializer(serializers.ModelSerializer):
    feedbacks = SupervisorFeedbackSerializer(many=True, read_only=True)
    student = serializers.StringRelatedField(read_only=True)
    internship_display = serializers.StringRelatedField(source='internship', read_only=True)

    class Meta:
        model = LogbookEntry
        fields = [
            'id', 'student', 'internship', 'internship_display', 'week_number', 'activities',
            'date_submitted', 'status', 'supervisor_comment', 'feedbacks'
        ]
        read_only_fields = ['id', 'date_submitted', 'feedbacks', 'student', 'internship_display']