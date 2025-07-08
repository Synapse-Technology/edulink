from rest_framework.permissions import BasePermission
from users.roles import RoleChoices


class IsInstitutionAdmin(BasePermission):
    """
    Allows access only to users with the 'institution_admin' role.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == RoleChoices.INSTITUTION_ADMIN
