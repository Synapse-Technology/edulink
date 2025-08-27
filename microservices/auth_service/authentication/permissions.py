from rest_framework import permissions
from .models import RoleChoices


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permission to only allow owners of an object or admins to edit it."""
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Write permissions only to the owner or admin
        return (
            request.user.is_authenticated and (
                obj == request.user or 
                request.user.role in [RoleChoices.SUPER_ADMIN, RoleChoices.INSTITUTION_ADMIN]
            )
        )


class IsAdminUser(permissions.BasePermission):
    """Permission for admin users only."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role in [RoleChoices.SUPER_ADMIN, RoleChoices.INSTITUTION_ADMIN]
        )


class IsSuperAdmin(permissions.BasePermission):
    """Permission for super admin users only."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == RoleChoices.SUPER_ADMIN
        )


class IsInstitutionAdmin(permissions.BasePermission):
    """Permission for institution admin users."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == RoleChoices.INSTITUTION_ADMIN
        )


class IsEmployer(permissions.BasePermission):
    """Permission for employer users."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == RoleChoices.EMPLOYER
        )


class IsStudent(permissions.BasePermission):
    """Permission for student users."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == RoleChoices.STUDENT
        )


class IsEmailVerified(permissions.BasePermission):
    """Permission that requires email verification."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.is_email_verified
        )


class CanManageUsers(permissions.BasePermission):
    """Permission for users who can manage other users."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role in [
                RoleChoices.SUPER_ADMIN, 
                RoleChoices.INSTITUTION_ADMIN
            ]
        )


class CanCreateInvites(permissions.BasePermission):
    """Permission for users who can create invitations."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role in [
                RoleChoices.SUPER_ADMIN, 
                RoleChoices.INSTITUTION_ADMIN,
                RoleChoices.EMPLOYER
            ]
        )


class IsServiceAccount(permissions.BasePermission):
    """Permission for service-to-service communication."""
    
    def has_permission(self, request, view):
        # Check for service authentication header
        service_token = request.META.get('HTTP_X_SERVICE_TOKEN')
        if not service_token:
            return False
        
        # Validate service token (implement your service authentication logic)
        from django.conf import settings
        return service_token in getattr(settings, 'ALLOWED_SERVICE_TOKENS', [])


class RoleBasedPermission(permissions.BasePermission):
    """Base class for role-based permissions with flexible role checking."""
    
    allowed_roles = []
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return request.user.role in self.allowed_roles


class ReadOnlyOrOwner(permissions.BasePermission):
    """Permission that allows read-only access to everyone, write access to owner."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only to the owner
        return obj == request.user


class IsActiveUser(permissions.BasePermission):
    """Permission that requires user to be active."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.is_active and
            not request.user.is_account_locked()
        )