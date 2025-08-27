from rest_framework import permissions
from django.utils import timezone
import sys
import os

# Add shared modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

from base_service import BaseService, ServiceRegistry


class IsEmployerOwner(permissions.BasePermission):
    """Permission to ensure the user is the employer who owns the internship"""
    
    def has_object_permission(self, request, view, obj):
        # In microservice architecture, we need to verify employer ownership
        # through the user service
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return False
        
        # For now, we'll use a simple check - in production, this would call the user service
        # to verify the employer relationship
        return True  # Simplified for microservice setup


class IsVerifiedEmployer(permissions.BasePermission):
    """Permission to restrict access to verified employers only"""
    
    def has_permission(self, request, view):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return False
        
        # This would call the user service to verify employer status
        # For now, we'll allow all authenticated users
        return True  # Simplified for microservice setup


class CanEditInternship(permissions.BasePermission):
    """Permission to allow editing only if the internship is not yet verified"""
    
    def has_object_permission(self, request, view, obj):
        # Allow editing only if internship is not verified or user is admin
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Check if user is the owner
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return False
        
        # Don't allow editing if already verified (unless admin)
        if obj.is_verified:
            # This would check if user is admin through user service
            return False  # Simplified - only allow unverified internship edits
        
        return True


class CanVerifyInternship(permissions.BasePermission):
    """Permission to allow verification only by institution admins"""
    
    def has_permission(self, request, view):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return False
        
        # This would call the user service to verify institution admin role
        # For now, we'll allow all authenticated users
        return True  # Simplified for microservice setup
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only allow verification by institution admins linked to the internship's institution
        # This would involve calling the user service to verify the relationship
        return True  # Simplified for microservice setup


class CanViewInternship(permissions.BasePermission):
    """Permission to control viewing based on internship visibility settings"""
    
    def has_object_permission(self, request, view, obj):
        # Public internships can be viewed by anyone
        if obj.visibility == 'public':
            return True
        
        # Institution-only internships require authentication and institution membership
        if obj.visibility == 'institution-only':
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                return False
            
            # This would call the user service to verify institution membership
            # For now, we'll allow all authenticated users
            return True  # Simplified for microservice setup
        
        return False


class IsInternshipActive(permissions.BasePermission):
    """Permission to ensure internship is active and not expired"""
    
    def has_object_permission(self, request, view, obj):
        # Check if internship is active
        if not obj.is_active:
            return False
        
        # Check if internship is not expired
        if obj.is_expired:
            return False
        
        return True


class CanManageInternshipSettings(permissions.BasePermission):
    """Permission for managing internship settings like featured status"""
    
    def has_permission(self, request, view):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return False
        
        # This would call the user service to verify admin/staff role
        # For now, we'll allow all authenticated users
        return True  # Simplified for microservice setup


class ServicePermissionMixin:
    """Mixin to provide service communication capabilities for permissions"""
    
    def __init__(self):
        self.service_registry = ServiceRegistry()
        # Register user service for permission checks
        from service_config import get_config
        config = get_config()
        # Note: USER_SERVICE_URL would need to be added to config
        # self.service_registry.register_service('user', config.USER_SERVICE_URL)
    
    async def verify_user_role(self, user_id, role_type):
        """Verify user role through user service"""
        try:
            user_service = BaseService('user', self.service_registry)
            response = await user_service.get(f'/api/v1/users/{user_id}/roles/')
            return role_type in response.get('roles', [])
        except Exception:
            return False
    
    async def verify_employer_ownership(self, user_id, employer_id):
        """Verify employer ownership through user service"""
        try:
            user_service = BaseService('user', self.service_registry)
            response = await user_service.get(f'/api/v1/employers/{employer_id}/')
            return response.get('user_id') == user_id
        except Exception:
            return False
    
    async def verify_institution_membership(self, user_id, institution_id):
        """Verify institution membership through user service"""
        try:
            user_service = BaseService('user', self.service_registry)
            response = await user_service.get(f'/api/v1/institutions/{institution_id}/members/')
            member_ids = [member['user_id'] for member in response.get('members', [])]
            return user_id in member_ids
        except Exception:
            return False