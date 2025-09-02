import re
from rest_framework import serializers
from django.core.validators import EmailValidator, RegexValidator, URLValidator
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from .models import (
    RegistrationRequest, 
    RegistrationRequestLog, 
    RegistrationRequestAttachment,
    UserRole, 
    InstitutionType, 
    RegistrationStatus,
    RiskLevel,
    VerificationSource
)

User = get_user_model()

# Student count range choices
STUDENT_COUNT_CHOICES = [
    ('0_100', '0-100 students'),
    ('101_500', '101-500 students'),
    ('500_1000', '500-1000 students'),
    ('1001_5000', '1001-5000 students'),
    ('5001_10000', '5001-10000 students'),
    ('10000+', '10000+ students'),
]

# Company size choices
COMPANY_SIZE_CHOICES = [
    ('startup', 'Startup (1-10 employees)'),
    ('small', 'Small (11-50 employees)'),
    ('medium', 'Medium (51-200 employees)'),
    ('large', 'Large (201-1000 employees)'),
    ('enterprise', 'Enterprise (1000+ employees)'),
]

# Industry choices
INDUSTRY_CHOICES = [
    ('technology', 'Technology'),
    ('manufacturing', 'Manufacturing'),
    ('healthcare', 'Healthcare'),
    ('finance', 'Finance'),
    ('agriculture', 'Agriculture'),
    ('construction', 'Construction'),
    ('education', 'Education'),
    ('other', 'Other'),
]


class RegistrationRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new registration requests."""
    
    # Personal Information (optional for institution registration)
    email = serializers.EmailField(validators=[EmailValidator()], required=False)
    first_name = serializers.CharField(max_length=50, required=False)
    last_name = serializers.CharField(max_length=50, required=False)
    phone_number = serializers.CharField(
        max_length=15,
        required=False,
        validators=[RegexValidator(
            regex=r'^\+254[17]\d{8}$',
            message="Phone number must be in format +254XXXXXXXXX"
        )]
    )
    
    # Organization Details
    organization_name = serializers.CharField(max_length=200, required=False)
    organization_type = serializers.ChoiceField(
        choices=[
            ('university', 'University'),
            ('tvet', 'TVET Institution'),
            ('employer', 'Employer/Organization')
        ],
        required=False
    )
    organization_website = serializers.URLField(
        required=False, 
        allow_blank=True,
        validators=[URLValidator()]
    )
    
    # Institution-specific fields
    institution_name = serializers.CharField(max_length=200, required=False)
    institution_type = serializers.ChoiceField(
        choices=[('university', 'University'), ('tvet', 'TVET Institution')],
        required=False
    )
    registration_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    student_count = serializers.ChoiceField(choices=STUDENT_COUNT_CHOICES, required=False)
    faculty_count = serializers.IntegerField(min_value=0, required=False)
    website = serializers.URLField(required=False, allow_blank=True)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    
    # Contact Information
    contact_email = serializers.EmailField(required=False)
    contact_phone = serializers.CharField(max_length=15, required=False)
    position = serializers.CharField(max_length=100, required=False)  # Contact person position
    
    # Address Information
    address = serializers.CharField(max_length=500, required=False)
    city = serializers.CharField(max_length=100, required=False)
    county = serializers.CharField(max_length=100, required=False)
    
    # Employer-specific fields
    company_name = serializers.CharField(max_length=200, required=False)
    company_size = serializers.ChoiceField(choices=COMPANY_SIZE_CHOICES, required=False)
    industry = serializers.ChoiceField(choices=INDUSTRY_CHOICES, required=False)
    position = serializers.CharField(max_length=100, required=False)
    
    password = serializers.CharField(
        write_only=True, 
        required=False,
        validators=[validate_password],
        help_text="Password for the user account (not required for institution registration)"
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=False,
        help_text="Password confirmation"
    )
    terms_accepted = serializers.BooleanField(
        write_only=True,
        required=False,
        help_text="User must accept terms and conditions"
    )
    privacy_accepted = serializers.BooleanField(
        write_only=True,
        required=False,
        help_text="User must accept privacy policy"
    )
    
    class Meta:
        model = RegistrationRequest
        fields = [
            'email', 'first_name', 'last_name', 'phone_number', 'role',
            'organization_name', 'organization_type', 'organization_website',
            'organization_address', 'organization_phone',
            'institution_registration_number',
            'company_industry', 'company_size', 'department', 'position',
            'password', 'confirm_password', 'terms_accepted', 'privacy_accepted',
            'utm_source', 'utm_medium', 'utm_campaign',
            # Institution-specific fields
            'institution_name', 'institution_type', 'registration_number',
            'student_count', 'faculty_count', 'website', 'description',
            # Contact Information
            'contact_email', 'contact_phone', 'position',
            # Address Information
            'address', 'city', 'county',
            # Employer-specific fields
            'company_name', 'industry'
        ]
        extra_kwargs = {
            'email': {'validators': [EmailValidator()]},
            'organization_website': {'validators': [URLValidator()], 'required': False},
            'role': {'required': False},  # Will be auto-assigned based on organization type
        }
    
    def validate_email(self, value):
        """Validate email format and check for existing registrations."""
        # Check if email is already registered
        if RegistrationRequest.objects.filter(
            email=value, 
            status__in=[
                RegistrationStatus.PENDING,
                RegistrationStatus.EMAIL_VERIFICATION_SENT,
                RegistrationStatus.EMAIL_VERIFIED,
                RegistrationStatus.UNDER_REVIEW,
                RegistrationStatus.APPROVED
            ]
        ).exists():
            raise serializers.ValidationError(
                "A registration request with this email already exists."
            )
        
        return value.lower()
    
    def validate_phone_number(self, value):
        """Validate Kenyan phone number format."""
        if value:
            # Kenyan phone number patterns
            kenyan_patterns = [
                r'^\+254[17]\d{8}$',  # +254 format
                r'^254[17]\d{8}$',   # 254 format
                r'^0[17]\d{8}$',     # 0 format
            ]
            
            if not any(re.match(pattern, value) for pattern in kenyan_patterns):
                raise serializers.ValidationError(
                    "Please enter a valid Kenyan phone number (e.g., +254712345678, 0712345678)"
                )
        
        return value
    
    def validate_organization_website(self, value):
        """Validate organization website and extract domain."""
        if value:
            # Ensure URL has proper format
            if not value.startswith(('http://', 'https://')):
                value = f"https://{value}"
            
            # Basic domain validation
            try:
                from urllib.parse import urlparse
                parsed = urlparse(value)
                if not parsed.netloc:
                    raise serializers.ValidationError("Invalid website URL")
            except Exception:
                raise serializers.ValidationError("Invalid website URL")
        
        return value
    
    def validate(self, attrs):
        """Cross-field validation."""
        # Password confirmation (only if password is provided)
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        
        if password and password != confirm_password:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        
        # For user registration (not institution), require terms and privacy
        if password:  # If password provided, it's user registration
            if not attrs.get('terms_accepted'):
                raise serializers.ValidationError({
                    'terms_accepted': 'You must accept the terms and conditions.'
                })
            
            if not attrs.get('privacy_accepted'):
                raise serializers.ValidationError({
                    'privacy_accepted': 'You must accept the privacy policy.'
                })
        
        # Validate student_count choices
        student_count = attrs.get('student_count')
        if student_count:
            valid_choices = [choice[0] for choice in STUDENT_COUNT_CHOICES]
            if student_count not in valid_choices:
                raise serializers.ValidationError({
                    'student_count': f'Invalid choice. Must be one of: {", ".join(valid_choices)}'
                })
        
        # Organization type based validation
        org_type = attrs.get('organization_type') or attrs.get('institution_type')
        
        if org_type in ['university', 'tvet']:
            # Institution requirements
            required_fields = ['institution_name', 'contact_email', 'contact_phone', 'first_name', 'last_name', 'address', 'city', 'county']
            
            for field in required_fields:
                if not attrs.get(field):
                    raise serializers.ValidationError({
                        field: f'{field.replace("_", " ").title()} is required for institutions.'
                    })
            
            # Validate contact phone format
            contact_phone = attrs.get('contact_phone')
            if contact_phone and not re.match(r'^\+254[17]\d{8}$', contact_phone):
                raise serializers.ValidationError({
                    'contact_phone': 'Contact phone must be in format +254XXXXXXXXX'
                })
        
        elif org_type == 'employer':
            # Employer requirements
            required_fields = ['company_name', 'industry', 'company_size', 'contact_email', 'contact_phone', 'first_name', 'last_name', 'address', 'city', 'county']
            
            for field in required_fields:
                if not attrs.get(field):
                    raise serializers.ValidationError({
                        field: f'{field.replace("_", " ").title()} is required for employers.'
                    })
            
            # Validate contact phone format
            contact_phone = attrs.get('contact_phone')
            if contact_phone and not re.match(r'^\+254[17]\d{8}$', contact_phone):
                raise serializers.ValidationError({
                    'contact_phone': 'Contact phone must be in format +254XXXXXXXXX'
                })
        
        # Remove password fields from attrs as they're not model fields
        attrs.pop('password', None)
        attrs.pop('confirm_password', None)
        attrs.pop('terms_accepted', None)
        attrs.pop('privacy_accepted', None)
        
        return attrs
    
    def create(self, validated_data):
        """Create registration request with proper field mapping and role assignment."""
        # Map frontend fields to model fields
        mapped_data = {}
        
        # Handle institution-specific field mapping
        if validated_data.get('institution_name'):
            mapped_data['organization_name'] = validated_data.get('institution_name')
        elif validated_data.get('organization_name'):
            mapped_data['organization_name'] = validated_data.get('organization_name')
        
        if validated_data.get('institution_type'):
            mapped_data['organization_type'] = validated_data.get('institution_type')
        elif validated_data.get('organization_type'):
            mapped_data['organization_type'] = validated_data.get('organization_type')
        
        if validated_data.get('website'):
            mapped_data['organization_website'] = validated_data.get('website')
        elif validated_data.get('organization_website'):
            mapped_data['organization_website'] = validated_data.get('organization_website')
        
        if validated_data.get('registration_number'):
            mapped_data['institution_registration_number'] = validated_data.get('registration_number')
        
        # Map address fields
        if validated_data.get('address'):
            mapped_data['organization_address'] = validated_data.get('address')
        if validated_data.get('contact_phone'):
            mapped_data['organization_phone'] = validated_data.get('contact_phone')
        
        # Map employer-specific fields
        if validated_data.get('company_name'):
            mapped_data['organization_name'] = validated_data.get('company_name')
        if validated_data.get('industry'):
            mapped_data['company_industry'] = validated_data.get('industry')
        if validated_data.get('company_size'):
            mapped_data['company_size'] = validated_data.get('company_size')
        
        # Validate organization type and set role for institution onboarding
        org_type = validated_data.get('institution_type') or validated_data.get('organization_type')
        if org_type == 'employer':
            raise serializers.ValidationError(
                "Employer registrations are not allowed through institution onboarding. "
                "Only educational institutions (university, tvet) can be onboarded."
            )
        
        # Ensure only institution types are allowed
        if org_type not in ['university', 'tvet']:
            raise serializers.ValidationError(
                "Invalid organization type. Only 'university' and 'tvet' are allowed for institution onboarding."
            )
        
        # Set role to institution_admin for all institution registrations
        mapped_data['role'] = 'institution_admin'
        
        # Copy other fields that exist in the model
        for field in ['email', 'first_name', 'last_name', 'phone_number', 
                     'position', 'utm_source', 'utm_medium', 'utm_campaign']:
            if field in validated_data:
                mapped_data[field] = validated_data[field]
        
        # Use contact information as primary user details
        # Contact email becomes the primary email for the user account
        if validated_data.get('contact_email'):
            mapped_data['email'] = validated_data.get('contact_email')
        elif validated_data.get('email'):
            mapped_data['email'] = validated_data.get('email')
        
        # Use first_name and last_name directly
        if validated_data.get('first_name'):
            mapped_data['first_name'] = validated_data.get('first_name')
        if validated_data.get('last_name'):
            mapped_data['last_name'] = validated_data.get('last_name')
        
        # Contact phone becomes primary phone
        if validated_data.get('contact_phone'):
            mapped_data['phone_number'] = validated_data.get('contact_phone')
        elif validated_data.get('phone_number'):
            mapped_data['phone_number'] = validated_data.get('phone_number')
        
        # Only pass fields that exist in the model to avoid TypeError
        return super().create(mapped_data)


class RegistrationRequestSerializer(serializers.ModelSerializer):
    """Serializer for reading registration requests."""
    
    verification_authority = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    requires_institutional_verification = serializers.SerializerMethodField()
    
    class Meta:
        model = RegistrationRequest
        fields = '__all__'
        read_only_fields = [
            'id', 'request_number', 'status', 'risk_level', 'risk_score',
            'email_verified', 'domain_verified', 'institutional_verified',
            'user_account_created', 'created_at', 'updated_at', 'expires_at'
        ]
    
    def get_verification_authority(self, obj):
        """Get the verification authority for the institution."""
        return obj.get_verification_authority()
    
    def get_is_expired(self, obj):
        """Check if the registration request is expired."""
        return obj.is_expired
    
    def get_requires_institutional_verification(self, obj):
        """Check if institutional verification is required."""
        return obj.requires_institutional_verification


class RegistrationRequestUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating registration requests (admin use)."""
    
    class Meta:
        model = RegistrationRequest
        fields = [
            'status', 'risk_level', 'risk_score',
            'assigned_reviewer', 'review_notes',
            'approval_notes', 'rejection_reason',
            'email_verified', 'domain_verified', 'institutional_verified',
            'domain_verification_method', 'domain_verification_details',
            'institutional_verification_source', 'institutional_verification_details'
        ]
    
    def validate_status(self, value):
        """Validate status transitions."""
        if self.instance:
            current_status = self.instance.status
            
            # Define valid status transitions
            valid_transitions = {
                RegistrationStatus.PENDING: [
                    RegistrationStatus.EMAIL_VERIFICATION_SENT,
                    RegistrationStatus.REJECTED,
                    RegistrationStatus.EXPIRED
                ],
                RegistrationStatus.EMAIL_VERIFICATION_SENT: [
                    RegistrationStatus.EMAIL_VERIFIED,
                    RegistrationStatus.REJECTED,
                    RegistrationStatus.EXPIRED
                ],
                RegistrationStatus.EMAIL_VERIFIED: [
                    RegistrationStatus.DOMAIN_VERIFICATION_PENDING,
                    RegistrationStatus.UNDER_REVIEW,
                    RegistrationStatus.APPROVED,
                    RegistrationStatus.REJECTED
                ],
                RegistrationStatus.DOMAIN_VERIFICATION_PENDING: [
                    RegistrationStatus.DOMAIN_VERIFIED,
                    RegistrationStatus.REJECTED
                ],
                RegistrationStatus.DOMAIN_VERIFIED: [
                    RegistrationStatus.INSTITUTIONAL_VERIFICATION_PENDING,
                    RegistrationStatus.UNDER_REVIEW,
                    RegistrationStatus.APPROVED,
                    RegistrationStatus.REJECTED
                ],
                RegistrationStatus.INSTITUTIONAL_VERIFICATION_PENDING: [
                    RegistrationStatus.INSTITUTIONAL_VERIFIED,
                    RegistrationStatus.REJECTED
                ],
                RegistrationStatus.INSTITUTIONAL_VERIFIED: [
                    RegistrationStatus.UNDER_REVIEW,
                    RegistrationStatus.APPROVED,
                    RegistrationStatus.REJECTED
                ],
                RegistrationStatus.UNDER_REVIEW: [
                    RegistrationStatus.APPROVED,
                    RegistrationStatus.REJECTED
                ],
                RegistrationStatus.APPROVED: [],  # Final state
                RegistrationStatus.REJECTED: [],  # Final state
                RegistrationStatus.EXPIRED: []    # Final state
            }
            
            if value != current_status and value not in valid_transitions.get(current_status, []):
                raise serializers.ValidationError(
                    f"Cannot transition from {current_status} to {value}"
                )
        
        return value


