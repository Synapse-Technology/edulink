from rest_framework import serializers
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import UserRole, RolePermission, RoleAssignmentHistory, RoleInvitation, RoleChoices
from user_service.utils import verify_user_exists


class UserRoleSerializer(serializers.ModelSerializer):
    """Serializer for UserRole model."""
    
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    is_expired = serializers.ReadOnlyField()
    is_valid = serializers.ReadOnlyField()
    effective_permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = UserRole
        fields = [
            'id', 'user_id', 'role', 'role_display', 'institution_id',
            'employer_id', 'is_active', 'assigned_by_user_id', 'assigned_at',
            'expires_at', 'is_expired', 'is_valid', 'permissions',
            'metadata', 'effective_permissions', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'assigned_at', 'created_at', 'updated_at'
        ]
    
    def get_effective_permissions(self, obj):
        """Get effective permissions for the role."""
        return obj.get_effective_permissions()
    
    def validate_user_id(self, value):
        """Validate that user exists in auth service."""
        if not verify_user_exists(value):
            raise serializers.ValidationError("User does not exist in auth service.")
        return value
    
    def validate(self, attrs):
        """Validate role assignment data."""
        role = attrs.get('role')
        institution_id = attrs.get('institution_id')
        employer_id = attrs.get('employer_id')
        user_id = attrs.get('user_id')
        
        # Validate organization associations based on role
        if role == RoleChoices.STUDENT:
            if not institution_id:
                raise serializers.ValidationError({
                    'institution_id': 'Students must be associated with an institution.'
                })
            if employer_id:
                raise serializers.ValidationError({
                    'employer_id': 'Students cannot be associated with an employer.'
                })
        
        elif role == RoleChoices.EMPLOYER:
            if not employer_id:
                raise serializers.ValidationError({
                    'employer_id': 'Employers must be associated with an employer organization.'
                })
            if institution_id:
                raise serializers.ValidationError({
                    'institution_id': 'Employers cannot be associated with an institution.'
                })
        
        elif role == RoleChoices.INSTITUTION_ADMIN:
            if not institution_id:
                raise serializers.ValidationError({
                    'institution_id': 'Institution admins must be associated with an institution.'
                })
            if employer_id:
                raise serializers.ValidationError({
                    'employer_id': 'Institution admins cannot be associated with an employer.'
                })
        
        elif role in [RoleChoices.SUPER_ADMIN, RoleChoices.SYSTEM]:
            if institution_id or employer_id:
                raise serializers.ValidationError(
                    'Super admins and system users cannot be associated with organizations.'
                )
        
        # Check for duplicate role assignments
        if user_id:
            existing = UserRole.objects.filter(
                user_id=user_id,
                role=role,
                institution_id=institution_id,
                employer_id=employer_id,
                is_active=True
            )
            
            if self.instance:
                existing = existing.exclude(id=self.instance.id)
            
            if existing.exists():
                raise serializers.ValidationError(
                    'User already has this role assignment.'
                )
        
        return attrs


class UserRoleListSerializer(serializers.ModelSerializer):
    """Simplified serializer for role lists."""
    
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    is_valid = serializers.ReadOnlyField()
    
    class Meta:
        model = UserRole
        fields = [
            'id', 'user_id', 'role', 'role_display', 'institution_id',
            'employer_id', 'is_active', 'is_valid', 'assigned_at', 'expires_at'
        ]


