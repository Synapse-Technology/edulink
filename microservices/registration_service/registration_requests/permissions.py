from rest_framework import permissions
from .models import RegistrationRequest


class IsAdminUser(permissions.BasePermission):
    """Permission class for admin users only."""
    
    def has_permission(self, request, view):
        """Check if user is authenticated and is admin."""
        return (
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'is_staff', False)
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permission class for object owner or admin users."""
    
    def has_permission(self, request, view):
        """Check if user is authenticated."""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Check if user is owner of the registration request or admin."""
        # Admin users have full access
        if getattr(request.user, 'is_staff', False):
            return True
        
        # Check if user is the owner of the registration request
        if isinstance(obj, RegistrationRequest):
            return obj.email == request.user.email
        
        return False


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Permission class for read-only access or owner write access."""
    
    def has_object_permission(self, request, view, obj):
        """Read permissions for any request, write permissions for owner only."""
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        if isinstance(obj, RegistrationRequest):
            return obj.email == request.user.email
        
        return False


class IsInstitutionAdmin(permissions.BasePermission):
    """Permission class for institution admin users only."""
    
    def has_permission(self, request, view):
        """Check if user is authenticated and has institution_admin role."""
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Check if user has institution_admin role
        user_role = getattr(request.user, 'role', None)
        return user_role == 'institution_admin'


class CanManageRegistrations(permissions.BasePermission):
    """Permission class for users who can manage registrations."""
    
    def has_permission(self, request, view):
        """Check if user can manage registrations."""
        return (
            request.user and 
            request.user.is_authenticated and 
            (
                getattr(request.user, 'is_staff', False) or
                getattr(request.user, 'is_superuser', False) or
                self._has_registration_management_role(request.user)
            )
        )
    
    def _has_registration_management_role(self, user):
        """Check if user has registration management role."""
        # This would check user's role/permissions in the actual implementation
        # For now, we'll check if user has specific attributes
        return getattr(user, 'can_manage_registrations', False)