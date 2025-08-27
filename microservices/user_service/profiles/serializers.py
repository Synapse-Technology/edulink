from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import StudentProfile, EmployerProfile, InstitutionProfile, ProfileInvitation
from companies.models import Company, Department
from companies.serializers import CompanySerializer, DepartmentSerializer
from user_service.utils import verify_user_exists


class ProfileBaseSerializer(serializers.ModelSerializer):
    """Base serializer for profile models."""
    
    profile_completion_score = serializers.ReadOnlyField()
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        fields = [
            'id', 'user_id', 'first_name', 'last_name', 'full_name',
            'phone_number', 'profile_picture', 'phone_verified',
            'is_active', 'last_login_at', 'profile_completion_score',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'profile_completion_score', 'created_at', 'updated_at'
        ]
    
    def get_full_name(self, obj):
        """Get full name of the profile."""
        return f"{obj.first_name} {obj.last_name}".strip()
    
    def validate_user_id(self, value):
        """Validate that user exists in auth service."""
        if not verify_user_exists(value):
            raise serializers.ValidationError("User does not exist in auth service.")
        return value


class StudentProfileSerializer(ProfileBaseSerializer):
    """Serializer for StudentProfile model."""
    
    class Meta(ProfileBaseSerializer.Meta):
        model = StudentProfile
        fields = ProfileBaseSerializer.Meta.fields + [
            'institution_id', 'institution_name', 'registration_number',
            'year_of_study', 'course_id', 'course_name', 'department_id',
            'department_name', 'campus_id', 'campus_name', 'is_verified',
            'university_verified', 'national_id_verified', 'last_university_sync',
            'university_code_used', 'registration_method', 'academic_year',
            'gender', 'date_of_birth', 'national_id', 'address', 'bio',
            'skills', 'interests', 'internship_status', 'github_url',
            'linkedin_url', 'twitter_url', 'portfolio_url', 'resume'
        ]
        read_only_fields = ProfileBaseSerializer.Meta.read_only_fields + [
            'is_verified', 'university_verified', 'national_id_verified',
            'last_university_sync', 'institution_name', 'course_name',
            'department_name', 'campus_name'
        ]
    
    def validate_registration_number(self, value):
        """Validate registration number format and uniqueness."""
        if value:
            # Check if registration number already exists for different user
            existing = StudentProfile.objects.filter(
                registration_number=value
            ).exclude(user_id=self.instance.user_id if self.instance else None)
            
            if existing.exists():
                raise serializers.ValidationError(
                    "Registration number already exists for another student."
                )
        return value
    
    def validate_national_id(self, value):
        """Validate national ID uniqueness."""
        if value:
            existing = StudentProfile.objects.filter(
                national_id=value
            ).exclude(user_id=self.instance.user_id if self.instance else None)
            
            if existing.exists():
                raise serializers.ValidationError(
                    "National ID already exists for another student."
                )
        return value
    
    def validate(self, attrs):
        """Validate student profile data."""
        # Validate institution and registration number combination
        institution_id = attrs.get('institution_id')
        registration_number = attrs.get('registration_number')
        
        if institution_id and registration_number:
            existing = StudentProfile.objects.filter(
                institution_id=institution_id,
                registration_number=registration_number
            ).exclude(user_id=self.instance.user_id if self.instance else None)
            
            if existing.exists():
                raise serializers.ValidationError({
                    'registration_number': 'This registration number already exists for this institution.'
                })
        
        return attrs


class StudentProfileListSerializer(serializers.ModelSerializer):
    """Simplified serializer for student profile lists."""
    
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentProfile
        fields = [
            'id', 'user_id', 'full_name', 'institution_name',
            'year_of_study', 'course_name', 'internship_status',
            'profile_completion_score', 'is_verified', 'created_at'
        ]
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class EmployerProfileSerializer(ProfileBaseSerializer):
    """Serializer for EmployerProfile model."""
    
    company = CompanySerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    company_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    department_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    class Meta(ProfileBaseSerializer.Meta):
        model = EmployerProfile
        fields = ProfileBaseSerializer.Meta.fields + [
            'company', 'department', 'company_id', 'department_id',
            'position', 'is_verified', 'verification_documents'
        ]
        read_only_fields = ProfileBaseSerializer.Meta.read_only_fields + [
            'is_verified', 'verification_documents', 'company', 'department'
        ]
    
    def validate_company_id(self, value):
        """Validate that company exists."""
        if value and not Company.objects.filter(id=value).exists():
            raise serializers.ValidationError("Company does not exist.")
        return value
    
    def validate_department_id(self, value):
        """Validate that department exists."""
        if value and not Department.objects.filter(id=value).exists():
            raise serializers.ValidationError("Department does not exist.")
        return value
    
    def validate(self, attrs):
        """Validate that department belongs to company."""
        attrs = super().validate(attrs)
        company_id = attrs.get('company_id')
        department_id = attrs.get('department_id')
        
        if department_id and company_id:
            department = Department.objects.filter(id=department_id).first()
            if department and department.company_id != company_id:
                raise serializers.ValidationError({
                    'department_id': 'Department must belong to the selected company.'
                })
        
        return attrs


