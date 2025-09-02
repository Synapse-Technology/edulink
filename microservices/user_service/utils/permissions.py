from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner of the object.
        return obj.user == request.user


class IsStudentUser(permissions.BasePermission):
    """
    Permission class to check if user has student role.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return hasattr(request.user, 'roles') and request.user.roles.filter(
            role='STUDENT',
            is_active=True
        ).exists()


class IsEmployerUser(permissions.BasePermission):
    """
    Permission class to check if user has employer role.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return hasattr(request.user, 'roles') and request.user.roles.filter(
            role='EMPLOYER',
            is_active=True
        ).exists()


class IsInstitutionAdmin(permissions.BasePermission):
    """
    Permission class to check if user has institution admin role.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return hasattr(request.user, 'roles') and request.user.roles.filter(
            role='INSTITUTION_ADMIN',
            is_active=True
        ).exists()
    
    def has_object_permission(self, request, view, obj):
        if not self.has_permission(request, view):
            return False
        
        # Check if user is admin of the specific institution
        user_roles = request.user.roles.filter(
            role='INSTITUTION_ADMIN',
            is_active=True
        )
        
        # Get institution from object
        institution = None
        if hasattr(obj, 'institution'):
            institution = obj.institution
        elif hasattr(obj, 'id') and hasattr(obj, 'name'):  # Likely an Institution object
            institution = obj
        
        if institution:
            return user_roles.filter(organization_id=institution.id).exists()
        
        return False


class IsSystemAdmin(permissions.BasePermission):
    """
    Permission class to check if user has system admin role.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return (
            request.user.is_superuser or
            (hasattr(request.user, 'roles') and request.user.roles.filter(
                role='SUPER_ADMIN',
                is_active=True
            ).exists())
        )


class IsSuperAdminOrSystemAdmin(permissions.BasePermission):
    """
    Permission class for super admin or system admin access.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return (
            request.user.is_superuser or
            (hasattr(request.user, 'roles') and request.user.roles.filter(
                role__in=['SUPER_ADMIN', 'SYSTEM'],
                is_active=True
            ).exists())
        )


class IsOwnerOrInstitutionAdmin(permissions.BasePermission):
    """
    Permission class to allow access to object owner or institution admin.
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow if user is the owner
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        
        # Allow if user is institution admin for the related institution
        if hasattr(request.user, 'roles'):
            institution_admin_roles = request.user.roles.filter(
                role='INSTITUTION_ADMIN',
                is_active=True
            )
            
            # Get institution from object
            institution = None
            if hasattr(obj, 'institution'):
                institution = obj.institution
            elif hasattr(obj, 'user') and hasattr(obj.user, 'student_profile'):
                institution = getattr(obj.user.student_profile, 'institution', None)
            
            if institution:
                return institution_admin_roles.filter(
                    organization_id=institution.id
                ).exists()
        
        return False


class IsVerifiedUser(permissions.BasePermission):
    """
    Permission class to check if user is verified.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.is_verified


class IsActiveUser(permissions.BasePermission):
    """
    Permission class to check if user is active.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.is_active


class HasRolePermission(permissions.BasePermission):
    """
    Permission class to check if user has specific role permission.
    """
    
    def __init__(self, permission_name):
        self.permission_name = permission_name
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if not hasattr(request.user, 'roles'):
            return False
        
        # Check if user has any active role with the required permission
        user_roles = request.user.roles.filter(is_active=True)
        
        for role in user_roles:
            if role.permissions.filter(
                name=self.permission_name,
                is_active=True
            ).exists():
                return True
        
        return False


class CanManageProfiles(permissions.BasePermission):
    """
    Permission class for profile management.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # System admins can manage all profiles
        if request.user.is_superuser:
            return True
        
        # Institution admins can manage profiles in their institution
        if hasattr(request.user, 'roles'):
            return request.user.roles.filter(
                role__in=['SUPER_ADMIN', 'INSTITUTION_ADMIN'],
                is_active=True
            ).exists()
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if not self.has_permission(request, view):
            return False
        
        # System admins can manage all profiles
        if request.user.is_superuser:
            return True
        
        # Users can manage their own profiles
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        
        # Institution admins can manage profiles in their institution
        if hasattr(request.user, 'roles'):
            admin_roles = request.user.roles.filter(
                role='INSTITUTION_ADMIN',
                is_active=True
            )
            
            # Get institution from profile
            institution = getattr(obj, 'institution', None)
            if institution:
                return admin_roles.filter(
                    organization_id=institution.id
                ).exists()
        
        return False


class CanManageRoles(permissions.BasePermission):
    """
    Permission class for role management.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # System admins can manage all roles
        if request.user.is_superuser:
            return True
        
        # Institution admins can manage roles in their institution
        if hasattr(request.user, 'roles'):
            return request.user.roles.filter(
                role__in=['SUPER_ADMIN', 'INSTITUTION_ADMIN'],
                is_active=True
            ).exists()
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if not self.has_permission(request, view):
            return False
        
        # System admins can manage all roles
        if request.user.is_superuser:
            return True
        
        # Institution admins can only manage roles in their institution
        if hasattr(request.user, 'roles'):
            admin_roles = request.user.roles.filter(
                role='INSTITUTION_ADMIN',
                is_active=True
            )
            
            # Check if the role being managed is for the same institution
            if hasattr(obj, 'organization_id') and obj.organization_id:
                return admin_roles.filter(
                    organization_id=obj.organization_id
                ).exists()
        
        return False


class ServiceToServicePermission(permissions.BasePermission):
    """
    Permission class for service-to-service communication.
    """
    
    def has_permission(self, request, view):
        # Check for service authentication header
        service_token = request.META.get('HTTP_X_SERVICE_TOKEN')
        if not service_token:
            return False
        
        # Validate service token (implement your service token validation logic)
        from django.conf import settings
        return service_token == getattr(settings, 'SERVICE_SECRET_KEY', None)