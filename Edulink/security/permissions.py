from rest_framework import permissions
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()


class IsSecurityAdmin(permissions.BasePermission):
    """Permission class for security administrators."""
    
    def has_permission(self, request, view):
        """Check if user has security admin permissions."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers always have access
        if request.user.is_superuser:
            return True
        
        # Check if user is in security admin group
        try:
            security_admin_group = Group.objects.get(name='Security Admins')
            return security_admin_group in request.user.groups.all()
        except Group.DoesNotExist:
            pass
        
        # Check if user has specific security admin permission
        return request.user.has_perm('security.can_manage_security')
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permissions for security admins."""
        return self.has_permission(request, view)


class IsSecurityAnalyst(permissions.BasePermission):
    """Permission class for security analysts (read-only access)."""
    
    def has_permission(self, request, view):
        """Check if user has security analyst permissions."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers always have access
        if request.user.is_superuser:
            return True
        
        # Security admins also have analyst permissions
        if IsSecurityAdmin().has_permission(request, view):
            return True
        
        # Check if user is in security analyst group
        try:
            security_analyst_group = Group.objects.get(name='Security Analysts')
            if security_analyst_group in request.user.groups.all():
                return True
        except Group.DoesNotExist:
            pass
        
        # Check if user has specific security analyst permission
        return request.user.has_perm('security.can_view_security')
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permissions for security analysts."""
        return self.has_permission(request, view)


class IsSecurityAuditor(permissions.BasePermission):
    """Permission class for security auditors (audit log access)."""
    
    def has_permission(self, request, view):
        """Check if user has security auditor permissions."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers always have access
        if request.user.is_superuser:
            return True
        
        # Security admins and analysts also have auditor permissions
        if (IsSecurityAdmin().has_permission(request, view) or 
            IsSecurityAnalyst().has_permission(request, view)):
            return True
        
        # Check if user is in security auditor group
        try:
            security_auditor_group = Group.objects.get(name='Security Auditors')
            if security_auditor_group in request.user.groups.all():
                return True
        except Group.DoesNotExist:
            pass
        
        # Check if user has specific security auditor permission
        return request.user.has_perm('security.can_audit_security')
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permissions for security auditors."""
        return self.has_permission(request, view)


class CanManageOwnSessions(permissions.BasePermission):
    """Permission to manage own user sessions."""
    
    def has_permission(self, request, view):
        """Check if user can manage sessions."""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Check if user can manage specific session."""
        # Users can only manage their own sessions
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Security admins can manage any session
        return IsSecurityAdmin().has_permission(request, view)


class CanViewOwnSecurityEvents(permissions.BasePermission):
    """Permission to view own security events."""
    
    def has_permission(self, request, view):
        """Check if user can view security events."""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Check if user can view specific security event."""
        # Users can only view their own security events
        if hasattr(obj, 'user') and obj.user:
            return obj.user == request.user
        
        # Security analysts and admins can view any event
        return IsSecurityAnalyst().has_permission(request, view)


class IsSystemUser(permissions.BasePermission):
    """Permission for system-level operations."""
    
    def has_permission(self, request, view):
        """Check if user has system-level permissions."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Only superusers and specific system users
        return (
            request.user.is_superuser or 
            request.user.has_perm('security.can_system_access')
        )


class SecurityReadOnlyPermission(permissions.BasePermission):
    """Read-only permission for security data."""
    
    def has_permission(self, request, view):
        """Allow read-only access for authenticated users."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow read operations for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write operations require security analyst permissions
        return IsSecurityAnalyst().has_permission(request, view)


class SecurityWritePermission(permissions.BasePermission):
    """Write permission for security data."""
    
    def has_permission(self, request, view):
        """Allow write access for security admins only."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Write operations require security admin permissions
        return IsSecurityAdmin().has_permission(request, view)


class CanAccessSecurityDashboard(permissions.BasePermission):
    """Permission to access security dashboard."""
    
    def has_permission(self, request, view):
        """Check if user can access security dashboard."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow access for security personnel
        return (
            IsSecurityAdmin().has_permission(request, view) or
            IsSecurityAnalyst().has_permission(request, view) or
            IsSecurityAuditor().has_permission(request, view)
        )


class CanGenerateSecurityReports(permissions.BasePermission):
    """Permission to generate security reports."""
    
    def has_permission(self, request, view):
        """Check if user can generate security reports."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow report generation for analysts and admins
        return (
            IsSecurityAdmin().has_permission(request, view) or
            IsSecurityAnalyst().has_permission(request, view)
        )


class CanManageSecurityConfiguration(permissions.BasePermission):
    """Permission to manage security configuration."""
    
    def has_permission(self, request, view):
        """Check if user can manage security configuration."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Only security admins can manage configuration
        return IsSecurityAdmin().has_permission(request, view)


