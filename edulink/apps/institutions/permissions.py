from rest_framework import permissions
from .models import InstitutionStaff

class IsActiveInstitutionAdmin(permissions.BasePermission):
    """
    Allows access only to institution admins of ACTIVE institutions.
    Used for operational access (Phase 4).
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        # Check if user has an admin staff record
        staff_record = InstitutionStaff.objects.filter(
            user=request.user,
            role=InstitutionStaff.ROLE_ADMIN,
            is_active=True
        ).select_related('institution').first()
        
        if not staff_record:
            return False
            
        return staff_record.institution.is_active


class IsInstitutionCoordinator(permissions.BasePermission):
    """
    Operational attachment-coordination access for an institution.

    In the current product model, an active institution admin is the overall
    attachment coordinator for the institution. Keeping this as a capability
    makes it easier to delegate coordinator access later without rewriting views.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        return InstitutionStaff.objects.filter(
            user=request.user,
            role=InstitutionStaff.ROLE_ADMIN,
            is_active=True,
            institution__is_active=True,
        ).exists()
