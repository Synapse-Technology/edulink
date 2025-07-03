from rest_framework import serializers
from ..models.application import Application
from ..models.internship import Internship

class ApplicationSerializer(serializers.ModelSerializer):
    # Read-only fields for related data
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_email = serializers.CharField(source='student.user.email', read_only=True)
    internship_title = serializers.CharField(source='internship.title', read_only=True)
    employer_name = serializers.CharField(source='internship.employer.company_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    
    # Computed fields
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Application
        fields = [
            'id',
            'student',
            'student_name',
            'student_email',
            'internship',
            'internship_title',
            'employer_name',
            'application_date',
            'status',
            'cover_letter',
            'resume',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'review_notes',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'student', 'internship', 'application_date', 'student_name', 
            'student_email', 'internship_title', 'employer_name', 
            'reviewed_by_name', 'is_active', 'created_at', 'updated_at'
        ]


class ApplicationCreateSerializer(ApplicationSerializer):
    """
    Serializer for creating applications - ensures student is set automatically.
    """
    class Meta(ApplicationSerializer.Meta):
        read_only_fields = ApplicationSerializer.Meta.read_only_fields + ['student']


class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating the status of an application.
    """
    class Meta:
        model = Application
        fields = ['status', 'review_notes']

    def validate_status(self, value):
        """Validate status transitions"""
        instance = self.instance
        if instance:
            # Define allowed status transitions
            allowed_transitions = {
                'pending': ['reviewed', 'accepted', 'rejected'],
                'reviewed': ['accepted', 'rejected'],
                'accepted': ['rejected'],  # Can still be rejected
                'rejected': [],  # No further transitions
                'withdrawn': []  # No further transitions
            }
            
            current_status = instance.status
            if value not in allowed_transitions.get(current_status, []):
                raise serializers.ValidationError(
                    f"Cannot transition from '{current_status}' to '{value}'"
                )
        
        return value

    def update(self, instance, validated_data):
        """Update application status and set review metadata"""
        from django.utils import timezone
        
        # Set review metadata if status is being changed
        if 'status' in validated_data and validated_data['status'] != instance.status:
            instance.reviewed_by = self.context['request'].user
            instance.reviewed_at = timezone.now()
        
        return super().update(instance, validated_data)


class ApplicationListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing applications.
    """
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    internship_title = serializers.CharField(source='internship.title', read_only=True)
    employer_name = serializers.CharField(source='internship.employer.company_name', read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Application
        fields = [
            'id', 'student_name', 'internship_title', 'employer_name',
            'application_date', 'status', 'is_active'
        ]
