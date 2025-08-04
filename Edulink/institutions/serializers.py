from rest_framework import serializers
from .models import Institution, MasterInstitution


class MasterInstitutionSerializer(serializers.ModelSerializer):
    """Serializer for comprehensive institution search"""
    status = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = MasterInstitution
        fields = [
            'id', 'name', 'short_name', 'display_name', 'institution_type', 
            'accreditation_body', 'county', 'is_public', 'is_active', 
            'data_source', 'status'
        ]
    
    def get_status(self, obj):
        """Determine if institution is verified in the system"""
        try:
            institution = Institution.objects.get(master_institution=obj)
            return {
                'in_system': True,
                'verified': institution.is_verified,
                'university_code': institution.university_code,
                'registration_enabled': bool(institution.university_code)
            }
        except Institution.DoesNotExist:
            return {
                'in_system': False,
                'verified': False,
                'university_code': None,
                'registration_enabled': False
            }
    
    def get_display_name(self, obj):
        """Get formatted display name with short name if available"""
        if obj.short_name:
            return f"{obj.name} ({obj.short_name})"
        return obj.name


class InstitutionSerializer(serializers.ModelSerializer):
    master_institution_name = serializers.CharField(source='master_institution.name', read_only=True)
    status_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Institution
        fields = [
            'id', 'name', 'institution_type', 'email', 'phone_number', 
            'website', 'address', 'registration_number', 'university_code',
            'master_institution_name', 'is_verified', 'status_info'
        ]
    
    def get_status_info(self, obj):
        """Get institution status information"""
        return {
            'verified': obj.is_verified,
            'has_university_code': bool(obj.university_code),
            'registration_enabled': bool(obj.university_code),
            'in_master_db': bool(obj.master_institution)
        }


class InstitutionSearchSerializer(serializers.Serializer):
    """Serializer for institution search requests"""
    query = serializers.CharField(max_length=255, required=True)
    institution_type = serializers.ChoiceField(
        choices=[
            ('all', 'All'),
            ('university', 'University'),
            ('college', 'College'),
            ('institute', 'Institute'),
            ('polytechnic', 'Polytechnic'),
            ('tvet', 'TVET Institution'),
        ],
        default='all',
        required=False
    )
    verified_only = serializers.BooleanField(default=False, required=False)
    limit = serializers.IntegerField(min_value=1, max_value=50, default=20, required=False)


class UniversityCodeValidationSerializer(serializers.Serializer):
    """Serializer for university code validation"""
    university_code = serializers.CharField(max_length=20, required=True)
    
    def validate_university_code(self, value):
        """Validate that university code exists and is active"""
        from .models import UniversityRegistrationCode
        try:
            registration_code = UniversityRegistrationCode.objects.select_related(
                'institution'
            ).get(
                code=value.upper(),
                is_active=True
            )
            
            # Check if the code is valid (not expired, not over usage limit)
            is_valid, error_message = registration_code.is_valid()
            if not is_valid:
                raise serializers.ValidationError(
                    f"Registration code is invalid: {error_message}"
                )
            
            # Ensure the institution is verified
            if not registration_code.institution.is_verified:
                raise serializers.ValidationError(
                    "Institution is not verified"
                )
            
            return value.upper()
        except UniversityRegistrationCode.DoesNotExist:
            raise serializers.ValidationError(
                "Invalid university code or institution not verified."
            )


class InstitutionRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for institution registration by admins"""
    master_institution_id = serializers.IntegerField(required=False, allow_null=True)
    
    class Meta:
        model = Institution
        fields = [
            'name', 'institution_type', 'email', 'phone_number', 
            'website', 'address', 'registration_number', 
            'master_institution_id'
        ]
    
    def validate_master_institution_id(self, value):
        """Validate master institution exists"""
        if value:
            try:
                MasterInstitution.objects.get(id=value, is_active=True)
            except MasterInstitution.DoesNotExist:
                raise serializers.ValidationError("Invalid master institution ID.")
        return value
    
    def create(self, validated_data):
        """Create institution with master institution link"""
        master_institution_id = validated_data.pop('master_institution_id', None)
        
        institution = Institution.objects.create(**validated_data)
        
        if master_institution_id:
            master_institution = MasterInstitution.objects.get(id=master_institution_id)
            institution.master_institution = master_institution
            institution.save()
        
        return institution
