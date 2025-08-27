from rest_framework import serializers
from django.utils import timezone
from .models import Internship, SkillTag


class SkillTagSerializer(serializers.ModelSerializer):
    """Serializer for skill tags"""
    internship_count = serializers.ReadOnlyField()
    
    class Meta:
        model = SkillTag
        fields = ['id', 'name', 'description', 'is_active', 'internship_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class InternshipListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing internships"""
    skill_tags = SkillTagSerializer(many=True, read_only=True)
    is_expired = serializers.ReadOnlyField()
    can_apply = serializers.ReadOnlyField()
    application_count = serializers.ReadOnlyField()
    spots_remaining = serializers.ReadOnlyField()
    
    class Meta:
        model = Internship
        fields = [
            'id', 'title', 'category', 'experience_level', 'location_type', 'location',
            'start_date', 'end_date', 'duration_weeks', 'stipend', 'currency',
            'deadline', 'max_applications', 'is_verified', 'visibility', 'is_active',
            'is_featured', 'employer_id', 'institution_id', 'partner_institution_id',
            'skill_tags', 'is_expired', 'can_apply', 'application_count', 'spots_remaining',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_verified', 'verification_date', 'verified_by_id']


class InternshipDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for internship CRUD operations"""
    skill_tags = SkillTagSerializer(many=True, read_only=True)
    skill_tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of skill tag IDs to associate with this internship"
    )
    is_expired = serializers.ReadOnlyField()
    can_apply = serializers.ReadOnlyField()
    application_count = serializers.ReadOnlyField()
    spots_remaining = serializers.ReadOnlyField()
    
    class Meta:
        model = Internship
        fields = [
            'id', 'title', 'description', 'category', 'experience_level',
            'location_type', 'location', 'start_date', 'end_date', 'duration_weeks',
            'stipend', 'currency', 'required_skills', 'preferred_skills',
            'eligibility_criteria', 'min_gpa', 'required_year_of_study',
            'required_majors', 'deadline', 'max_applications', 'is_verified',
            'visibility', 'is_active', 'is_featured', 'employer_id', 'institution_id',
            'verified_by_id', 'verification_date', 'partner_institution_id',
            'benefits', 'application_instructions', 'skill_tags', 'skill_tag_ids',
            'is_expired', 'can_apply', 'application_count', 'spots_remaining',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_verified', 'verification_date', 'verified_by_id']
    
    def validate_deadline(self, value):
        """Ensure deadline is in the future"""
        if value <= timezone.now():
            raise serializers.ValidationError("Deadline must be in the future.")
        return value
    
    def validate_start_date(self, value):
        """Ensure start date is in the future"""
        if value <= timezone.now().date():
            raise serializers.ValidationError("Start date must be in the future.")
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        deadline = data.get('deadline')
        
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError("Start date must be before end date.")
        
        if deadline and start_date:
            deadline_date = deadline.date() if hasattr(deadline, 'date') else deadline
            if deadline_date >= start_date:
                raise serializers.ValidationError("Application deadline must be before start date.")
        
        return data
    
    def create(self, validated_data):
        """Create internship with skill tags"""
        skill_tag_ids = validated_data.pop('skill_tag_ids', [])
        internship = Internship.objects.create(**validated_data)
        
        if skill_tag_ids:
            skill_tags = SkillTag.objects.filter(id__in=skill_tag_ids, is_active=True)
            internship.skill_tags.set(skill_tags)
        
        return internship
    
    def update(self, instance, validated_data):
        """Update internship with skill tags"""
        skill_tag_ids = validated_data.pop('skill_tag_ids', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update skill tags if provided
        if skill_tag_ids is not None:
            skill_tags = SkillTag.objects.filter(id__in=skill_tag_ids, is_active=True)
            instance.skill_tags.set(skill_tags)
        
        return instance


class InternshipCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new internships"""
    skill_tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of skill tag IDs to associate with this internship"
    )
    
    class Meta:
        model = Internship
        fields = [
            'title', 'description', 'category', 'experience_level',
            'location_type', 'location', 'start_date', 'end_date', 'duration_weeks',
            'stipend', 'currency', 'required_skills', 'preferred_skills',
            'eligibility_criteria', 'min_gpa', 'required_year_of_study',
            'required_majors', 'deadline', 'max_applications', 'visibility',
            'employer_id', 'institution_id', 'partner_institution_id',
            'benefits', 'application_instructions', 'skill_tag_ids'
        ]
    
    def validate_deadline(self, value):
        """Ensure deadline is in the future"""
        if value <= timezone.now():
            raise serializers.ValidationError("Deadline must be in the future.")
        return value
    
    def validate_start_date(self, value):
        """Ensure start date is in the future"""
        if value <= timezone.now().date():
            raise serializers.ValidationError("Start date must be in the future.")
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        deadline = data.get('deadline')
        
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError("Start date must be before end date.")
        
        if deadline and start_date:
            deadline_date = deadline.date() if hasattr(deadline, 'date') else deadline
            if deadline_date >= start_date:
                raise serializers.ValidationError("Application deadline must be before start date.")
        
        return data
    
    def create(self, validated_data):
        """Create internship with skill tags"""
        skill_tag_ids = validated_data.pop('skill_tag_ids', [])
        internship = Internship.objects.create(**validated_data)
        
        if skill_tag_ids:
            skill_tags = SkillTag.objects.filter(id__in=skill_tag_ids, is_active=True)
            internship.skill_tags.set(skill_tags)
        
        return internship


class InternshipVerificationSerializer(serializers.ModelSerializer):
    """Serializer for internship verification by institution admins"""
    
    class Meta:
        model = Internship
        fields = ['is_verified', 'verified_by_id', 'verification_date']
        read_only_fields = ['verification_date']
    
    def update(self, instance, validated_data):
        """Update verification status"""
        if validated_data.get('is_verified'):
            instance.verification_date = timezone.now()
        else:
            instance.verification_date = None
            instance.verified_by_id = None
        
        instance.is_verified = validated_data.get('is_verified', instance.is_verified)
        instance.verified_by_id = validated_data.get('verified_by_id', instance.verified_by_id)
        instance.save()
        
        return instance


class InternshipStatsSerializer(serializers.Serializer):
    """Serializer for internship statistics"""
    total_internships = serializers.IntegerField()
    active_internships = serializers.IntegerField()
    verified_internships = serializers.IntegerField()
    pending_verification = serializers.IntegerField()
    expired_internships = serializers.IntegerField()
    featured_internships = serializers.IntegerField()
    by_category = serializers.DictField()
    by_location_type = serializers.DictField()
    by_experience_level = serializers.DictField()