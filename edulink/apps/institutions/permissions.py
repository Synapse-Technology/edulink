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
