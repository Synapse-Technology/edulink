from rest_framework import serializers
from django.contrib.auth import get_user_model
from users.models.employer_profile import EmployerProfile
from users.serializers.profile_serializer import ProfileBaseSerializer
from .models import (
    CompanySettings, OpportunityImage, VisibilityControl,
    ApplicationRequirement, CustomApplicationQuestion
)
from institutions.models import Institution
from internship.models.internship import Internship

User = get_user_model()


class EmployerSerializer(ProfileBaseSerializer):
    """Serializer for EmployerProfile model."""
    
    email = serializers.EmailField(source='user.email', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    
    class Meta(ProfileBaseSerializer.Meta):
        model = EmployerProfile
        fields = ProfileBaseSerializer.Meta.fields + [
            'email',
            'user_role',
            'company_name',
            'company_description',
            'website',
            'industry',
            'company_size',
            'location',
            'department',
            'position',
            'is_verified',
        ]
        read_only_fields = ProfileBaseSerializer.Meta.read_only_fields + ['is_verified']


class EmployerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating EmployerProfile profiles."""
    
    email = serializers.EmailField(source='user.email')
    password = serializers.CharField(source='user.password', write_only=True)
    role = serializers.CharField(source='user.role', default='employer')
    
    class Meta:
        model = EmployerProfile
        fields = [
            'email',
            'password',
            'role',
            'first_name',
            'last_name',
            'phone_number',
            'company_name',
            'company_description',
            'website',
            'industry',
            'company_size',
            'location',
            'department',
            'position',
        ]
    
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        password = user_data.pop('password')
        
        # Create user with email as username
        user = User.objects.create_user(
            email=user_data['email'],
            password=password,
            role=user_data.get('role', 'employer')
        )
        
        # Create employer profile
        employer = EmployerProfile.objects.create(user=user, **validated_data)
        return employer


class CompanySettingsSerializer(serializers.ModelSerializer):
    """Serializer for CompanySettings model."""
    
    class Meta:
        model = CompanySettings
        fields = [
            'id', 'employer_profile', 'company_logo', 'logo_alt_text',
            'default_visibility', 'default_require_cover_letter',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_company_logo(self, value):
        """Validate company logo file size and format."""
        if value:
            # Check file size (max 5MB)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError(
                    "Logo file size cannot exceed 5MB."
                )
        return value


class OpportunityImageSerializer(serializers.ModelSerializer):
    """Serializer for OpportunityImage model."""
    
    class Meta:
        model = OpportunityImage
        fields = [
            'id', 'internship', 'image', 'alt_text',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_image(self, value):
        """Validate opportunity image file size and format."""
        if value:
            # Check file size (max 10MB)
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError(
                    "Image file size cannot exceed 10MB."
                )
        return value


class VisibilityControlSerializer(serializers.ModelSerializer):
    """Serializer for VisibilityControl model."""
    
    restricted_institutions = serializers.PrimaryKeyRelatedField(
        queryset=Institution.objects.all(),
        many=True,
        required=False
    )
    
    restricted_institutions_details = serializers.SerializerMethodField()
    
    class Meta:
        model = VisibilityControl
        fields = [
            'id', 'internship', 'visibility_type', 'restricted_institutions',
            'restricted_institutions_details', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'restricted_institutions_details']
    
    def get_restricted_institutions_details(self, obj):
        """Get detailed information about restricted institutions."""
        return [
            {
                'id': inst.id,
                'name': inst.name,
                'institution_type': inst.institution_type
            }
            for inst in obj.restricted_institutions.all()
        ]
    
    def validate(self, data):
        """Validate visibility control data."""
        visibility_type = data.get('visibility_type')
        restricted_institutions = data.get('restricted_institutions', [])
        
        if visibility_type == 'restricted' and not restricted_institutions:
            raise serializers.ValidationError(
                "At least one institution must be selected for restricted visibility."
            )
        
        if visibility_type == 'public' and restricted_institutions:
            raise serializers.ValidationError(
                "Restricted institutions should not be set for public visibility."
            )
        
        return data


class CustomApplicationQuestionSerializer(serializers.ModelSerializer):
    """Serializer for CustomApplicationQuestion model."""
    
    class Meta:
        model = CustomApplicationQuestion
        fields = [
            'id', 'application_requirement', 'question_text', 'question_type',
            'is_required', 'order', 'choices', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate custom application question data."""
        question_type = data.get('question_type')
        choices = data.get('choices', [])
        
        if question_type == 'multiple' and not choices:
            raise serializers.ValidationError(
                "Choices must be provided for multiple choice questions."
            )
        
        if question_type != 'multiple' and choices:
            raise serializers.ValidationError(
                "Choices should only be provided for multiple choice questions."
            )
        
        return data


class ApplicationRequirementSerializer(serializers.ModelSerializer):
    """Serializer for ApplicationRequirement model."""
    
    custom_questions = CustomApplicationQuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = ApplicationRequirement
        fields = [
            'id', 'internship', 'require_cover_letter', 'enable_custom_questions',
            'custom_questions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'custom_questions']