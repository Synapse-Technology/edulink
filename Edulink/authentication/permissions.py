from rest_framework import permissions
from users.roles import RoleChoices

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to admin users (super_admin).
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == RoleChoices.SUPER_ADMIN

class IsEmployer(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == RoleChoices.EMPLOYER

class IsInstitution(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == RoleChoices.INSTITUTION_ADMIN

class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == RoleChoices.STUDENT

class IsOwnStudentProfile(permissions.BasePermission):
    """
    Allows students to view/edit only their own profile.
    Assumes the view's queryset returns StudentProfile objects.
    """
    def has_object_permission(self, request, view, obj):
        return (
            request.user.is_authenticated and
            request.user.role == RoleChoices.STUDENT and
            obj.user == request.user
        )

class IsOwnEmployerInternship(permissions.BasePermission):
    """
    Allows employers to manage only their own internship listings.
    Assumes the Internship model has an 'employer' field (FK to EmployerProfile).
    """
    def has_object_permission(self, request, view, obj):
        return (
            request.user.is_authenticated and
            request.user.role == RoleChoices.EMPLOYER and
            hasattr(request.user, 'employerprofile') and
            obj.employer == request.user.employerprofile
        )