class EmployerProfileListSerializer(serializers.ModelSerializer):
    """Simplified serializer for employer profile lists."""
    
    full_name = serializers.SerializerMethodField()
    company_name = serializers.CharField(source='company.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = EmployerProfile
        fields = [
            'id', 'user_id', 'full_name', 'company_name', 'department_name',
            'position', 'profile_completion_score', 'is_verified', 'created_at'
        ]
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class EmployerProfileBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for employer profile with minimal fields."""
    
    full_name = serializers.SerializerMethodField()
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = EmployerProfile
        fields = [
            'id', 'user_id', 'full_name', 'company_name', 'position'
        ]
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class InstitutionProfileSerializer(ProfileBaseSerializer):
    """Serializer for InstitutionProfile model."""
    
    class Meta(ProfileBaseSerializer.Meta):
        model = InstitutionProfile
        fields = ProfileBaseSerializer.Meta.fields + [
            'institution_id', 'position', 'department', 'can_verify_students',
            'can_manage_courses', 'can_manage_departments', 'can_view_analytics'
        ]
        read_only_fields = ProfileBaseSerializer.Meta.read_only_fields + [
            'can_verify_students', 'can_manage_courses',
            'can_manage_departments', 'can_view_analytics'
        ]


class ProfileInvitationSerializer(serializers.ModelSerializer):
    """Serializer for ProfileInvitation model."""
    
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = ProfileInvitation
        fields = [
            'id', 'email', 'profile_type', 'invited_by_user_id',
            'token', 'is_used', 'expires_at', 'used_at', 'is_expired',
            'institution_id', 'employer_id', 'metadata', 'created_at'
        ]
        read_only_fields = [
            'id', 'token', 'is_used', 'used_at', 'is_expired', 'created_at'
        ]
    
    def validate_email(self, value):
        """Validate email format and uniqueness for active invitations."""
        # Check for existing active invitations
        existing = ProfileInvitation.objects.filter(
            email=value,
            is_used=False,
            expires_at__gt=timezone.now()
        )
        
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        
        if existing.exists():
            raise serializers.ValidationError(
                "An active invitation already exists for this email."
            )
        
        return value.lower().strip()
    
    def validate(self, attrs):
        """Validate invitation data based on profile type."""
        profile_type = attrs.get('profile_type')
        institution_id = attrs.get('institution_id')
        employer_id = attrs.get('employer_id')
        
        if profile_type == 'student' and not institution_id:
            raise serializers.ValidationError({
                'institution_id': 'Institution ID is required for student invitations.'
            })
        
        if profile_type == 'employer' and not employer_id:
            raise serializers.ValidationError({
                'employer_id': 'Employer ID is required for employer invitations.'
            })
        
        if profile_type == 'institution' and not institution_id:
            raise serializers.ValidationError({
                'institution_id': 'Institution ID is required for institution invitations.'
            })
        
        return attrs


class ProfileStatsSerializer(serializers.Serializer):
    """Serializer for profile statistics."""
    
    total_students = serializers.IntegerField()
    total_employers = serializers.IntegerField()
    total_institutions = serializers.IntegerField()
    verified_students = serializers.IntegerField()
    verified_employers = serializers.IntegerField()
    active_profiles = serializers.IntegerField()
    avg_completion_score = serializers.FloatField()
    recent_registrations = serializers.IntegerField()


class ProfileCompletionSerializer(serializers.Serializer):
    """Serializer for profile completion data."""
    
    profile_type = serializers.CharField()
    completion_score = serializers.IntegerField()
    missing_fields = serializers.ListField(child=serializers.CharField())
    suggestions = serializers.ListField(child=serializers.CharField())