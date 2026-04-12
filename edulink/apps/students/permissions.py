"""
Permission classes for the students app.

Enforces object-level access control:
- Students can only access their own profile and applications
- Institution admins can access students affiliated with their institution
- System admins can access all students
- Supervisors can access students they supervise

Follows architecture rule: object-level permissions checked, not just queryset filtering.
"""

from rest_framework import permissions


class IsStudentOwnerOrAdmin(permissions.BasePermission):
    """
    Permission: User can only access student profiles they own or are authorized to manage.
    - Students can only view/edit their own profile
    - Institution admins can view students affiliated with their institution
    - System admins can view all students
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if not user.is_authenticated:
            return False
        
        # System admins can view everything
        if user.is_system_admin:
            return True
        
        # Students can only view their own profile
        if user.is_student:
            from edulink.apps.students.queries import get_student_for_user
            student = get_student_for_user(str(user.id))
            if student and str(obj.id) == str(student.id):
                return True
            return False
        
        # Institution admins can view students affiliated with their institution
        if user.is_institution_admin:
            from edulink.apps.institutions.queries import get_institution_for_user
            inst = get_institution_for_user(str(user.id))
            if inst and obj.institution_id == inst.id:
                return True
            return False
        
        return False


class CanUploadStudentDocuments(permissions.BasePermission):
    """
    Permission: User can upload documents for their own student profile only.
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if not user.is_authenticated:
            return False
        
        # System admins can upload for any student
        if user.is_system_admin:
            return True
        
        # Students can only upload for their own profile
        if user.is_student:
            from edulink.apps.students.queries import get_student_for_user
            student = get_student_for_user(str(user.id))
            if student and str(obj.id) == str(student.id):
                return True
        
        return False


class CanManageAffiliation(permissions.BasePermission):
    """
    Permission: User can manage affiliation based on their role.
    - Students can view their own affiliations
    - Institution admins can verify affiliations for their institution
    - System admins can manage all affiliations
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if not user.is_authenticated:
            return False
        
        # System admins can manage all affiliations
        if user.is_system_admin:
            return True
        
        # Students can view their own affiliations
        if user.is_student:
            from edulink.apps.students.queries import get_student_for_user
            student = get_student_for_user(str(user.id))
            if student and str(obj.student_id) == str(student.id):
                # Can view, but not edit/approve
                if request.method in ['GET', 'HEAD', 'OPTIONS']:
                    return True
            return False
        
        # Institution admins can verify affiliations for their institution
        if user.is_institution_admin:
            from edulink.apps.institutions.queries import get_institution_for_user
            inst = get_institution_for_user(str(user.id))
            if inst and str(obj.institution_id) == str(inst.id):
                # Can view and approve/reject
                if request.method in ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH']:
                    return True
            return False
        
        return False


class CanViewStudentAffiliations(permissions.BasePermission):
    """
    Permission: User can view student affiliations they're authorized for.
    - Students view their own
    - Institution admins view for their institution
    - System admins view all
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # System admins can view all
        if user.is_system_admin:
            return True
        
        # Students can only view their own
        if user.is_student:
            from edulink.apps.students.queries import get_student_for_user
            student = get_student_for_user(str(user.id))
            if student and str(obj.student_id) == str(student.id):
                return True
            return False
        
        # Institution admins can view for their institution
        if user.is_institution_admin:
            from edulink.apps.institutions.queries import get_institution_for_user
            inst = get_institution_for_user(str(user.id))
            if inst and str(obj.institution_id) == str(inst.id):
                return True
            return False
        
        return False
