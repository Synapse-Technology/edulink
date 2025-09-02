from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from datetime import timedelta

from .models import (
    Institution, InstitutionDepartment, InstitutionProgram,
    InstitutionSettings, InstitutionInvitation, UniversityRegistrationCode,
    MasterInstitution
)
from user_service.utils import ServiceClient, validate_file_size, validate_file_type


class MasterInstitutionSerializer(serializers.ModelSerializer):
    """Serializer for MasterInstitution model."""
    
    display_name = serializers.ReadOnlyField()
    accreditation_body_display = serializers.CharField(source='get_accreditation_body_display', read_only=True)
    data_source_display = serializers.CharField(source='get_data_source_display', read_only=True)
    
    class Meta:
        model = MasterInstitution
        fields = [
            'id', 'name', 'short_name', 'institution_type', 'accreditation_body',
            'accreditation_number', 'accreditation_status', 'location', 'county',
            'region', 'website', 'email', 'phone', 'data_source', 'source_url',
            'last_verified', 'is_active', 'is_verified', 'raw_data', 'metadata',
            'display_name', 'accreditation_body_display', 'data_source_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'last_verified', 'display_name',
            'accreditation_body_display', 'data_source_display'
        ]
    
    def validate_name(self, value):
        """Validate institution name."""
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Institution name must be at least 3 characters long.")
        return value.strip()


class MasterInstitutionSearchSerializer(serializers.ModelSerializer):
    """Simplified serializer for institution search results."""
    
    display_name = serializers.ReadOnlyField()
    accreditation_body_display = serializers.CharField(source='get_accreditation_body_display', read_only=True)
    
    class Meta:
        model = MasterInstitution
        fields = [
            'id', 'name', 'short_name', 'institution_type', 'accreditation_body',
            'accreditation_status', 'location', 'county', 'display_name',
            'accreditation_body_display', 'is_verified'
        ]


