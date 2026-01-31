"""
Custom permissions for notifications app.
Follows architecture rules: permissions based on roles and events, no business logic.
"""

from rest_framework import permissions
from .models import Notification


class IsNotificationRecipient(permissions.BasePermission):
    """
    Permission to only allow recipients to access their own notifications.
    """
    
    def has_object_permission(self, request, view, obj):
        # Check if the requesting user is the recipient of the notification
        if isinstance(obj, Notification):
            return str(request.user.id) == str(obj.recipient_id)
        return False


class IsSystemAdmin(permissions.BasePermission):
    """
    Permission to only allow system administrators.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_system_admin


class IsNotificationCreator(permissions.BasePermission):
    """
    Permission to only allow notification creators (for system-generated notifications).
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # For system-generated notifications, only system admins can modify
        if isinstance(obj, Notification):
            if obj.related_entity_type in ['System', 'Admin']:
                return request.user.is_system_admin
            return str(request.user.id) == str(obj.recipient_id)
        return False


class CanSendNotification(permissions.BasePermission):
    """
    Permission to check if user can send notifications.
    Only system admins and users with specific roles can send notifications.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # System admins can always send notifications
        if request.user.is_system_admin:
            return True
        
        # Institution admins can send notifications to their students
        if request.user.is_institution_admin:
            return True
        
        # Employer admins can send notifications to their interns
        if request.user.is_employer_admin:
            return True
        
        # Supervisors can send notifications to their assigned students
        if request.user.is_supervisor:
            return True
        
        return False


class CanReadNotification(permissions.BasePermission):
    """
    Permission to check if user can read notifications.
    Recipients can always read their own notifications.
    System admins can read all notifications for monitoring.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Notification):
            # Recipients can always read their own notifications
            if str(request.user.id) == str(obj.recipient_id):
                return True
            
            # System admins can read any notification for monitoring
            if request.user.is_system_admin:
                return True
            
            # Institution admins can read notifications for their domain
            if request.user.is_institution_admin and obj.related_entity_type == 'Student':
                # Additional logic could check if student belongs to admin's institution
                return True
            
            # Employer admins can read notifications for their domain
            if request.user.is_employer_admin and obj.related_entity_type == 'Intern':
                # Additional logic could check if intern belongs to employer's company
                return True
        
        return False