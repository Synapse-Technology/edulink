# core/serializers/internship_serializers.py

from rest_framework import serializers
from django.utils import timezone
from ..models.internship import Internship
from ..models.skill_tag import SkillTag


class SkillTagSerializer(serializers.ModelSerializer):
    """Serializer for SkillTag model"""
    class Meta:
        model = SkillTag
        fields = ['id', 'name', 'description']


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

    def validate_deadline(self, value):
        """Ensure deadline is in the future"""
        if value <= timezone.now():
            raise serializers.ValidationError("Application deadline must be in the future.")
        return value

    def validate_end_date(self, value):
        """Ensure end date is after start date"""
        start_date = self.initial_data.get('start_date')
        if start_date and value <= start_date:
            raise serializers.ValidationError("End date must be after start date.")
        return value

    def validate(self, data):
        """Additional validation"""
        # Ensure start date is in the future
        if data.get('start_date') and data['start_date'] < timezone.now().date():
            raise serializers.ValidationError("Start date cannot be in the past.")

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