class RolePermissionSerializer(serializers.ModelSerializer):
    """Serializer for RolePermission model."""
    
    class Meta:
        model = RolePermission
        fields = [
            'id', 'name', 'description', 'category', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        """Validate permission name format."""
        if not value.startswith('can_'):
            raise serializers.ValidationError(
                "Permission names should start with 'can_'."
            )
        
        # Check for existing permission with same name
        existing = RolePermission.objects.filter(name=value)
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        
        if existing.exists():
            raise serializers.ValidationError(
                "A permission with this name already exists."
            )
        
        return value.lower().replace(' ', '_')


class RoleAssignmentHistorySerializer(serializers.ModelSerializer):
    """Serializer for RoleAssignmentHistory model."""
    
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = RoleAssignmentHistory
        fields = [
            'id', 'user_id', 'role', 'role_display', 'action', 'action_display',
            'institution_id', 'employer_id', 'performed_by_user_id', 'reason',
            'previous_data', 'new_data', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class RoleInvitationSerializer(serializers.ModelSerializer):
    """Serializer for RoleInvitation model."""
    
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    is_expired = serializers.ReadOnlyField()
    is_valid = serializers.ReadOnlyField()
    
    class Meta:
        model = RoleInvitation
        fields = [
            'id', 'email', 'role', 'role_display', 'institution_id',
            'employer_id', 'token', 'invited_by_user_id', 'is_used',
            'used_at', 'used_by_user_id', 'expires_at', 'is_expired',
            'is_valid', 'permissions', 'metadata', 'created_at'
        ]
        read_only_fields = [
            'id', 'token', 'is_used', 'used_at', 'used_by_user_id',
            'created_at'
        ]
    
    def validate_email(self, value):
        """Validate email and check for existing invitations."""
        email = value.lower().strip()
        
        # Check for existing active invitations
        existing = RoleInvitation.objects.filter(
            email=email,
            is_used=False,
            expires_at__gt=timezone.now()
        )
        
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        
        if existing.exists():
            raise serializers.ValidationError(
                "An active invitation already exists for this email."
            )
        
        return email
    
    def validate_expires_at(self, value):
        """Validate expiration date."""
        if value <= timezone.now():
            raise serializers.ValidationError(
                "Expiration date must be in the future."
            )
        return value
    
    def validate(self, attrs):
        """Validate invitation data."""
        role = attrs.get('role')
        institution_id = attrs.get('institution_id')
        employer_id = attrs.get('employer_id')
        
        # Validate organization associations based on role
        if role == RoleChoices.STUDENT and not institution_id:
            raise serializers.ValidationError({
                'institution_id': 'Student invitations must specify an institution.'
            })
        
        if role == RoleChoices.EMPLOYER and not employer_id:
            raise serializers.ValidationError({
                'employer_id': 'Employer invitations must specify an employer.'
            })
        
        if role == RoleChoices.INSTITUTION_ADMIN and not institution_id:
            raise serializers.ValidationError({
                'institution_id': 'Institution admin invitations must specify an institution.'
            })
        
        return attrs


class UserRoleStatsSerializer(serializers.Serializer):
    """Serializer for user role statistics."""
    
    total_users = serializers.IntegerField()
    total_students = serializers.IntegerField()
    total_employers = serializers.IntegerField()
    total_institution_admins = serializers.IntegerField()
    total_super_admins = serializers.IntegerField()
    active_roles = serializers.IntegerField()
    expired_roles = serializers.IntegerField()
    recent_assignments = serializers.IntegerField()
    role_distribution = serializers.DictField()


class UserPermissionsSerializer(serializers.Serializer):
    """Serializer for user permissions."""
    
    user_id = serializers.IntegerField()
    roles = UserRoleListSerializer(many=True)
    all_permissions = serializers.DictField()
    effective_permissions = serializers.ListField(child=serializers.CharField())
    
    def get_all_permissions(self, obj):
        """Get all permissions from all roles."""
        all_perms = {}
        for role in obj.get('roles', []):
            role_perms = role.get_effective_permissions()
            all_perms.update(role_perms)
        return all_perms
    
    def get_effective_permissions(self, obj):
        """Get list of effective permission names."""
        all_perms = self.get_all_permissions(obj)
        return [perm for perm, granted in all_perms.items() if granted]


class RoleAssignmentRequestSerializer(serializers.Serializer):
    """Serializer for role assignment requests."""
    
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=RoleChoices.choices)
    institution_id = serializers.IntegerField(required=False, allow_null=True)
    employer_id = serializers.IntegerField(required=False, allow_null=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    permissions = serializers.JSONField(required=False, default=dict)
    metadata = serializers.JSONField(required=False, default=dict)
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate_user_id(self, value):
        """Validate that user exists."""
        if not verify_user_exists(value):
            raise serializers.ValidationError("User does not exist in auth service.")
        return value
    
    def validate(self, attrs):
        """Validate role assignment request."""
        role = attrs.get('role')
        institution_id = attrs.get('institution_id')
        employer_id = attrs.get('employer_id')
        
        # Validate organization requirements
        if role == RoleChoices.STUDENT and not institution_id:
            raise serializers.ValidationError({
                'institution_id': 'Institution ID is required for student roles.'
            })
        
        if role == RoleChoices.EMPLOYER and not employer_id:
            raise serializers.ValidationError({
                'employer_id': 'Employer ID is required for employer roles.'
            })
        
        if role == RoleChoices.INSTITUTION_ADMIN and not institution_id:
            raise serializers.ValidationError({
                'institution_id': 'Institution ID is required for institution admin roles.'
            })
        
        return attrs


class BulkRoleAssignmentSerializer(serializers.Serializer):
    """Serializer for bulk role assignments."""
    
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=100
    )
    role = serializers.ChoiceField(choices=RoleChoices.choices)
    institution_id = serializers.IntegerField(required=False, allow_null=True)
    employer_id = serializers.IntegerField(required=False, allow_null=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    permissions = serializers.JSONField(required=False, default=dict)
    metadata = serializers.JSONField(required=False, default=dict)
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate_user_ids(self, value):
        """Validate that all users exist."""
        invalid_users = []
        for user_id in value:
            if not verify_user_exists(user_id):
                invalid_users.append(user_id)
        
        if invalid_users:
            raise serializers.ValidationError(
                f"The following users do not exist: {invalid_users}"
            )
        
        return value
    
    def validate(self, attrs):
        """Validate bulk assignment request."""
        role = attrs.get('role')
        institution_id = attrs.get('institution_id')
        employer_id = attrs.get('employer_id')
        
        # Validate organization requirements
        if role == RoleChoices.STUDENT and not institution_id:
            raise serializers.ValidationError({
                'institution_id': 'Institution ID is required for student roles.'
            })
        
        if role == RoleChoices.EMPLOYER and not employer_id:
            raise serializers.ValidationError({
                'employer_id': 'Employer ID is required for employer roles.'
            })
        
        if role == RoleChoices.INSTITUTION_ADMIN and not institution_id:
            raise serializers.ValidationError({
                'institution_id': 'Institution ID is required for institution admin roles.'
            })
        
        return attrs