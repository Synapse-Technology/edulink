from rest_framework import permissions
from .models import User


class IsStudent(permissions.BasePermission):
    """Permission class to check if user is a student."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.ROLE_STUDENT


class IsInstitutionAdmin(permissions.BasePermission):
    """Permission class to check if user is an institution admin."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.ROLE_INSTITUTION_ADMIN


class IsEmployerAdmin(permissions.BasePermission):
    """Permission class to check if user is an employer admin."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.ROLE_EMPLOYER_ADMIN


class IsSupervisor(permissions.BasePermission):
    """Permission class to check if user is a supervisor."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.ROLE_SUPERVISOR


class IsSystemAdmin(permissions.BasePermission):
    """Permission class to check if user is a system admin."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.ROLE_SYSTEM_ADMIN


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Permission class to allow owners to edit their own objects."""
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner of the object
        return hasattr(obj, 'user') and obj.user == request.user


class IsAdminOrSystemAdmin(permissions.BasePermission):
    """Permission class to check if user is an admin or system admin."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role == User.ROLE_INSTITUTION_ADMIN or
            request.user.role == User.ROLE_EMPLOYER_ADMIN or
            request.user.role == User.ROLE_SYSTEM_ADMIN
        )


class IsStudentOrSupervisor(permissions.BasePermission):
    """Permission class to check if user is a student or supervisor."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role == User.ROLE_STUDENT or
            request.user.role == User.ROLE_SUPERVISOR
        )


class CanAssignRole(permissions.BasePermission):
    """Permission class to check if user can assign roles to other users."""
    
    def has_permission(self, request, view):
        # Only system admins can assign roles
        return request.user.is_authenticated and request.user.role == User.ROLE_SYSTEM_ADMIN


class CanManageUsers(permissions.BasePermission):
    """Permission class to check if user can manage other users."""
    
    def has_permission(self, request, view):
        # System admins and institution/employer admins can manage users
        return request.user.is_authenticated and (
            request.user.role == User.ROLE_SYSTEM_ADMIN or
            request.user.role == User.ROLE_INSTITUTION_ADMIN or
            request.user.role == User.ROLE_EMPLOYER_ADMIN
        )
