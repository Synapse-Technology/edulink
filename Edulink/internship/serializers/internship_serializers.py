# core/serializers/internship_serializers.py

from rest_framework import serializers
from django.utils import timezone
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError
import re
from datetime import datetime, timedelta
from ..models.internship import Internship
from ..models.skill_tag import SkillTag


class SkillTagSerializer(serializers.ModelSerializer):
    """Serializer for SkillTag model"""
    class Meta:
        model = SkillTag
        fields = ['id', 'name', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate_name(self, value):
        """Validate skill tag name."""
        if not value or not value.strip():
            raise serializers.ValidationError("Skill tag name cannot be empty.")
        
        # Length validation
        if len(value) < 2:
            raise serializers.ValidationError("Skill tag name must be at least 2 characters long.")
        if len(value) > 50:
            raise serializers.ValidationError("Skill tag name cannot exceed 50 characters.")
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'on\w+\s*=',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                raise serializers.ValidationError("Skill tag name contains invalid content.")
        
        # Allow only alphanumeric characters, spaces, hyphens, and plus signs
        if not re.match(r'^[a-zA-Z0-9\s\-+#.]+$', value):
            raise serializers.ValidationError("Skill tag name contains invalid characters.")
        
        # Check for uniqueness (case-insensitive)
        normalized_name = value.strip().lower()
        existing_tag = SkillTag.objects.filter(name__iexact=normalized_name)
        if self.instance:
            existing_tag = existing_tag.exclude(pk=self.instance.pk)
        
        if existing_tag.exists():
            raise serializers.ValidationError("A skill tag with this name already exists.")
        
        return value.strip().title()  # Normalize to title case
    
    def validate_description(self, value):
        """Validate skill tag description."""
        if value:
            # Length validation
            if len(value) > 500:
                raise serializers.ValidationError("Description cannot exceed 500 characters.")
            
            # Check for suspicious patterns
            suspicious_patterns = [
                r'<script[^>]*>.*?</script>',
                r'javascript:',
                r'on\w+\s*=',
            ]
            
            for pattern in suspicious_patterns:
                if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                    raise serializers.ValidationError("Description contains invalid content.")
        
        return value.strip() if value else value


class InternshipSerializer(serializers.ModelSerializer):
    """
    Main serializer for the Internship model.
    """
    # Read-only fields for related data
    employer_name = serializers.CharField(source='employer.company_name', read_only=True)
    employer_email = serializers.CharField(source='employer.user.email', read_only=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True)

    # Skill tags
    skill_tags = SkillTagSerializer(many=True, read_only=True)
    skill_tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        queryset=SkillTag.objects.filter(is_active=True),
        required=False,
        source='skill_tags'
    )

    # Computed fields
    is_expired = serializers.BooleanField(read_only=True)
    can_apply = serializers.BooleanField(read_only=True)
    application_count = serializers.SerializerMethodField()

    class Meta:
        model = Internship
        fields = [
            'id',
            'employer',
            'employer_name',
            'employer_email',
            'institution',
            'institution_name',
            'title',
            'description',
            'category',
            'location',
            'start_date',
            'end_date',
            'stipend',
            'skills_required',
            'eligibility_criteria',
            'skill_tags',
            'skill_tag_ids',
            'deadline',
            'is_verified',
            'visibility',
            'is_active',
            'is_expired',
            'can_apply',
            'application_count',
            'created_at',
            'updated_at',
            'verified_by',
            'verification_date',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'employer_name',
            'employer_email', 'institution_name', 'is_expired',
            'can_apply', 'application_count'
        ]

    def get_application_count(self, obj):
        """Return the number of applications for this internship"""
        return obj.applications.count()

    def validate_title(self, value):
        """Validate internship title."""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        
        # Length validation
        if len(value) < 10:
            raise serializers.ValidationError("Title must be at least 10 characters long.")
        if len(value) > 200:
            raise serializers.ValidationError("Title cannot exceed 200 characters.")
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'on\w+\s*=',
            r'<iframe[^>]*>.*?</iframe>',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                raise serializers.ValidationError("Title contains invalid content.")
        
        # Check for excessive capitalization
        if value.isupper() and len(value) > 20:
            raise serializers.ValidationError("Title should not be entirely in uppercase.")
        
        return value.strip()
    
    def validate_description(self, value):
        """Validate internship description."""
        if not value or not value.strip():
            raise serializers.ValidationError("Description cannot be empty.")
        
        # Length validation
        if len(value) < 100:
            raise serializers.ValidationError("Description must be at least 100 characters long.")
        if len(value) > 5000:
            raise serializers.ValidationError("Description cannot exceed 5000 characters.")
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'on\w+\s*=',
            r'<iframe[^>]*>.*?</iframe>',
            r'<object[^>]*>.*?</object>',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                raise serializers.ValidationError("Description contains invalid content.")
        
        # Check for excessive repetition
        words = value.lower().split()
        if len(words) > 0:
            word_count = {}
            for word in words:
                if len(word) > 4:  # Only check words longer than 4 characters
                    word_count[word] = word_count.get(word, 0) + 1
            
            # Check if any word appears more than 10% of total words
            max_repetition = max(word_count.values()) if word_count else 0
            if max_repetition > len(words) * 0.1 and max_repetition > 10:
                raise serializers.ValidationError("Description contains excessive word repetition.")
        
        return value.strip()
    
    def validate_location(self, value):
        """Validate internship location."""
        if not value or not value.strip():
            raise serializers.ValidationError("Location cannot be empty.")
        
        # Length validation
        if len(value) < 3:
            raise serializers.ValidationError("Location must be at least 3 characters long.")
        if len(value) > 200:
            raise serializers.ValidationError("Location cannot exceed 200 characters.")
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'on\w+\s*=',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                raise serializers.ValidationError("Location contains invalid content.")
        
        # Basic format validation (allow letters, numbers, spaces, commas, hyphens)
        if not re.match(r'^[a-zA-Z0-9\s,.-]+$', value):
            raise serializers.ValidationError("Location contains invalid characters.")
        
        return value.strip()
    
    def validate_stipend(self, value):
        """Validate stipend amount."""
        if value is not None:
            if value < 0:
                raise serializers.ValidationError("Stipend cannot be negative.")
            if value > 1000000:  # 1 million limit
                raise serializers.ValidationError("Stipend amount seems unreasonably high.")
        
        return value
    
    def validate_skills_required(self, value):
        """Validate skills required field."""
        if value:
            # Length validation
            if len(value) > 1000:
                raise serializers.ValidationError("Skills required cannot exceed 1000 characters.")
            
            # Check for suspicious patterns
            suspicious_patterns = [
                r'<script[^>]*>.*?</script>',
                r'javascript:',
                r'on\w+\s*=',
            ]
            
            for pattern in suspicious_patterns:
                if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                    raise serializers.ValidationError("Skills required contains invalid content.")
        
        return value.strip() if value else value
    
    def validate_eligibility_criteria(self, value):
        """Validate eligibility criteria field."""
        if value:
            # Length validation
            if len(value) > 1000:
                raise serializers.ValidationError("Eligibility criteria cannot exceed 1000 characters.")
            
            # Check for suspicious patterns
            suspicious_patterns = [
                r'<script[^>]*>.*?</script>',
                r'javascript:',
                r'on\w+\s*=',
            ]
            
            for pattern in suspicious_patterns:
                if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                    raise serializers.ValidationError("Eligibility criteria contains invalid content.")
        
        return value.strip() if value else value
    
    def validate_deadline(self, value):
        """Validate application deadline."""
        if not value:
            raise serializers.ValidationError("Application deadline is required.")
        
        # Must be in the future
        if value <= timezone.now():
            raise serializers.ValidationError("Application deadline must be in the future.")
        
        # Cannot be more than 2 years in the future
        max_deadline = timezone.now() + timedelta(days=730)
        if value > max_deadline:
            raise serializers.ValidationError("Application deadline cannot be more than 2 years in the future.")
        
        return value
    
    def validate_start_date(self, value):
        """Validate internship start date."""
        if not value:
            raise serializers.ValidationError("Start date is required.")
        
        # Start date should be reasonable (not too far in the past or future)
        min_date = timezone.now().date() - timedelta(days=30)  # Allow 30 days in the past
        max_date = timezone.now().date() + timedelta(days=730)  # Max 2 years in future
        
        if value < min_date:
            raise serializers.ValidationError("Start date cannot be more than 30 days in the past.")
        if value > max_date:
            raise serializers.ValidationError("Start date cannot be more than 2 years in the future.")
        
        return value
    
    def validate_end_date(self, value):
        """Validate internship end date."""
        if not value:
            raise serializers.ValidationError("End date is required.")
        
        # End date should be reasonable
        max_date = timezone.now().date() + timedelta(days=1095)  # Max 3 years in future
        if value > max_date:
            raise serializers.ValidationError("End date cannot be more than 3 years in the future.")
        
        return value
    
    def validate_category(self, value):
        """Validate internship category."""
        if not value or not value.strip():
            raise serializers.ValidationError("Category is required.")
        
        # Length validation
        if len(value) > 100:
            raise serializers.ValidationError("Category cannot exceed 100 characters.")
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'on\w+\s*=',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE | re.DOTALL):
                raise serializers.ValidationError("Category contains invalid content.")
        
        return value.strip()
    
    def validate_skill_tag_ids(self, value):
        """Validate skill tag selection."""
        if value and len(value) > 20:
            raise serializers.ValidationError("Cannot select more than 20 skill tags.")
        
        return value

    def validate(self, data):
        """Cross-field validation."""
        # Validate date relationships
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        deadline = data.get('deadline')
        
        if start_date and end_date:
            if end_date <= start_date:
                raise serializers.ValidationError("End date must be after start date.")
            
            # Check internship duration (minimum 1 week, maximum 2 years)
            duration = (end_date - start_date).days
            if duration < 7:
                raise serializers.ValidationError("Internship duration must be at least 1 week.")
            if duration > 730:
                raise serializers.ValidationError("Internship duration cannot exceed 2 years.")
        
        if deadline and start_date:
            if deadline.date() >= start_date:
                raise serializers.ValidationError("Application deadline must be before the start date.")
        
        # Validate visibility and verification relationship
        visibility = data.get('visibility')
        if visibility == 'public' and self.instance and not self.instance.is_verified:
            raise serializers.ValidationError(
                "Internship must be verified before it can be made public."
            )
        
        return data