class InstitutionSerializer(serializers.ModelSerializer):
    """Serializer for Institution model."""
    
    full_address = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    student_count = serializers.ReadOnlyField()
    faculty_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Institution
        fields = [
            'id', 'name', 'short_name', 'description', 'institution_type',
            'email', 'phone_number', 'website', 'address_line_1', 'address_line_2',
            'city', 'state_province', 'postal_code', 'country', 'registration_number',
            'tax_id', 'accreditation_number', 'status', 'is_verified', 'is_public',
            'logo', 'banner_image', 'established_year', 'student_count', 'faculty_count',
            'settings', 'metadata', 'full_address', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_verified']
    
    def validate_name(self, value):
        """Validate institution name."""
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Institution name must be at least 3 characters long.")
        return value.strip()
    
    def validate_email(self, value):
        """Validate institution email uniqueness."""
        if self.instance:
            # Update case - exclude current instance
            if Institution.objects.exclude(id=self.instance.id).filter(email=value).exists():
                raise serializers.ValidationError("An institution with this email already exists.")
        else:
            # Create case
            if Institution.objects.filter(email=value).exists():
                raise serializers.ValidationError("An institution with this email already exists.")
        return value
    
    def validate_registration_number(self, value):
        """Validate registration number uniqueness."""
        if not value:
            return value
        
        if self.instance:
            # Update case - exclude current instance
            if Institution.objects.exclude(id=self.instance.id).filter(registration_number=value).exists():
                raise serializers.ValidationError("An institution with this registration number already exists.")
        else:
            # Create case
            if Institution.objects.filter(registration_number=value).exists():
                raise serializers.ValidationError("An institution with this registration number already exists.")
        return value
    
    def validate_logo(self, value):
        """Validate logo file."""
        if value:
            validate_file_size(value, max_size_mb=5)
            validate_file_type(value, allowed_types=['image/jpeg', 'image/png', 'image/gif'])
        return value
    
    def validate_banner_image(self, value):
        """Validate banner image file."""
        if value:
            validate_file_size(value, max_size_mb=10)
            validate_file_type(value, allowed_types=['image/jpeg', 'image/png', 'image/gif'])
        return value
    
    def validate_established_year(self, value):
        """Validate established year."""
        if value:
            current_year = timezone.now().year
            if value > current_year:
                raise serializers.ValidationError("Established year cannot be in the future.")
            if value < 1000:
                raise serializers.ValidationError("Established year must be a valid year.")
        return value
    
    def validate(self, attrs):
        """Validate institution data."""
        # Validate unique together constraint for name and country
        name = attrs.get('name')
        country = attrs.get('country')
        
        if name and country:
            query = Institution.objects.filter(name=name, country=country)
            if self.instance:
                query = query.exclude(id=self.instance.id)
            
            if query.exists():
                raise serializers.ValidationError({
                    'name': 'An institution with this name already exists in this country.'
                })
        
        return attrs


class InstitutionListSerializer(serializers.ModelSerializer):
    """Simplified serializer for institution lists."""
    
    is_active = serializers.ReadOnlyField()
    
    class Meta:
        model = Institution
        fields = [
            'id', 'name', 'short_name', 'institution_type', 'email',
            'city', 'state_province', 'country', 'status', 'is_verified',
            'logo', 'student_count', 'faculty_count', 'is_active', 'created_at'
        ]


class InstitutionDepartmentSerializer(serializers.ModelSerializer):
    """Serializer for InstitutionDepartment model."""
    
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    
    class Meta:
        model = InstitutionDepartment
        fields = [
            'id', 'institution', 'institution_name', 'name', 'code', 'description',
            'head_name', 'email', 'phone_number', 'is_active', 'metadata',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        """Validate department name."""
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Department name must be at least 2 characters long.")
        return value.strip()
    
    def validate_code(self, value):
        """Validate department code."""
        if value:
            value = value.upper().strip()
            if len(value) < 2:
                raise serializers.ValidationError("Department code must be at least 2 characters long.")
        return value
    
    def validate(self, attrs):
        """Validate department data."""
        institution = attrs.get('institution')
        name = attrs.get('name')
        code = attrs.get('code')
        
        if institution and name:
            # Check name uniqueness within institution
            query = InstitutionDepartment.objects.filter(institution=institution, name=name)
            if self.instance:
                query = query.exclude(id=self.instance.id)
            
            if query.exists():
                raise serializers.ValidationError({
                    'name': 'A department with this name already exists in this institution.'
                })
        
        if institution and code:
            # Check code uniqueness within institution
            query = InstitutionDepartment.objects.filter(institution=institution, code=code)
            if self.instance:
                query = query.exclude(id=self.instance.id)
            
            if query.exists():
                raise serializers.ValidationError({
                    'code': 'A department with this code already exists in this institution.'
                })
        
        return attrs


class InstitutionProgramSerializer(serializers.ModelSerializer):
    """Serializer for InstitutionProgram model."""
    
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = InstitutionProgram
        fields = [
            'id', 'institution', 'institution_name', 'department', 'department_name',
            'name', 'code', 'description', 'degree_type', 'duration_months',
            'credits_required', 'is_active', 'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        """Validate program name."""
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Program name must be at least 3 characters long.")
        return value.strip()
    
    def validate_code(self, value):
        """Validate program code."""
        if value:
            value = value.upper().strip()
            if len(value) < 2:
                raise serializers.ValidationError("Program code must be at least 2 characters long.")
        return value
    
    def validate_duration_months(self, value):
        """Validate program duration."""
        if value <= 0:
            raise serializers.ValidationError("Duration must be positive.")
        if value > 120:  # 10 years max
            raise serializers.ValidationError("Duration cannot exceed 120 months.")
        return value
    
    def validate_credits_required(self, value):
        """Validate credits required."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Credits required must be positive.")
        return value
    
    def validate(self, attrs):
        """Validate program data."""
        institution = attrs.get('institution')
        department = attrs.get('department')
        name = attrs.get('name')
        code = attrs.get('code')
        
        # Validate department belongs to same institution
        if department and institution and department.institution != institution:
            raise serializers.ValidationError({
                'department': 'Department must belong to the same institution.'
            })
        
        if institution and name:
            # Check name uniqueness within institution
            query = InstitutionProgram.objects.filter(institution=institution, name=name)
            if self.instance:
                query = query.exclude(id=self.instance.id)
            
            if query.exists():
                raise serializers.ValidationError({
                    'name': 'A program with this name already exists in this institution.'
                })
        
        if institution and code:
            # Check code uniqueness within institution
            query = InstitutionProgram.objects.filter(institution=institution, code=code)
            if self.instance:
                query = query.exclude(id=self.instance.id)
            
            if query.exists():
                raise serializers.ValidationError({
                    'code': 'A program with this code already exists in this institution.'
                })
        
        return attrs


class InstitutionSettingsSerializer(serializers.ModelSerializer):
    """Serializer for InstitutionSettings model."""
    
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    
    class Meta:
        model = InstitutionSettings
        fields = [
            'id', 'institution', 'institution_name', 'academic_year_start_month',
            'grading_system', 'allow_internships', 'require_internship_approval',
            'min_internship_duration_weeks', 'max_internship_duration_weeks',
            'require_profile_verification', 'allow_public_profiles',
            'notification_settings', 'integration_settings', 'custom_settings',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_academic_year_start_month(self, value):
        """Validate academic year start month."""
        if not 1 <= value <= 12:
            raise serializers.ValidationError("Month must be between 1 and 12.")
        return value
    
    def validate_min_internship_duration_weeks(self, value):
        """Validate minimum internship duration."""
        if value <= 0:
            raise serializers.ValidationError("Minimum duration must be positive.")
        return value
    
    def validate_max_internship_duration_weeks(self, value):
        """Validate maximum internship duration."""
        if value <= 0:
            raise serializers.ValidationError("Maximum duration must be positive.")
        return value
    
    def validate(self, attrs):
        """Validate settings data."""
        min_duration = attrs.get('min_internship_duration_weeks')
        max_duration = attrs.get('max_internship_duration_weeks')
        
        if min_duration and max_duration and max_duration <= min_duration:
            raise serializers.ValidationError({
                'max_internship_duration_weeks': 'Maximum duration must be greater than minimum duration.'
            })
        
        return attrs


class InstitutionInvitationSerializer(serializers.ModelSerializer):
    """Serializer for InstitutionInvitation model."""
    
    is_expired = serializers.ReadOnlyField()
    is_valid = serializers.ReadOnlyField()
    created_institution_name = serializers.CharField(source='created_institution.name', read_only=True)
    
    class Meta:
        model = InstitutionInvitation
        fields = [
            'id', 'institution_name', 'institution_email', 'contact_person_name',
            'contact_person_email', 'token', 'expires_at', 'is_used', 'used_at',
            'invited_by_user_id', 'invitation_message', 'metadata',
            'created_institution', 'created_institution_name', 'is_expired',
            'is_valid', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'token', 'is_used', 'used_at', 'created_institution',
            'created_at', 'updated_at'
        ]
    
    def validate_institution_name(self, value):
        """Validate institution name."""
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Institution name must be at least 3 characters long.")
        return value.strip()
    
    def validate_institution_email(self, value):
        """Validate institution email uniqueness."""
        if Institution.objects.filter(email=value).exists():
            raise serializers.ValidationError("An institution with this email already exists.")
        
        # Check for pending invitations
        if self.instance:
            query = InstitutionInvitation.objects.exclude(id=self.instance.id)
        else:
            query = InstitutionInvitation.objects.all()
        
        if query.filter(institution_email=value, is_used=False, expires_at__gt=timezone.now()).exists():
            raise serializers.ValidationError("A pending invitation for this email already exists.")
        
        return value
    
    def validate_expires_at(self, value):
        """Validate expiration date."""
        if value <= timezone.now():
            raise serializers.ValidationError("Expiration date must be in the future.")
        
        # Maximum 30 days in the future
        max_expiry = timezone.now() + timedelta(days=30)
        if value > max_expiry:
            raise serializers.ValidationError("Expiration date cannot be more than 30 days in the future.")
        
        return value
    
    def create(self, validated_data):
        """Create invitation with default expiration if not provided."""
        if 'expires_at' not in validated_data:
            validated_data['expires_at'] = timezone.now() + timedelta(days=7)
        
        return super().create(validated_data)


class InstitutionStatsSerializer(serializers.Serializer):
    """Serializer for institution statistics."""
    
    total_institutions = serializers.IntegerField()
    active_institutions = serializers.IntegerField()
    verified_institutions = serializers.IntegerField()
    pending_institutions = serializers.IntegerField()
    total_students = serializers.IntegerField()
    total_departments = serializers.IntegerField()
    total_programs = serializers.IntegerField()
    institutions_by_type = serializers.DictField()
    institutions_by_country = serializers.DictField()
    recent_registrations = serializers.IntegerField()


class InstitutionVerificationSerializer(serializers.Serializer):
    """Serializer for institution verification."""
    
    institution_id = serializers.IntegerField()
    verification_status = serializers.ChoiceField(choices=['verified', 'rejected'])
    verification_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    
    def validate_institution_id(self, value):
        """Validate institution exists."""
        try:
            institution = Institution.objects.get(id=value)
            if institution.is_verified:
                raise serializers.ValidationError("Institution is already verified.")
        except Institution.DoesNotExist:
            raise serializers.ValidationError("Institution not found.")
        
        return value


class InstitutionSearchSerializer(serializers.Serializer):
    """Serializer for institution search parameters."""
    
    query = serializers.CharField(max_length=255, required=False, allow_blank=True)
    institution_type = serializers.CharField(max_length=50, required=False, allow_blank=True)
    country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state_province = serializers.CharField(max_length=100, required=False, allow_blank=True)
    is_verified = serializers.BooleanField(required=False)
    status = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    def validate_institution_type(self, value):
        """Validate institution type."""
        if value and value not in [choice[0] for choice in Institution._meta.get_field('institution_type').choices]:
            raise serializers.ValidationError("Invalid institution type.")
        return value
    
    def validate_status(self, value):
        """Validate status."""
        if value and value not in [choice[0] for choice in Institution._meta.get_field('status').choices]:
            raise serializers.ValidationError("Invalid status.")
        return value


class UniversityRegistrationCodeSerializer(serializers.ModelSerializer):
    """Serializer for University Registration Code model."""
    
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    is_valid = serializers.ReadOnlyField()
    remaining_uses = serializers.ReadOnlyField()
    
    class Meta:
        model = UniversityRegistrationCode
        fields = [
            'id', 'institution', 'institution_name', 'code', 'description',
            'is_active', 'valid_from', 'valid_until', 'max_uses', 'current_uses',
            'allowed_years', 'allowed_courses', 'created_by', 'metadata',
            'is_valid', 'remaining_uses', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'current_uses', 'created_at', 'updated_at']
    
    def validate_code(self, value):
        """Validate registration code uniqueness."""
        if self.instance:
            # Update case - exclude current instance
            if UniversityRegistrationCode.objects.exclude(id=self.instance.id).filter(code=value).exists():
                raise serializers.ValidationError("A registration code with this code already exists.")
        else:
            # Create case
            if UniversityRegistrationCode.objects.filter(code=value).exists():
                raise serializers.ValidationError("A registration code with this code already exists.")
        return value.upper()  # Store codes in uppercase
    
    def validate(self, attrs):
        """Validate the entire registration code data."""
        # Validate validity period
        valid_from = attrs.get('valid_from')
        valid_until = attrs.get('valid_until')
        
        if valid_until and valid_from and valid_until <= valid_from:
            raise serializers.ValidationError({
                'valid_until': 'Valid until date must be after valid from date.'
            })
        
        # Validate max uses
        max_uses = attrs.get('max_uses')
        if max_uses is not None and max_uses <= 0:
            raise serializers.ValidationError({
                'max_uses': 'Maximum uses must be greater than 0.'
            })
        
        return attrs


class UniversityRegistrationCodeValidationSerializer(serializers.Serializer):
    """Serializer for validating university registration codes."""
    
    code = serializers.CharField(max_length=20)
    institution_id = serializers.UUIDField(required=False)
    year_of_study = serializers.IntegerField(required=False, min_value=1, max_value=10)
    course_code = serializers.CharField(max_length=20, required=False)
    
    def validate_code(self, value):
        """Validate and normalize the code."""
        return value.upper().strip()
    
    def validate(self, attrs):
        """Validate the registration code."""
        code = attrs['code']
        institution_id = attrs.get('institution_id')
        year_of_study = attrs.get('year_of_study')
        course_code = attrs.get('course_code')
        
        # Validate the code
        reg_code, message = UniversityRegistrationCode.validate_code(
            code=code,
            institution_id=institution_id,
            year_of_study=year_of_study,
            course_code=course_code
        )
        
        if not reg_code:
            raise serializers.ValidationError({'code': message})
        
        # Add the validated code object to the data
        attrs['registration_code_obj'] = reg_code
        
        return attrs


class UniversityRegistrationCodeUsageSerializer(serializers.Serializer):
    """Serializer for using a university registration code."""
    
    code = serializers.CharField(max_length=20)
    student_data = serializers.DictField()
    
    def validate_code(self, value):
        """Validate and normalize the code."""
        return value.upper().strip()
    
    def validate(self, attrs):
        """Validate the code usage."""
        code = attrs['code']
        student_data = attrs['student_data']
        
        # Get year of study and course from student data
        year_of_study = student_data.get('year_of_study')
        course_code = student_data.get('course')
        
        # Validate the code
        reg_code, message = UniversityRegistrationCode.validate_code(
            code=code,
            year_of_study=year_of_study,
            course_code=course_code
        )
        
        if not reg_code:
            raise serializers.ValidationError({'code': message})
        
        # Add the validated code object to the data
        attrs['registration_code_obj'] = reg_code
        
        return attrs