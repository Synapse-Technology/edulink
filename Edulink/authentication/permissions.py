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
