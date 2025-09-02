from rest_framework import serializers
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import (
    Application,
    ApplicationDocument,
    SupervisorFeedback,
    ApplicationNote,
    ApplicationStatusHistory
)
import sys
import os

# Add shared modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

from service_clients import InternshipServiceClient, UserServiceClient


class ApplicationDocumentSerializer(serializers.ModelSerializer):
    """Serializer for application documents"""
    
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ApplicationDocument
        fields = [
            'id', 'document_type', 'file', 'file_url', 'original_filename',
            'file_size', 'uploaded_by_id', 'uploaded_by_name', 'description',
            'is_verified', 'verified_by_id', 'verified_at', 'created_at'
        ]
        read_only_fields = ['file_size', 'verified_by_id', 'verified_at']
    
    def get_file_url(self, obj):
        """Get the file URL"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_uploaded_by_name(self, obj):
        """Get the name of the user who uploaded the document"""
        # This would call the user service to get user details
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(obj.uploaded_by_id)
            return user_data.get('full_name', f"User {obj.uploaded_by_id}")
        except:
            return f"User {obj.uploaded_by_id}"
    
    def create(self, validated_data):
        """Create document with file metadata"""
        file_obj = validated_data.get('file')
        if file_obj:
            validated_data['original_filename'] = file_obj.name
            validated_data['file_size'] = file_obj.size
        
        # Set uploaded_by from request user
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['uploaded_by_id'] = request.user.id
        
        return super().create(validated_data)


class ApplicationNoteSerializer(serializers.ModelSerializer):
    """Serializer for application notes"""
    
    author_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ApplicationNote
        fields = [
            'id', 'content', 'is_internal', 'note_type',
            'author_id', 'author_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['author_id', 'author_name']
    
    def get_author_name(self, obj):
        """Get the name of the note author"""
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(obj.author_id)
            return user_data.get('full_name', f"User {obj.author_id}")
        except:
            return f"User {obj.author_id}"
    
    def create(self, validated_data):
        """Set author from request user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['author_id'] = request.user.id
        return super().create(validated_data)


class ApplicationStatusHistorySerializer(serializers.ModelSerializer):
    """Serializer for application status history"""
    
    changed_by_name = serializers.SerializerMethodField()
    from_status_display = serializers.CharField(source='get_from_status_display', read_only=True)
    to_status_display = serializers.CharField(source='get_to_status_display', read_only=True)
    
    class Meta:
        model = ApplicationStatusHistory
        fields = [
            'id', 'from_status', 'from_status_display', 'to_status', 'to_status_display',
            'changed_by_id', 'changed_by_name', 'reason', 'created_at'
        ]
        read_only_fields = ['changed_by_id', 'changed_by_name']
    
    def get_changed_by_name(self, obj):
        """Get the name of the user who changed the status"""
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(obj.changed_by_id)
            return user_data.get('full_name', f"User {obj.changed_by_id}")
        except:
            return f"User {obj.changed_by_id}"


class SupervisorFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for supervisor feedback"""
    
    supervisor_name = serializers.SerializerMethodField()
    average_detailed_rating = serializers.ReadOnlyField()
    
    class Meta:
        model = SupervisorFeedback
        fields = [
            'id', 'supervisor_id', 'supervisor_name', 'feedback', 'rating',
            'technical_skills_rating', 'communication_rating', 'professionalism_rating',
            'average_detailed_rating', 'would_recommend', 'improvement_areas',
            'strengths', 'created_at', 'updated_at'
        ]
        read_only_fields = ['supervisor_id', 'supervisor_name']
    
    def get_supervisor_name(self, obj):
        """Get the name of the supervisor"""
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(obj.supervisor_id)
            return user_data.get('full_name', f"Supervisor {obj.supervisor_id}")
        except:
            return f"Supervisor {obj.supervisor_id}"
    
    def create(self, validated_data):
        """Set supervisor from request user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['supervisor_id'] = request.user.id
        return super().create(validated_data)


