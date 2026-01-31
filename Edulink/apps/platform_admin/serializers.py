"""
Admin app serializers - Input/output contracts for platform staff operations.
Validate incoming data and shape outgoing responses.
Following APP_LAYER_RULE.md: validation only, no business logic, no side effects.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import PlatformStaffProfile, AdminActionLog, StaffInvite

User = get_user_model()


class UserRoleSerializer(serializers.Serializer):
    """Serializer for user role assignment by platform staff."""
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class UserSuspensionSerializer(serializers.Serializer):
    """Serializer for user suspension/reactivation by platform staff."""
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class InstitutionVerificationSerializer(serializers.Serializer):
    """Serializer for institution verification by platform staff."""
    institution_id = serializers.IntegerField()


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer for admin user management."""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    institution_name = serializers.SerializerMethodField()
    institution_id = serializers.SerializerMethodField()
    is_platform_staff = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'role', 'role_display',
            'is_active', 'is_email_verified', 'date_joined', 'last_login', 'institution_id', 'institution_name',
            'is_platform_staff'
        ]
        read_only_fields = ['id', 'email', 'username', 'date_joined', 'last_login']
    
    def get_institution_id(self, obj):
        """Resolve institution ID based on user role."""
        from .queries import get_user_institution_info
        info = get_user_institution_info(str(obj.id), obj.role)
        return info["id"]

    def get_institution_name(self, obj):
        """Resolve institution name based on user role."""
        from .queries import get_user_institution_info
        info = get_user_institution_info(str(obj.id), obj.role)
        return info["name"]

    def get_is_platform_staff(self, obj):
        """Check if user is platform staff."""
        return hasattr(obj, 'platform_staff_profile') and obj.platform_staff_profile.is_active