class RegistrationRequestLogSerializer(serializers.ModelSerializer):
    """Serializer for registration request logs."""
    
    class Meta:
        model = RegistrationRequestLog
        fields = '__all__'
        read_only_fields = ['created_at']


class RegistrationRequestAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for registration request attachments."""
    
    class Meta:
        model = RegistrationRequestAttachment
        fields = '__all__'
        read_only_fields = ['created_at', 'verified_at']


class EmailVerificationSerializer(serializers.Serializer):
    """Serializer for email verification."""
    
    token = serializers.CharField(max_length=255)
    
    def validate_token(self, value):
        """Validate the email verification token."""
        try:
            registration_request = RegistrationRequest.objects.get(
                email_verification_token=value,
                status=RegistrationStatus.EMAIL_VERIFICATION_SENT
            )
            
            if registration_request.is_expired:
                raise serializers.ValidationError("Verification token has expired")
            
        except RegistrationRequest.DoesNotExist:
            raise serializers.ValidationError("Invalid verification token")
        
        return value


class DomainVerificationSerializer(serializers.Serializer):
    """Serializer for domain verification."""
    
    registration_request_id = serializers.UUIDField()
    verification_method = serializers.ChoiceField(choices=VerificationSource.choices)
    verification_details = serializers.JSONField(required=False)


class ApprovalActionSerializer(serializers.Serializer):
    """Serializer for approval/rejection actions."""
    
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    notes = serializers.CharField(required=False, allow_blank=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        """Validate approval action."""
        if attrs['action'] == 'reject' and not attrs.get('reason'):
            raise serializers.ValidationError({
                'reason': 'Rejection reason is required when rejecting a request.'
            })
        
        return attrs


class BulkActionSerializer(serializers.Serializer):
    """Serializer for bulk actions on registration requests."""
    
    request_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=50
    )
    action = serializers.ChoiceField(choices=['approve', 'reject', 'assign_reviewer'])
    notes = serializers.CharField(required=False, allow_blank=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    reviewer = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        """Validate bulk action."""
        action = attrs['action']
        
        if action == 'reject' and not attrs.get('reason'):
            raise serializers.ValidationError({
                'reason': 'Rejection reason is required for bulk rejection.'
            })
        
        if action == 'assign_reviewer' and not attrs.get('reviewer'):
            raise serializers.ValidationError({
                'reviewer': 'Reviewer is required for reviewer assignment.'
            })
        
        return attrs


class RegistrationStatsSerializer(serializers.Serializer):
    """Serializer for registration statistics."""
    
    total_requests = serializers.IntegerField()
    pending_requests = serializers.IntegerField()
    approved_requests = serializers.IntegerField()
    rejected_requests = serializers.IntegerField()
    under_review = serializers.IntegerField()
    by_role = serializers.DictField()
    by_institution_type = serializers.DictField()
    by_risk_level = serializers.DictField()
    recent_activity = serializers.ListField()