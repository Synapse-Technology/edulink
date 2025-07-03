# core/serializers/internship_serializers.py

from rest_framework import serializers
from django.utils import timezone
from ..models.internship import Internship
from ..models.skill_tag import SkillTag
from datetime import datetime

class SkillTagSerializer(serializers.ModelSerializer):
    """Serializer for SkillTag model"""
    class Meta:
        model = SkillTag
        fields = ['id', 'name', 'description']

class InternshipSerializer(serializers.ModelSerializer):
    """
    Main serializer for the Internship model.
    """
    # Read-only fields to include related object data
    employer_email = serializers.ReadOnlyField(source='employer.email')
    institution_name = serializers.ReadOnlyField(source='institution.name') # Assuming Institution model has a 'name' field
    is_verified_by_institution = serializers.BooleanField(read_only=True)
    verified_by = serializers.StringRelatedField(read_only=True)
    verification_date = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Internship
        fields = [
            'id',
            'employer',
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
            'deadline',
            'is_verified',
            'visibility',
            'is_active',
            'is_verified_by_institution',
            'verified_by',
            'verification_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'employer_email', 'institution_name', 'is_verified_by_institution', 'verified_by', 'verification_date']

class InternshipCreateSerializer(InternshipSerializer):
    class Meta(InternshipSerializer.Meta):
        read_only_fields = InternshipSerializer.Meta.read_only_fields + ['employer']

class InternshipUpdateSerializer(InternshipSerializer):
    def validate(self, data):
        instance = self.instance
        if instance and instance.is_verified:
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