class PlatformStaffProfileSerializer(serializers.ModelSerializer):
    """Serializer for platform staff profiles."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = PlatformStaffProfile
        fields = [
            'id', 'user', 'user_email', 'user_name', 'role', 'is_active',
            'created_by', 'created_by_email', 'created_at', 'revoked_at'
        ]
        read_only_fields = ['id', 'created_at', 'revoked_at']
    
    def get_user_name(self, obj):
        """Get full name of the user."""
        return f"{obj.user.first_name} {obj.user.last_name}".strip()


class PlatformStaffListSerializer(serializers.ModelSerializer):
    """Serializer for platform staff list view matching frontend requirements."""
    email = serializers.CharField(source='user.email', read_only=True)
    last_login = serializers.DateTimeField(source='user.last_login', read_only=True)
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = PlatformStaffProfile
        fields = [
            'id', 'email', 'role', 'is_active', 'created_at', 
            'last_login', 'permissions', 'revoked_at'
        ]
        
    def get_permissions(self, obj):
        """Get permissions list based on role."""
        # Simple mapping based on role - could be more complex in real implementation
        permissions = ['view_dashboard']
        if obj.role in ['SUPER_ADMIN', 'PLATFORM_ADMIN']:
            permissions.extend(['manage_users', 'manage_institutions', 'manage_staff'])
        if obj.role == 'SUPER_ADMIN':
            permissions.extend(['system_config', 'view_audit_logs'])
        return permissions


class StaffInviteListSerializer(serializers.ModelSerializer):
    """Serializer for staff invite list view matching frontend requirements."""
    invited_by = serializers.CharField(source='created_by.email', read_only=True)
    invited_at = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = StaffInvite
        fields = [
            'id', 'email', 'role', 'invited_by', 'invited_at', 
            'expires_at', 'is_accepted'
        ]


class StaffInviteCreateSerializer(serializers.Serializer):
    """Serializer for creating staff invites."""
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=PlatformStaffProfile.ROLE_CHOICES)
    message = serializers.CharField(required=False, allow_blank=True)
    
    def validate_email(self, value):
        """Validate email is not already a platform staff member or has pending invite."""
        # Check if user is already platform staff
        if User.objects.filter(email=value).exists():
            user = User.objects.get(email=value)
            if hasattr(user, 'platform_staff_profile') and user.platform_staff_profile.is_active:
                raise serializers.ValidationError("User is already a platform staff member")
        
        # Check for existing invites
        existing_invite = StaffInvite.objects.filter(email=value).first()
        if existing_invite:
            if existing_invite.is_accepted:
                raise serializers.ValidationError("User has already accepted an invitation")
            
            # If invite exists and is NOT expired, block it
            if not existing_invite.is_expired:
                raise serializers.ValidationError("A valid invitation already exists for this email")
            
            # If it IS expired, we allow it to pass to the service, 
            # where the old one will be cleaned up.
            
        return value
    
    def validate_role(self, value):
        """Validate role cannot be SUPER_ADMIN through invite."""
        if value == PlatformStaffProfile.ROLE_SUPER_ADMIN:
            raise serializers.ValidationError("Super admin roles must be created manually")
        return value


class StaffInviteSerializer(serializers.ModelSerializer):
    """Serializer for staff invites."""
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    created_by_role = serializers.CharField(source='created_by.platform_staff_profile.role', read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = StaffInvite
        fields = [
            'id', 'email', 'role', 'token', 'expires_at', 'is_accepted',
            'created_by', 'created_by_email', 'created_by_role', 'created_at',
            'note', 'is_expired'
        ]
        read_only_fields = ['id', 'token', 'created_at']
    
    def get_is_expired(self, obj):
        """Check if invite is expired."""
        return obj.is_expired()


class CreateStaffInviteSerializer(serializers.Serializer):
    """Serializer for creating staff invites."""
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=PlatformStaffProfile.ROLE_CHOICES)
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)
    
    def validate_email(self, value):
        """Validate email is not already a platform staff member."""
        if User.objects.filter(email=value).exists():
            user = User.objects.get(email=value)
            if hasattr(user, 'platform_staff_profile') and user.platform_staff_profile.is_active:
                raise serializers.ValidationError("User is already a platform staff member")
        return value
    
    def validate_role(self, value):
        """Validate role cannot be SUPER_ADMIN through invite."""
        if value == PlatformStaffProfile.ROLE_SUPER_ADMIN:
            raise serializers.ValidationError("Super admin roles must be created manually")
        return value


class AcceptStaffInviteSerializer(serializers.Serializer):
    """Serializer for accepting staff invites."""
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    
    def validate_token(self, value):
        """Validate token exists and is not expired."""
        try:
            invite = StaffInvite.objects.get(token=value)
            if invite.is_expired:
                raise serializers.ValidationError("Invite has expired")
            if invite.is_accepted:
                raise serializers.ValidationError("Invite has already been accepted")
            return value
        except StaffInvite.DoesNotExist:
            raise serializers.ValidationError("Invalid invite token")
        return value


class InstitutionAdminSerializer(serializers.Serializer):
    """Serializer for institution management in admin panel."""
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    domain = serializers.CharField(read_only=True)
    tracking_code = serializers.SerializerMethodField()
    contact_email = serializers.SerializerMethodField()
    contact_phone = serializers.SerializerMethodField()
    contact_website = serializers.SerializerMethodField()
    contact_address = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)
    is_verified = serializers.BooleanField(read_only=True)
    status = serializers.CharField(read_only=True)
    verification_method = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    total_users = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    admin_count = serializers.SerializerMethodField()
    employer_count = serializers.SerializerMethodField()
    internship_count = serializers.SerializerMethodField()
    verification_status = serializers.SerializerMethodField()
    
    def _get_attr(self, obj, attr_name):
        """Helper to get attribute from object or dict."""
        if isinstance(obj, dict):
            return obj.get(attr_name)
        return getattr(obj, attr_name, None)

    def get_total_users(self, obj):
        """Get total users associated with this institution (Verified Students + All Active Staff)."""
        from edulink.apps.institutions import queries as inst_queries
        inst_id = self._get_attr(obj, 'id')
        total_staff = inst_queries.get_staff_count_for_institution(str(inst_id))
        return self.get_student_count(obj) + total_staff
    
    def get_student_count(self, obj):
        """Get student count for this institution."""
        from edulink.apps.students import queries as student_queries
        inst_id = self._get_attr(obj, 'id')
        return student_queries.get_total_students_count(str(inst_id))
    
    def get_admin_count(self, obj):
        """Get admin count for this institution."""
        from edulink.apps.institutions import queries as inst_queries
        inst_id = self._get_attr(obj, 'id')
        return inst_queries.get_staff_count_for_institution(str(inst_id), role='admin')
    
    def get_employer_count(self, obj):
        """Get count of unique employers with engagements."""
        from edulink.apps.internships import queries as internship_queries
        inst_id = self._get_attr(obj, 'id')
        return internship_queries.get_unique_employer_count_for_institution(str(inst_id))

    def get_internship_count(self, obj):
        """Get total internship opportunities posted by institution."""
        from edulink.apps.internships import queries as internship_queries
        inst_id = self._get_attr(obj, 'id')
        return internship_queries.get_internship_count_for_institution(str(inst_id))
    
    def get_verification_status(self, obj):
        """Get human-readable verification status."""
        is_verified = self._get_attr(obj, 'is_verified')
        is_active = self._get_attr(obj, 'is_active')

        if is_verified:
            return "Verified"
        elif is_active:
            return "Active but Unverified"
        else:
            return "Inactive"
    
    def get_tracking_code(self, obj):
        """Get tracking code from associated institution request (if any)."""
        try:
            from edulink.apps.institutions import services as institution_services
            inst_id = self._get_attr(obj, 'id')
            contact_info = institution_services.get_institution_contact_info(institution_id=inst_id)
            return contact_info.get("tracking_code")
        except Exception:
            return None

    def get_contact_email(self, obj):
        """Get contact email from associated institution request (if any)."""
        try:
            from edulink.apps.institutions import services as institution_services
            inst_id = self._get_attr(obj, 'id')
            contact_info = institution_services.get_institution_contact_info(institution_id=inst_id)
            return contact_info.get("representative_email")
        except Exception:
            return None
    
    def get_contact_phone(self, obj):
        """Get contact phone from associated institution request (if any)."""
        try:
            from edulink.apps.institutions import services as institution_services
            inst_id = self._get_attr(obj, 'id')
            contact_info = institution_services.get_institution_contact_info(institution_id=inst_id)
            return contact_info.get("representative_phone")
        except Exception:
            return None
    
    def get_contact_website(self, obj):
        """Get website URL from associated institution request (if any)."""
        try:
            from edulink.apps.institutions import services as institution_services
            inst_id = self._get_attr(obj, 'id')
            contact_info = institution_services.get_institution_contact_info(institution_id=inst_id)
            return contact_info.get("website_url")
        except Exception:
            return None
    
    def get_contact_address(self, obj):
        """Get address/department info from associated institution request (if any)."""
        try:
            from edulink.apps.institutions import services as institution_services
            inst_id = self._get_attr(obj, 'id')
            contact_info = institution_services.get_institution_contact_info(institution_id=inst_id)
            return contact_info.get("department")
        except Exception:
            return None


class AdminActionLogSerializer(serializers.ModelSerializer):
    """Serializer for admin action logs."""
    actor_email = serializers.CharField(source='actor.email', read_only=True)
    actor_role = serializers.CharField(source='actor.platform_staff_profile.role', read_only=True)
    
    class Meta:
        model = AdminActionLog
        fields = [
            'id', 'actor', 'actor_email', 'actor_role', 'action', 'target_user_id',
            'target_institution_id', 'reason', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SystemStatsSerializer(serializers.Serializer):
    """Serializer for system statistics with trend calculations."""
    total_users = serializers.IntegerField(read_only=True)
    total_users_trend = serializers.FloatField(read_only=True)
    active_users = serializers.IntegerField(read_only=True)
    total_institutions = serializers.IntegerField(read_only=True)
    total_institutions_trend = serializers.FloatField(read_only=True)
    total_internships = serializers.IntegerField(read_only=True)
    total_internships_trend = serializers.FloatField(read_only=True)
    total_applications = serializers.IntegerField(read_only=True)
    total_applications_trend = serializers.FloatField(read_only=True)
    system_load = serializers.FloatField(read_only=True)
    memory_usage = serializers.FloatField(read_only=True)
    disk_usage = serializers.FloatField(read_only=True)
    response_time = serializers.IntegerField(read_only=True)
    api_requests = serializers.IntegerField(read_only=True)
    
    # Platform Staff Specifics
    total_platform_staff = serializers.IntegerField(read_only=True)
    super_admins = serializers.IntegerField(read_only=True)
    platform_admins = serializers.IntegerField(read_only=True)
    moderators = serializers.IntegerField(read_only=True)


class SystemHealthSerializer(serializers.Serializer):
    """Serializer for system health status matching frontend interface."""
    status = serializers.CharField(read_only=True)
    uptime = serializers.CharField(read_only=True)
    last_check = serializers.CharField(read_only=True)
    services = serializers.DictField(read_only=True)


class RecentActivitySerializer(serializers.Serializer):
    """Serializer for recent system activity."""
    id = serializers.CharField(read_only=True)
    action = serializers.CharField(read_only=True)
    actor = serializers.CharField(read_only=True)
    timestamp = serializers.DateTimeField(read_only=True)
    details = serializers.CharField(read_only=True)
    severity = serializers.CharField(read_only=True)


class BulkActionSerializer(serializers.Serializer):
    """Serializer for bulk actions on users."""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=100
    )
    action = serializers.ChoiceField(choices=['suspend', 'reactivate', 'assign_role'])
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)
    
    def validate(self, data):
        """Validate bulk action data."""
        if data['action'] == 'assign_role' and 'role' not in data:
            raise serializers.ValidationError("Role is required for assign_role action")
        return data


class InstitutionRequestAdminSerializer(serializers.Serializer):
    """Serializer for institution request management in admin panel."""
    id = serializers.UUIDField(read_only=True)
    institution_name = serializers.CharField(read_only=True)
    website_url = serializers.CharField(read_only=True)
    requested_domains = serializers.ListField(child=serializers.CharField(), read_only=True)
    representative_name = serializers.CharField(read_only=True)
    representative_email = serializers.EmailField(read_only=True)
    representative_role = serializers.CharField(read_only=True)
    representative_phone = serializers.CharField(read_only=True)
    department = serializers.CharField(read_only=True)
    notes = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    status_display = serializers.SerializerMethodField()
    tracking_code = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    reviewed_at = serializers.DateTimeField(read_only=True)
    rejection_reason = serializers.CharField(read_only=True)
    rejection_reason_code = serializers.CharField(read_only=True)
    days_since_submission = serializers.SerializerMethodField()
    supporting_document = serializers.FileField(read_only=True)
    
    def get_status_display(self, obj):
        """Get human-readable status display."""
        # Map status codes to display names
        status_map = {
            'pending': 'Pending',
            'approved': 'Approved', 
            'rejected': 'Rejected'
        }
        return status_map.get(obj.get('status', ''), obj.get('status', ''))
    
    def get_days_since_submission(self, obj):
        """Get number of days since submission."""
        from django.utils import timezone
        created_at = obj.get('created_at')
        if created_at:
            return (timezone.now() - created_at).days
        return 0


class ReviewInstitutionRequestSerializer(serializers.Serializer):
    """Serializer for reviewing institution requests."""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    rejection_reason_code = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        if data['action'] == 'reject' and not data.get('rejection_reason'):
            raise serializers.ValidationError("Rejection reason is required when rejecting a request")
        
        # Validate rejection reason code if provided
        if data.get('rejection_reason_code'):
            from edulink.apps.institutions import services as institution_services
            valid_choices = institution_services.get_rejection_reason_choices()
            valid_codes = [code for code, _ in valid_choices]
            if data['rejection_reason_code'] not in valid_codes:
                raise serializers.ValidationError(f"Invalid rejection reason code: {data['rejection_reason_code']}")
        
        return data


class LedgerEventSerializer(serializers.Serializer):
    """Serializer for ledger events (Audit Trail)."""
    id = serializers.UUIDField(read_only=True)
    event_type = serializers.CharField(read_only=True)
    entity_type = serializers.CharField(read_only=True)
    entity_id = serializers.UUIDField(read_only=True)
    actor_id = serializers.UUIDField(read_only=True)
    timestamp = serializers.DateTimeField(read_only=True)
    payload = serializers.JSONField(read_only=True)


class InstitutionInterestStatsSerializer(serializers.Serializer):
    """Serializer for institution interest statistics."""
    total_requests = serializers.IntegerField(read_only=True)
    top_requested = serializers.ListField(child=serializers.DictField(), read_only=True)
    requests_over_time = serializers.ListField(child=serializers.DictField(), read_only=True)
    recent_requests = serializers.ListField(child=serializers.DictField(), read_only=True)


class AdminDashboardSerializer(serializers.Serializer):
    system_stats = SystemStatsSerializer(read_only=True)
    system_health = SystemHealthSerializer(read_only=True, required=False)
    recent_actions = LedgerEventSerializer(many=True, read_only=True)
    staff_invite_analytics = serializers.DictField(read_only=True)
    current_staff_role = serializers.CharField(read_only=True)
    pending_institutions_count = serializers.IntegerField(read_only=True)
    recent_users = AdminUserSerializer(many=True, read_only=True)