class CanRespondToIncidents(permissions.BasePermission):
    """Permission to respond to security incidents."""
    
    def has_permission(self, request, view):
        """Check if user can respond to security incidents."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow incident response for admins and analysts
        return (
            IsSecurityAdmin().has_permission(request, view) or
            IsSecurityAnalyst().has_permission(request, view)
        )


class IPBasedPermission(permissions.BasePermission):
    """Permission based on IP address restrictions."""
    
    def __init__(self, allowed_ips=None):
        self.allowed_ips = allowed_ips or []
    
    def has_permission(self, request, view):
        """Check if request comes from allowed IP."""
        if not self.allowed_ips:
            return True  # No IP restrictions
        
        client_ip = self.get_client_ip(request)
        return client_ip in self.allowed_ips
    
    def get_client_ip(self, request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class TimeBasedPermission(permissions.BasePermission):
    """Permission based on time restrictions."""
    
    def __init__(self, allowed_hours=None):
        """Initialize with allowed hours (24-hour format)."""
        self.allowed_hours = allowed_hours or list(range(24))  # All hours by default
    
    def has_permission(self, request, view):
        """Check if request is made during allowed hours."""
        from django.utils import timezone
        current_hour = timezone.now().hour
        return current_hour in self.allowed_hours


class RateLimitedPermission(permissions.BasePermission):
    """Permission with rate limiting."""
    
    def __init__(self, rate_limit=100, time_window=3600):
        """Initialize with rate limit and time window."""
        self.rate_limit = rate_limit
        self.time_window = time_window
    
    def has_permission(self, request, view):
        """Check if request is within rate limits."""
        from django.core.cache import cache
        
        # Get client identifier
        client_id = self.get_client_identifier(request)
        cache_key = f"rate_limit:{client_id}"
        
        # Get current request count
        current_count = cache.get(cache_key, 0)
        
        if current_count >= self.rate_limit:
            return False
        
        # Increment counter
        cache.set(cache_key, current_count + 1, self.time_window)
        return True
    
    def get_client_identifier(self, request):
        """Get unique identifier for client."""
        if request.user.is_authenticated:
            return f"user:{request.user.pk}"
        else:
            # Use IP address for anonymous users
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')
            return f"ip:{ip}"


# Utility functions for permission checking
def check_security_permission(user, permission_type):
    """Check if user has specific security permission."""
    if not user or not user.is_authenticated:
        return False
    
    permission_map = {
        'admin': IsSecurityAdmin,
        'analyst': IsSecurityAnalyst,
        'auditor': IsSecurityAuditor,
        'system': IsSystemUser
    }
    
    permission_class = permission_map.get(permission_type)
    if permission_class:
        return permission_class().has_permission(None, None)  # Mock request/view
    
    return False


def get_user_security_level(user):
    """Get user's security access level."""
    if not user or not user.is_authenticated:
        return 'none'
    
    if user.is_superuser:
        return 'superuser'
    
    # Check permissions in order of hierarchy
    if check_security_permission(user, 'admin'):
        return 'admin'
    elif check_security_permission(user, 'analyst'):
        return 'analyst'
    elif check_security_permission(user, 'auditor'):
        return 'auditor'
    else:
        return 'user'


def create_security_groups():
    """Create default security groups if they don't exist."""
    from django.contrib.auth.models import Group, Permission
    from django.contrib.contenttypes.models import ContentType
    
    # Get security content type
    try:
        security_ct = ContentType.objects.get(app_label='security')
    except ContentType.DoesNotExist:
        return  # Security app not migrated yet
    
    # Define groups and their permissions
    groups_permissions = {
        'Security Admins': [
            'can_manage_security',
            'can_view_security',
            'can_audit_security',
            'can_system_access'
        ],
        'Security Analysts': [
            'can_view_security',
            'can_audit_security'
        ],
        'Security Auditors': [
            'can_audit_security'
        ]
    }
    
    for group_name, permissions in groups_permissions.items():
        group, created = Group.objects.get_or_create(name=group_name)
        
        if created:
            print(f"Created security group: {group_name}")
        
        # Add permissions to group
        for perm_codename in permissions:
            try:
                permission = Permission.objects.get(
                    content_type=security_ct,
                    codename=perm_codename
                )
                group.permissions.add(permission)
            except Permission.DoesNotExist:
                print(f"Permission {perm_codename} not found")