class ApplicationListSerializer(serializers.ModelSerializer):
    """Serializer for application list view"""
    
    student_name = serializers.SerializerMethodField()
    internship_title = serializers.SerializerMethodField()
    employer_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_since_application = serializers.ReadOnlyField()
    time_in_current_status_days = serializers.SerializerMethodField()
    
    class Meta:
        model = Application
        fields = [
            'id', 'student_id', 'student_name', 'internship_id', 'internship_title',
            'employer_name', 'status', 'status_display', 'application_date',
            'days_since_application', 'time_in_current_status_days', 'priority_score'
        ]
    
    def get_student_name(self, obj):
        """Get student name from user service"""
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(obj.student_id)
            return user_data.get('full_name', f"Student {obj.student_id}")
        except:
            return f"Student {obj.student_id}"
    
    def get_internship_title(self, obj):
        """Get internship title from internship service"""
        internship_client = InternshipServiceClient()
        try:
            internship_data = internship_client.get_internship(obj.internship_id)
            return internship_data.get('title', f"Internship {obj.internship_id}")
        except:
            return f"Internship {obj.internship_id}"
    
    def get_employer_name(self, obj):
        """Get employer name from internship and user services"""
        if obj.employer_id:
            user_client = UserServiceClient()
            try:
                employer_data = user_client.get_employer(obj.employer_id)
                return employer_data.get('company_name', f"Employer {obj.employer_id}")
            except:
                return f"Employer {obj.employer_id}"
        return "Unknown Employer"
    
    def get_time_in_current_status_days(self, obj):
        """Get time in current status in days"""
        time_delta = obj.time_in_current_status
        return time_delta.days


class ApplicationDetailSerializer(serializers.ModelSerializer):
    """Serializer for application detail view"""
    
    student_details = serializers.SerializerMethodField()
    internship_details = serializers.SerializerMethodField()
    employer_details = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    documents = ApplicationDocumentSerializer(many=True, read_only=True)
    notes = ApplicationNoteSerializer(many=True, read_only=True)
    status_history = ApplicationStatusHistorySerializer(many=True, read_only=True)
    supervisor_feedback = SupervisorFeedbackSerializer(read_only=True)
    days_since_application = serializers.ReadOnlyField()
    time_in_current_status_days = serializers.SerializerMethodField()
    can_withdraw = serializers.SerializerMethodField()
    
    class Meta:
        model = Application
        fields = [
            'id', 'student_id', 'student_details', 'internship_id', 'internship_details',
            'employer_id', 'employer_details', 'application_date', 'status', 'status_display',
            'previous_status', 'status_changed_at', 'status_changed_by_id',
            'cover_letter', 'resume', 'reviewed_by_id', 'reviewed_at', 'review_notes',
            'interview_date', 'interview_notes', 'interview_location', 'interview_type',
            'custom_answers', 'source', 'priority_score', 'days_since_application',
            'time_in_current_status_days', 'can_withdraw', 'documents', 'notes',
            'status_history', 'supervisor_feedback', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'application_date', 'status_changed_at', 'status_changed_by_id',
            'reviewed_by_id', 'reviewed_at'
        ]
    
    def get_student_details(self, obj):
        """Get detailed student information"""
        user_client = UserServiceClient()
        try:
            return user_client.get_student_details(obj.student_id)
        except:
            return {'id': obj.student_id, 'name': f"Student {obj.student_id}"}
    
    def get_internship_details(self, obj):
        """Get detailed internship information"""
        internship_client = InternshipServiceClient()
        try:
            return internship_client.get_internship_details(obj.internship_id)
        except:
            return {'id': obj.internship_id, 'title': f"Internship {obj.internship_id}"}
    
    def get_employer_details(self, obj):
        """Get detailed employer information"""
        if obj.employer_id:
            user_client = UserServiceClient()
            try:
                return user_client.get_employer_details(obj.employer_id)
            except:
                return {'id': obj.employer_id, 'name': f"Employer {obj.employer_id}"}
        return None
    
    def get_time_in_current_status_days(self, obj):
        """Get time in current status in days"""
        time_delta = obj.time_in_current_status
        return time_delta.days
    
    def get_can_withdraw(self, obj):
        """Check if application can be withdrawn"""
        return obj.can_transition_to('withdrawn')


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating applications"""
    
    class Meta:
        model = Application
        fields = [
            'internship_id', 'cover_letter', 'resume', 'custom_answers', 'source'
        ]
    
    def validate_internship_id(self, value):
        """Validate that internship exists and is accepting applications"""
        internship_client = InternshipServiceClient()
        try:
            internship_data = internship_client.get_internship(value)
            if not internship_data.get('is_active', False):
                raise serializers.ValidationError("Internship is not active")
            if not internship_data.get('can_apply', False):
                raise serializers.ValidationError("Internship is not accepting applications")
            return value
        except Exception as e:
            raise serializers.ValidationError(f"Invalid internship: {str(e)}")
    
    def validate(self, attrs):
        """Validate application data"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required")
        
        # Check if user already applied to this internship
        student_id = request.user.id  # Simplified - would get from user service
        internship_id = attrs['internship_id']
        
        if Application.objects.filter(
            student_id=student_id,
            internship_id=internship_id
        ).exists():
            raise serializers.ValidationError(
                "You have already applied to this internship"
            )
        
        return attrs
    
    def create(self, validated_data):
        """Create application with student ID from request"""
        request = self.context.get('request')
        validated_data['student_id'] = request.user.id  # Simplified
        
        # Get employer ID from internship
        internship_client = InternshipServiceClient()
        try:
            internship_data = internship_client.get_internship(validated_data['internship_id'])
            validated_data['employer_id'] = internship_data.get('employer_id')
        except:
            pass
        
        return super().create(validated_data)


