"""
Permission classes for the internships app.

Enforces object-level access control:
- Students can only view their own applications
- Supervisors can view applications assigned to them
- Institution/Employer admins can view applications for their opportunities
- System admins can access all applications

Follows architecture rule: object-level permissions checked, not just queryset filtering.
"""

from rest_framework import permissions


class CanViewApplication(permissions.BasePermission):
    """
    Permission: User can only view/edit applications they're authorized for.
    - Students can only view their own applications
    - Supervisors can only view applications assigned to them
    - Institution/Employer admins can view applications for their opportunities
    - System admins can view all applications
    
    Follows architecture rule: authorization checked at object level, not just queryset.
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if not user.is_authenticated:
            return False
        
        # System admins can view everything
        if user.is_system_admin:
            return True
        
        # Students can only view their own applications
        if user.is_student:
            from edulink.apps.students.queries import get_student_for_user
            student = get_student_for_user(str(user.id))
            if student and str(obj.student_id) == str(student.id):
                return True
            return False
        
        # Institution admins can view applications for their opportunities + affiliated students
        if user.is_institution_admin:
            from edulink.apps.institutions.queries import get_institution_for_user
            from edulink.apps.students.queries import get_affiliated_student_ids
            
            inst = get_institution_for_user(str(user.id))
            if inst:
                affiliated_ids = get_affiliated_student_ids(str(inst.id))
                if (str(obj.opportunity.institution_id) == str(inst.id) or 
                    str(obj.student_id) in [str(sid) for sid in affiliated_ids]):
                    return True
        
        # Employer admins can view applications for their opportunities
        if user.is_employer_admin:
            from edulink.apps.employers.queries import get_employer_for_user
            employer = get_employer_for_user(str(user.id))
            if employer and str(obj.opportunity.employer_id) == str(employer.id):
                return True
        
        # Supervisors can view applications they're assigned to
        if user.is_supervisor or user.is_institution_staff:
            from edulink.apps.internships.queries import check_supervisor_assigned_to_application
            if check_supervisor_assigned_to_application(str(user.id), str(obj.id)):
                return True
        
        return False


class CanSubmitApplication(permissions.BasePermission):
    """
    Permission: Only students can submit applications.
    Checked at the view level (list/create).
    """
    
    def has_permission(self, request, view):
        if request.method in ['POST']:
            return request.user and request.user.is_authenticated and request.user.is_student
        return request.user and request.user.is_authenticated


class CanWithdrawApplication(permissions.BasePermission):
    """
    Permission: Students can only withdraw their own applications.
    """
    
    def has_object_permission(self, request, view, obj):
        if request.method != 'POST' or view.action != 'withdraw':
            return True
        
        user = request.user
        if not user:
            return False
        
        # System admins can withdraw any application
        if user.is_system_admin:
            return True
        
        # Students can only withdraw their own
        if user.is_student:
            from edulink.apps.students.queries import get_student_for_user
            student = get_student_for_user(str(user.id))
            if student and str(obj.student_id) == str(student.id):
                # Can only withdraw if not already in terminal state
                from .models import ApplicationStatus
                if obj.status not in [
                    ApplicationStatus.COMPLETED,
                    ApplicationStatus.CERTIFIED,
                    ApplicationStatus.TERMINATED,
                    ApplicationStatus.WITHDRAWN,
                ]:
                    return True
        
        return False


class CanSubmitEvidence(permissions.BasePermission):
    """
    Permission: Students can only submit evidence for their own applications.
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if not user:
            return False
        
        # System admins can submit for anyone
        if user.is_system_admin:
            return True
        
        # Students can only submit for their own applications
        if user.is_student:
            from edulink.apps.students.queries import get_student_for_user
            student = get_student_for_user(str(user.id))
            if student and str(obj.student_id) == str(student.id):
                return True
        
        return False


class CanReviewEvidence(permissions.BasePermission):
    """
    Permission: Only supervisors can review evidence.
    - Supervisors assigned to the application can review
    - Admins can review all
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if not user:
            return False
        
        # System admins can review all
        if user.is_system_admin:
            return True
        
        # Institution/Employer admins can review for their organization
        if user.is_institution_admin or user.is_employer_admin:
            # Get the application
            from .models import InternshipApplication
            try:
                application = InternshipApplication.objects.get(
                    internship_evidence__id=obj.id
                )
                
                if user.is_institution_admin:
                    from edulink.apps.institutions.queries import get_institution_for_user
                    inst = get_institution_for_user(str(user.id))
                    if inst and str(application.opportunity.institution_id) == str(inst.id):
                        return True
                
                if user.is_employer_admin:
                    from edulink.apps.employers.queries import get_employer_for_user
                    employer = get_employer_for_user(str(user.id))
                    if employer and str(application.opportunity.employer_id) == str(employer.id):
                        return True
            except:
                pass
        
        # Supervisors assigned to the application can review
        if user.is_supervisor or user.is_institution_staff:
            from .models import InternshipApplication
            try:
                application = InternshipApplication.objects.get(
                    internship_evidence__id=obj.id
                )
                from edulink.apps.internships.queries import check_supervisor_assigned_to_application
                if check_supervisor_assigned_to_application(str(user.id), str(application.id)):
                    return True
            except:
                pass
        
        return False


class CanReportIncident(permissions.BasePermission):
    """
    Permission: Only students can report incidents for their own applications.
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if not user:
            return False
        
        # System admins can report for anyone
        if user.is_system_admin:
            return True
        
        # Students can only report for their own applications
        if user.is_student:
            from edulink.apps.students.queries import get_student_for_user
            student = get_student_for_user(str(user.id))
            if student and str(obj.student_id) == str(student.id):
                return True
        
        return False


class CanViewIncident(permissions.BasePermission):
    """
    Permission: Users can view incidents relevant to them.
    - Students view their own incidents
    - Supervisors view incidents for applications they manage
    - Admins view their organization's incidents
    - System admins view all
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if not user:
            return False
        
        # System admins can view all
        if user.is_system_admin:
            return True
        
        # Students view their own
        if user.is_student:
            from edulink.apps.students.queries import get_student_for_user
            student = get_student_for_user(str(user.id))
            if student and str(obj.student_id) == str(student.id):
                return True
            return False
        
        # Institution admins view for their institution
        if user.is_institution_admin:
            from edulink.apps.institutions.queries import get_institution_for_user
            inst = get_institution_for_user(str(user.id))
            if inst and str(obj.application.opportunity.institution_id) == str(inst.id):
                return True
        
        # Employer admins view for their employer
        if user.is_employer_admin:
            from edulink.apps.employers.queries import get_employer_for_user
            employer = get_employer_for_user(str(user.id))
            if employer and str(obj.application.opportunity.employer_id) == str(employer.id):
                return True
        
        # Supervisors view for their applications
        if user.is_supervisor or user.is_institution_staff:
            from edulink.apps.internships.queries import check_supervisor_assigned_to_application
            if check_supervisor_assigned_to_application(str(user.id), str(obj.application.id)):
                return True
        
        return False
