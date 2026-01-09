from rest_framework import serializers
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth import get_user_model
import re
import os
from datetime import datetime, timedelta
from .models import Application, SupervisorFeedback
from internship.models.internship import Internship

User = get_user_model()


class InternshipSimpleSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='employer.company_name', read_only=True)
    company_name = serializers.CharField(source='employer.company_name', read_only=True)
    
    class Meta:
        model = Internship
        fields = [
            "id",
            "title",
            "employer",
            "employer_name",
            "company_name",
            "location",
            "start_date",
            "end_date",
            "is_active",
        ]


class ApplicationSerializer(serializers.ModelSerializer):
    internship = InternshipSimpleSerializer(read_only=True)
    internship_id = serializers.PrimaryKeyRelatedField(
        queryset=Internship.objects.all(), source="internship", write_only=True  # type: ignore[attr-defined]
    )
    student = serializers.StringRelatedField(read_only=True)
    # Add frontend-expected field names
    internship_title = serializers.CharField(source='internship.title', read_only=True)
    company = serializers.CharField(source='internship.employer.company_name', read_only=True)
    location = serializers.CharField(source='internship.location', read_only=True)
    applied_on = serializers.DateTimeField(source='application_date', read_only=True)
    created_at = serializers.DateTimeField(source='application_date', read_only=True)
    
    # Interview scheduling fields
    interview_date = serializers.DateTimeField(required=False, allow_null=True)
    interview_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    review_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "student",
            "internship",
            "internship_id",
            "internship_title",
            "company",
            "location",
            "status",
            "applied_on",
            "created_at",
            "application_date",
            "updated_at",
            "cover_letter",
            "resume",
            "interview_date",
            "interview_notes",
            "review_notes",
        ]
        read_only_fields = ["id", "student", "application_date", "updated_at"]
    
    def validate_cover_letter(self, value):
        """Validate cover letter content."""
        if not value or not value.strip():
            raise serializers.ValidationError("Cover letter cannot be empty.")
        
        # Length validation
        if len(value) < 100:
            raise serializers.ValidationError("Cover letter must be at least 100 characters long.")
        if len(value) > 2000:
            raise serializers.ValidationError("Cover letter cannot exceed 2000 characters.")
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'<script[^>]*>.*?</script>',  # Script tags
            r'javascript:',  # JavaScript URLs
            r'on\w+\s*=',  # Event handlers
            r'<iframe[^>]*>.*?</iframe>',  # Iframes
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                raise serializers.ValidationError("Cover letter contains invalid content.")
        
        # Check for excessive repetition
        words = value.lower().split()
        if len(words) > 0:
            word_count = {}
            for word in words:
                if len(word) > 3:  # Only check words longer than 3 characters
                    word_count[word] = word_count.get(word, 0) + 1
            
            # Check if any word appears more than 10% of total words
            max_repetition = max(word_count.values()) if word_count else 0
            if max_repetition > len(words) * 0.1 and max_repetition > 5:
                raise serializers.ValidationError("Cover letter contains excessive word repetition.")
        
        return value.strip()
    
    def validate_resume(self, value):
        """Validate resume file."""
        if not value:
            raise serializers.ValidationError("Resume file is required.")
        
        # File size validation (10MB max)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError("Resume file size cannot exceed 10MB.")
        
        # File type validation
        allowed_types = ['application/pdf', 'application/msword', 
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Resume must be a PDF, DOC, or DOCX file.")
        
        # File extension validation
        allowed_extensions = ['.pdf', '.doc', '.docx']
        file_extension = os.path.splitext(value.name)[1].lower()
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError("Resume file must have .pdf, .doc, or .docx extension.")
        
        return value
    
    def validate_status(self, value):
        """Validate status transitions."""
        if self.instance:
            # Get valid transitions from the model
            from .models import Application
            valid_transitions = Application.VALID_TRANSITIONS.get(self.instance.status, [])
            if value not in valid_transitions and value != self.instance.status:
                raise serializers.ValidationError(
                    f"Cannot change status from '{self.instance.status}' to '{value}'. "
                    f"Valid transitions: {', '.join(valid_transitions)}"
                )
        return value
    
    def validate_interview_date(self, value):
        """Validate interview date."""
        if value:
            # Must be in the future
            if value <= timezone.now():
                raise serializers.ValidationError("Interview date must be in the future.")
            
            # Cannot be more than 6 months in the future
            max_date = timezone.now() + timedelta(days=180)
            if value > max_date:
                raise serializers.ValidationError("Interview date cannot be more than 6 months in the future.")
        
        return value
    
    def validate_interview_notes(self, value):
        """Validate interview notes."""
        if value:
            # Length validation
            if len(value) > 1000:
                raise serializers.ValidationError("Interview notes cannot exceed 1000 characters.")
            
            # Check for suspicious patterns
            suspicious_patterns = [
                r'<script[^>]*>.*?</script>',
                r'javascript:',
                r'on\w+\s*=',
            ]
            
            for pattern in suspicious_patterns:
                if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                    raise serializers.ValidationError("Interview notes contain invalid content.")
        
        return value.strip() if value else value
    
    def validate_review_notes(self, value):
        """Validate review notes."""
        if value:
            # Length validation
            if len(value) > 1000:
                raise serializers.ValidationError("Review notes cannot exceed 1000 characters.")
            
            # Check for suspicious patterns
            suspicious_patterns = [
                r'<script[^>]*>.*?</script>',
                r'javascript:',
                r'on\w+\s*=',
            ]
            
            for pattern in suspicious_patterns:
                if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                    raise serializers.ValidationError("Review notes contain invalid content.")
        
        return value.strip() if value else value
    
    def validate(self, attrs):
        """Cross-field validation."""
        # Check for duplicate applications
        if not self.instance:  # Only for new applications
            internship = attrs.get('internship')
            if internship and self.context.get('request'):
                user = self.context['request'].user
                existing_application = Application.objects.filter(
                    student=user,
                    internship=internship
                ).exclude(status='withdrawn').first()
                
                if existing_application:
                    raise serializers.ValidationError(
                        "You have already applied for this internship."
                    )
        
        # Status-dependent field validation
        status = attrs.get('status', self.instance.status if self.instance else None)
        
        if status == 'interview_scheduled':
            if not attrs.get('interview_date') and (not self.instance or not self.instance.interview_date):
                raise serializers.ValidationError(
                    "Interview date is required when status is 'interview_scheduled'."
                )
        
        # Check internship deadline
        internship = attrs.get('internship')
        if internship and internship.application_deadline:
            if timezone.now().date() > internship.application_deadline:
                raise serializers.ValidationError(
                    "Application deadline has passed for this internship."
                )
        
        # Check if internship is active
        if internship and not internship.is_active:
            raise serializers.ValidationError(
                "Cannot apply to an inactive internship."
            )
        
        return attrs


class ApplicationCreateSerializer(serializers.ModelSerializer):
    internship_id = serializers.PrimaryKeyRelatedField(
        queryset=Internship.objects.all(), source="internship", write_only=True  # type: ignore[attr-defined]
    )

    class Meta:
        model = Application
        fields = ["internship_id"]


class SupervisorFeedbackSerializer(serializers.ModelSerializer):
    application = serializers.PrimaryKeyRelatedField(queryset=Application.objects.all())  # type: ignore[attr-defined]
    student_name = serializers.CharField(source='application.student.get_full_name', read_only=True)
    internship_title = serializers.CharField(source='application.internship.title', read_only=True)

    class Meta:
        model = SupervisorFeedback
        fields = ["id", "application", "student_name", "internship_title", "feedback", "rating", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
    
    def validate_rating(self, value):
        """Validate rating value."""
        if value is None:
            raise serializers.ValidationError("Rating is required.")
        
        if not isinstance(value, int) or value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be an integer between 1 and 5.")
        
        return value
    
    def validate_feedback(self, value):
        """Validate feedback content."""
        if not value or not value.strip():
            raise serializers.ValidationError("Feedback cannot be empty.")
        
        # Length validation
        if len(value) < 50:
            raise serializers.ValidationError("Feedback must be at least 50 characters long.")
        if len(value) > 2000:
            raise serializers.ValidationError("Feedback cannot exceed 2000 characters.")
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'<script[^>]*>.*?</script>',  # Script tags
            r'javascript:',  # JavaScript URLs
            r'on\w+\s*=',  # Event handlers
            r'<iframe[^>]*>.*?</iframe>',  # Iframes
            r'<object[^>]*>.*?</object>',  # Object tags
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                raise serializers.ValidationError("Feedback contains invalid content.")
        
        # Check for excessive repetition
        words = value.lower().split()
        if len(words) > 0:
            word_count = {}
            for word in words:
                if len(word) > 3:  # Only check words longer than 3 characters
                    word_count[word] = word_count.get(word, 0) + 1
            
            # Check if any word appears more than 15% of total words
            max_repetition = max(word_count.values()) if word_count else 0
            if max_repetition > len(words) * 0.15 and max_repetition > 8:
                raise serializers.ValidationError("Feedback contains excessive word repetition.")
        
        return value.strip()
    
    def validate(self, attrs):
        """Cross-field validation."""
        application = attrs.get('application')
        
        if application:
            # Check if application status allows feedback
            valid_statuses = ['accepted', 'completed', 'in_progress']
            if application.status not in valid_statuses:
                raise serializers.ValidationError(
                    f"Feedback can only be provided for applications with status: {', '.join(valid_statuses)}. "
                    f"Current status: {application.status}"
                )
            
            # Check if feedback already exists (for updates, this is handled by the view)
            if not self.instance:
                existing_feedback = SupervisorFeedback.objects.filter(application=application).first()
                if existing_feedback:
                    raise serializers.ValidationError(
                        "Feedback already exists for this application. Use update instead."
                    )
        
        # Validate rating and feedback consistency
        rating = attrs.get('rating')
        feedback = attrs.get('feedback', '')
        
        if rating and feedback:
            # For very low ratings, ensure feedback explains the issues
            if rating <= 2 and len(feedback) < 100:
                raise serializers.ValidationError(
                    "For ratings of 2 or below, feedback must be at least 100 characters to explain the issues."
                )
            
            # For high ratings, ensure feedback is positive
            if rating >= 4:
                negative_words = ['terrible', 'awful', 'horrible', 'worst', 'failed', 'disaster']
                feedback_lower = feedback.lower()
                if any(word in feedback_lower for word in negative_words):
                    raise serializers.ValidationError(
                        "High ratings should not contain strongly negative language in feedback."
                    )
        
        return attrs


class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ["status", "review_notes", "interview_date", "interview_notes"]
    
    def validate_status(self, value):
        """Validate status transitions."""
        if self.instance:
            # Get valid transitions from the model
            from .models import Application
            valid_transitions = Application.VALID_TRANSITIONS.get(self.instance.status, [])
            if value not in valid_transitions and value != self.instance.status:
                raise serializers.ValidationError(
                    f"Cannot change status from '{self.instance.status}' to '{value}'. "
                    f"Valid transitions: {', '.join(valid_transitions)}"
                )
        return value
    
    def validate_review_notes(self, value):
        """Validate review notes."""
        if value:
            # Length validation
            if len(value) > 1000:
                raise serializers.ValidationError("Review notes cannot exceed 1000 characters.")
            
            # Check for suspicious patterns
            suspicious_patterns = [
                r'<script[^>]*>.*?</script>',
                r'javascript:',
                r'on\w+\s*=',
            ]
            
            for pattern in suspicious_patterns:
                if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                    raise serializers.ValidationError("Review notes contain invalid content.")
        
        return value.strip() if value else value
    
    def validate_interview_date(self, value):
        """Validate interview date."""
        if value:
            # Must be in the future
            if value <= timezone.now():
                raise serializers.ValidationError("Interview date must be in the future.")
            
            # Cannot be more than 6 months in the future
            max_date = timezone.now() + timedelta(days=180)
            if value > max_date:
                raise serializers.ValidationError("Interview date cannot be more than 6 months in the future.")
        
        return value
    
    def validate_interview_notes(self, value):
        """Validate interview notes."""
        if value:
            # Length validation
            if len(value) > 1000:
                raise serializers.ValidationError("Interview notes cannot exceed 1000 characters.")
            
            # Check for suspicious patterns
            suspicious_patterns = [
                r'<script[^>]*>.*?</script>',
                r'javascript:',
                r'on\w+\s*=',
            ]
            
            for pattern in suspicious_patterns:
                if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                    raise serializers.ValidationError("Interview notes contain invalid content.")
        
        return value.strip() if value else value
    
    def validate(self, attrs):
        """Cross-field validation."""
        status = attrs.get('status')
        
        # Status-dependent field validation
        if status == 'interview_scheduled':
            if not attrs.get('interview_date') and (not self.instance or not self.instance.interview_date):
                raise serializers.ValidationError(
                    "Interview date is required when status is 'interview_scheduled'."
                )
        
        if status == 'rejected':
            review_notes = attrs.get('review_notes')
            if not review_notes and (not self.instance or not self.instance.review_notes):
                raise serializers.ValidationError(
                    "Review notes are required when rejecting an application."
                )
        
        return attrs


# --- Application Serializers (moved from internship) ---
# (Paste the full content of Edulink/internship/serializers/application_serializers.py here)


class ApplicationListSerializer(serializers.ModelSerializer):
    internship = InternshipSimpleSerializer(read_only=True)
    student = serializers.StringRelatedField(read_only=True)
    status = serializers.CharField(read_only=True)
    application_date = serializers.DateTimeField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "student",
            "internship",
            "status",
            "application_date",
            "is_active",
            "cover_letter",
            "resume",
            "reviewed_by",
            "reviewed_at",
            "review_notes",
        ]


# For employer/institution/internship application lists, you can use ApplicationListSerializer or extend as needed.


class ApplicationStatisticsSerializer(serializers.Serializer):
    total_applications = serializers.IntegerField()
    pending_applications = serializers.IntegerField()
    accepted_applications = serializers.IntegerField()
    rejected_applications = serializers.IntegerField()
    withdrawn_applications = serializers.IntegerField(required=False)
    total_internships = serializers.IntegerField(required=False)
    verified_internships = serializers.IntegerField(required=False)