class InternshipCreateSerializer(InternshipSerializer):
    """
    Serializer for creating internships - ensures employer is set automatically.
    """
    class Meta(InternshipSerializer.Meta):
        read_only_fields = InternshipSerializer.Meta.read_only_fields + ['employer']


class InternshipUpdateSerializer(InternshipSerializer):
    """
    Serializer for updating internships - prevents changing certain fields after verification.
    """

    def validate(self, data):
        """Prevent updating certain fields if internship is verified"""
        instance = self.instance
        if instance and instance.is_verified:
            # Don't allow changing these fields after verification
            for field in ['employer', 'institution', 'title', 'description']:
                if field in data and getattr(instance, field) != data[field]:
                    raise serializers.ValidationError(
                        f"Cannot change {field} after internship is verified."
                    )

        return super().validate(data)


class InternshipVerificationSerializer(serializers.ModelSerializer):
    """
    Serializer for verifying internships by institution admins.
    """
    class Meta:
        model = Internship
        fields = ['is_verified']
        read_only_fields = ['is_verified']

    def update(self, instance, validated_data):
        """Mark internship as verified and set verification timestamp"""
        instance.is_verified = True
        instance.save()
        return instance


class InternshipListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing internships.
    """
    employer_name = serializers.CharField(source='employer.company_name', read_only=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    skill_tags = SkillTagSerializer(many=True, read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    can_apply = serializers.BooleanField(read_only=True)
    application_count = serializers.SerializerMethodField()

    class Meta:
        model = Internship
        fields = [
            'id', 'title', 'employer_name', 'institution_name', 'category',
            'location', 'start_date', 'end_date', 'stipend', 'deadline',
            'is_verified', 'visibility', 'skill_tags', 'is_expired',
            'can_apply', 'application_count', 'created_at'
        ]

    def get_application_count(self, obj):
        return obj.applications.count()