class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating application status"""
    
    reason = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Application
        fields = ['status', 'review_notes', 'reason']
    
    def validate_status(self, value):
        """Validate status transition"""
        instance = self.instance
        if instance and not instance.can_transition_to(value):
            raise serializers.ValidationError(
                f"Cannot transition from '{instance.status}' to '{value}'"
            )
        return value
    
    def update(self, instance, validated_data):
        """Update status and create history record"""
        reason = validated_data.pop('reason', '')
        old_status = instance.status
        new_status = validated_data.get('status', old_status)
        
        # Update the application
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['status_changed_by_id'] = request.user.id
            if new_status in ['reviewed', 'accepted', 'rejected'] and not instance.reviewed_by_id:
                validated_data['reviewed_by_id'] = request.user.id
                validated_data['reviewed_at'] = timezone.now()
        
        instance = super().update(instance, validated_data)
        
        # Create status history record
        if old_status != new_status:
            ApplicationStatusHistory.objects.create(
                application=instance,
                from_status=old_status,
                to_status=new_status,
                changed_by_id=request.user.id if request and request.user.is_authenticated else None,
                reason=reason
            )
        
        return instance


class ApplicationStatsSerializer(serializers.Serializer):
    """Serializer for application statistics"""
    
    total_applications = serializers.IntegerField()
    pending_applications = serializers.IntegerField()
    reviewed_applications = serializers.IntegerField()
    interview_scheduled = serializers.IntegerField()
    accepted_applications = serializers.IntegerField()
    rejected_applications = serializers.IntegerField()
    withdrawn_applications = serializers.IntegerField()
    
    by_status = serializers.DictField()
    by_internship = serializers.DictField()
    by_employer = serializers.DictField()
    by_month = serializers.ListField()
    
    average_time_to_review = serializers.FloatField()
    average_time_to_decision = serializers.FloatField()
    acceptance_rate = serializers.FloatField()
    interview_rate = serializers.FloatField()