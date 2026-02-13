from rest_framework import serializers

from .models import Institution, InstitutionSuggestion, InstitutionInterest, InstitutionRequest, InstitutionStaff, Department, Cohort, InstitutionStaffProfileRequest


class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = [
            "id",
            "name",
            "domain",
            "logo",
            "is_active",
            "is_verified",
            "status",
            "verification_method",
            "website_url",
            "contact_email",
            "contact_phone",
            "address",
            "description",
            "trust_level",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_active",
            "is_verified",
            "status",
            "trust_level",
            "verification_method",
            "created_at",
            "updated_at",
        ]


class AdminInstitutionCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    domain = serializers.CharField(max_length=255)


class InstitutionRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    domain = serializers.CharField(max_length=255)
    proof = serializers.CharField(allow_blank=True, required=False)


class InstitutionVerifySerializer(serializers.Serializer):
    verification_method = serializers.CharField(max_length=50)


class InstitutionSuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionSuggestion
        fields = [
            "id",
            "name",
            "domain",
            "student_id",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "student_id",
            "status",
            "created_at",
            "updated_at",
        ]


class InstitutionSuggestionCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    domain = serializers.CharField(max_length=255)


class InstitutionInterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionInterest
        fields = [
            "id",
            "student_id",
            "user_email",
            "raw_name",
            "email_domain",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class InstitutionInterestCreateSerializer(serializers.Serializer):
    raw_name = serializers.CharField(max_length=255)
    user_email = serializers.EmailField(max_length=254, required=False, allow_blank=True)
    email_domain = serializers.CharField(max_length=255, required=False, allow_blank=True)


class InstitutionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionRequest
        fields = [
            "id",
            "institution_name",
            "website_url",
            "requested_domains",
            "representative_name",
            "representative_email",
            "representative_role",
            "representative_phone",
            "supporting_document",
            "department",
            "notes",
            "status",
            "tracking_code",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "tracking_code",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]


class InstitutionRequestCreateSerializer(serializers.Serializer):
    institution_name = serializers.CharField(max_length=255)
    website_url = serializers.URLField(max_length=500)
    requested_domains = serializers.ListField(
        child=serializers.CharField(max_length=255),
        help_text="Array of official email domains (e.g., ['example.edu', 'student.example.edu'])"
    )
    representative_name = serializers.CharField(max_length=255)
    representative_email = serializers.EmailField(max_length=254)
    representative_role = serializers.CharField(max_length=255)
    representative_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    supporting_document = serializers.FileField(required=False, allow_null=True)
    department = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class InstitutionRequestStep1Serializer(serializers.Serializer):
    """Step 1: Basic institution information (progressive disclosure)"""
    institution_name = serializers.CharField(max_length=255)
    website_url = serializers.URLField(max_length=500)
    
    def validate_institution_name(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Institution name must be at least 3 characters long.")
        return value.strip()
    
    def validate_website_url(self, value):
        if not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("Website URL must start with http:// or https://")
        return value


class InstitutionSupervisorInviteSerializer(serializers.Serializer):
    """
    Serializer for inviting an institution supervisor.
    """
    email = serializers.EmailField()
    department_id = serializers.UUIDField(required=True, help_text="Department ID")
    cohort_id = serializers.UUIDField(required=False, allow_null=True, help_text="Cohort ID")


class InstitutionSupervisorActivateSerializer(serializers.Serializer):
    """
    Serializer for activating an institution supervisor from an invite.
    """
    invite_id = serializers.UUIDField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=255)
    last_name = serializers.CharField(max_length=255)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    def validate_password(self, value):
        # Basic complexity check
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        if not any(char.isalpha() for char in value):
            raise serializers.ValidationError("Password must contain at least one letter.")
        return value


class InstitutionRequestStep2Serializer(serializers.Serializer):
    """Step 2: Representative information (progressive disclosure)"""
    representative_name = serializers.CharField(max_length=255)
    representative_email = serializers.EmailField(max_length=254)
    representative_role = serializers.CharField(max_length=255)
    
    def validate_representative_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Representative name must be at least 2 characters long.")
        return value.strip()
    
    def validate_representative_role(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Representative role must be at least 3 characters long.")
        return value.strip()


class InstitutionRequestStep3Serializer(serializers.Serializer):
    """Step 3: Domain information (progressive disclosure)"""
    requested_domains = serializers.ListField(
        child=serializers.CharField(max_length=255),
        help_text="Array of official email domains (e.g., ['example.edu', 'student.example.edu'])"
    )
    
    def validate_requested_domains(self, value):
        """Validate domain format."""
        if not value:
            raise serializers.ValidationError("At least one email domain is required.")
        
        for domain in value:
            if not '.' in domain:
                raise serializers.ValidationError(f"Invalid domain format: {domain}")
            if '@' in domain:
                raise serializers.ValidationError(f"Please enter domains only (e.g. example.edu), not email addresses.")
                
        return value


class InstitutionRequestStep4Serializer(serializers.Serializer):
    """Step 4: Additional information (optional, progressive disclosure)"""
    representative_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    supporting_document = serializers.FileField(required=False, allow_null=True)
    department = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class InstitutionAdminActivateSerializer(serializers.Serializer):
    """
    Serializer for activating an institution admin from an invite (Phase 2).
    """
    invite_id = serializers.UUIDField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=255)
    last_name = serializers.CharField(max_length=255)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    def validate_password(self, value):
        # Basic complexity check
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        if not any(char.isalpha() for char in value):
            raise serializers.ValidationError("Password must contain at least one letter.")
        return value


class InstitutionRequestReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason_code = serializers.ChoiceField(
        choices=InstitutionRequest.REJECTION_REASON_CHOICES,
        required=False,
        allow_blank=True
    )
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        action = data.get('action')
        rejection_reason_code = data.get('rejection_reason_code', '')
        rejection_reason = data.get('rejection_reason', '')
        
        if action == 'reject' and not rejection_reason_code:
            raise serializers.ValidationError(
                "Rejection reason code is required when rejecting a request."
            )
        
        return data


class InstitutionAdminSetupSerializer(serializers.Serializer):
    """
    Serializer for institution admin complete setup wizard.
    Captures essential information for first-time institution admin setup.
    """
    institution_name = serializers.CharField(max_length=255, help_text="Official institution name")
    institution_website = serializers.URLField(max_length=500, help_text="Official website URL")
    primary_domain = serializers.CharField(max_length=255, help_text="Primary email domain (e.g., example.edu)")
    admin_title = serializers.CharField(max_length=255, help_text="Administrator's title/role")
    admin_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, help_text="Contact phone number")
    department = serializers.CharField(max_length=255, required=False, allow_blank=True, help_text="Department or office")
    institution_size = serializers.ChoiceField(
        choices=[
            ("small", "Small (< 5,000 students)"),
            ("medium", "Medium (5,000 - 15,000 students)"),
            ("large", "Large (15,000+ students)"),
        ],
        help_text="Approximate institution size"
    )
    primary_use_case = serializers.ChoiceField(
        choices=[
            ("internship_management", "Internship Management"),
            ("career_services", "Career Services"),
            ("academic_coordination", "Academic Coordination"),
            ("employer_relations", "Employer Relations"),
            ("other", "Other"),
        ],
        help_text="Primary use case for the platform"
    )
    agree_to_verification_authority = serializers.BooleanField(
        help_text="I confirm I have authority to act on behalf of this institution"
    )

    def validate_primary_domain(self, value):
        """Validate domain format."""
        if not '.' in value:
            raise serializers.ValidationError("Invalid domain format. Must contain at least one dot.")

        # Basic domain validation
        domain_parts = value.split('.')
        if len(domain_parts) < 2:
            raise serializers.ValidationError("Invalid domain format.")

        return value.lower()

    def validate_admin_phone(self, value):
        """Basic phone validation."""
        if value and not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Phone number must contain at least one digit.")
        return value

    def validate_agree_to_verification_authority(self, value):
        """Must agree to verification authority."""        
        if not value:
            raise serializers.ValidationError("You must explicitly accept the verification authority to proceed.")    
        return value


class InstitutionStaffSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = InstitutionStaff
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'role',
            'role_display',
            'department',
            'cohort',
            'status',
            'created_at',
        ]

    def get_status(self, obj):
        return "Active" if obj.is_active else "Inactive"   


class InstitutionStaffPersonalDetailsUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)

    def validate(self, data):
        if not data:
            raise serializers.ValidationError("At least one field must be provided.")
        return data


class CohortSerializer(serializers.ModelSerializer):       
    department_id = serializers.ReadOnlyField(source='department.id')
    status = serializers.SerializerMethodField()

    class Meta:
        model = Cohort
        fields = [
            'id',
            'department_id',
            'department',
            'name',
            'start_year',
            'end_year',
            'intake_label',
            'is_active',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_status(self, obj):
        return "Active" if obj.is_active else "Inactive"


class DepartmentSerializer(serializers.ModelSerializer):   
    cohorts = CohortSerializer(many=True, read_only=True)  
    status = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id',
            'institution',
            'name',
            'code',
            'aliases',
            'is_active',
            'status',
            'cohorts',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'created_at', 'updated_at']

    def get_status(self, obj):
        return "Active" if obj.is_active else "Inactive"   


class DepartmentCreateSerializer(serializers.Serializer):  
    name = serializers.CharField(max_length=255)
    code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    aliases = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        allow_empty=True
    )


class DepartmentUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    aliases = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        allow_empty=True
    )
    is_active = serializers.BooleanField(required=False)


class CohortCreateSerializer(serializers.Serializer):      
    name = serializers.CharField(max_length=255)
    start_year = serializers.IntegerField()
    end_year = serializers.IntegerField(required=False, allow_null=True)
    intake_label = serializers.CharField(max_length=100, required=False, allow_blank=True)
    department_id = serializers.UUIDField()


class CohortUpdateSerializer(serializers.Serializer):      
    name = serializers.CharField(max_length=255, required=False)
    start_year = serializers.IntegerField(required=False)  
    end_year = serializers.IntegerField(required=False, allow_null=True)
    intake_label = serializers.CharField(max_length=100, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)


class InstitutionStaffProfileRequestCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=255, required=False)
    last_name = serializers.CharField(max_length=255, required=False)
    email = serializers.EmailField(required=False)
    
    def validate(self, data):
        if not any(data.values()):
            raise serializers.ValidationError("At least one field must be provided.")
        return data


class InstitutionStaffProfileRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    staff_email = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = InstitutionStaffProfileRequest
        fields = [
            'id', 'staff', 'staff_name', 'staff_email', 'requested_changes', 
            'status', 'reviewed_by', 'reviewed_by_name', 'reviewed_at', 
            'admin_feedback', 'created_at'
        ]
        read_only_fields = fields

    def get_staff_name(self, obj):
        return obj.staff.user.get_full_name()

    def get_staff_email(self, obj):
        return obj.staff.user.email

    def get_reviewed_by_name(self, obj):
        return obj.reviewed_by.get_full_name() if obj.reviewed_by else None


class InstitutionStaffProfileRequestActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    admin_feedback = serializers.CharField(required=False, allow_blank=True)


class BulkVerificationEntrySerializer(serializers.Serializer):
    student_email = serializers.EmailField()
    registration_number = serializers.CharField()
    is_valid = serializers.BooleanField()
    student_id = serializers.UUIDField(required=False, allow_null=True)


class BulkVerificationConfirmSerializer(serializers.Serializer):
    entries = BulkVerificationEntrySerializer(many=True)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    cohort_id = serializers.UUIDField(required=False, allow_null=True)


class PlacementStudentInfoSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    email = serializers.EmailField()
    trust_level = serializers.IntegerField()


class PlacementMonitoringSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    department = serializers.CharField()
    status = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    employer_id = serializers.UUIDField()
    employer_name = serializers.CharField()
    student_info = PlacementStudentInfoSerializer()
