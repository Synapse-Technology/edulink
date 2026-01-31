from uuid import UUID
from typing import Optional, Union

from edulink.apps.institutions.queries import get_institution_for_user, get_institution_staff_profile
from edulink.apps.students.queries import get_student_for_user
from edulink.apps.employers.policies import can_post_internship as employer_can_post
from edulink.apps.employers.queries import get_employer_by_id, get_employer_for_user, get_employer_supervisor_by_user
from .models import InternshipOpportunity, InternshipApplication, OpportunityStatus, ApplicationStatus

def get_actor_institution_id(actor) -> Optional[UUID]:
    """Helper to get institution ID for an admin user."""
    if not actor.is_institution_admin:
        return None
    inst = get_institution_for_user(str(actor.id))
    return inst.id if inst else None

def can_create_internship(actor, institution_id: Optional[UUID] = None, employer_id: Optional[UUID] = None) -> bool:
    """
    Institution Admins can create internships for their institution.
    Employer Admins can create internships for their employer (if trusted).
    """
    authorized_as_institution = False
    authorized_as_employer = False

    if institution_id and actor.is_institution_admin:
        actor_inst_id = get_actor_institution_id(actor)
        if actor_inst_id == institution_id:
            authorized_as_institution = True
            
    if employer_id:
        employer = get_employer_by_id(employer_id)
        if employer and employer_can_post(actor, employer):
            authorized_as_employer = True
            
    return authorized_as_institution or authorized_as_employer

def can_view_opportunity(actor, opportunity: InternshipOpportunity) -> bool:
    """
    Define visibility rules for Opportunities.
    """
    if actor.is_system_admin:
        return True
    
    # If OPEN, everyone can see
    if opportunity.status == OpportunityStatus.OPEN:
        return True

    # If DRAFT or CLOSED, only owners can see
    if actor.is_institution_admin and opportunity.institution_id:
        return get_actor_institution_id(actor) == opportunity.institution_id
        
    if actor.is_employer_admin and opportunity.employer_id:
        employer = get_employer_for_user(actor.id)
        if employer and employer.id == opportunity.employer_id:
            return True
            
    return False

def can_view_application(actor, application: InternshipApplication) -> bool:
    """
    Define visibility rules for Applications.
    """
    if actor.is_system_admin:
        return True
        
    # The student who applied
    student = get_student_for_user(str(actor.id))
    if student and application.student_id == student.id:
        return True
        
    # The owner of the opportunity
    opportunity = application.opportunity
    if actor.is_institution_admin and opportunity.institution_id:
        if get_actor_institution_id(actor) == opportunity.institution_id:
            return True
            
    if actor.is_employer_admin and opportunity.employer_id:
        employer = get_employer_for_user(actor.id)
        if employer and employer.id == opportunity.employer_id:
            return True
            
    # Supervisors
    if application.institution_supervisor_id:
        staff = get_institution_staff_profile(str(actor.id))
        if staff and (str(application.institution_supervisor_id) == str(staff.id) or str(application.institution_supervisor_id) == str(actor.id)):
            return True
            
    if application.employer_supervisor_id and opportunity.employer_id:
        supervisor = get_employer_supervisor_by_user(user_id=actor.id, employer_id=opportunity.employer_id)
        if supervisor and (str(application.employer_supervisor_id) == str(supervisor.id) or str(application.employer_supervisor_id) == str(actor.id)):
            return True
        
    return False

def can_submit_evidence(actor, application: InternshipApplication) -> bool:
    """
    Only the assigned student can submit evidence, and only when ACTIVE.
    """
    if application.status != ApplicationStatus.ACTIVE:
        return False
        
    if not actor.is_student:
        return False
        
    student = get_student_for_user(str(actor.id))
    return student and application.student_id == student.id

def can_review_evidence(actor, application: InternshipApplication) -> bool:
    """
    Supervisors can review evidence.
    """
    if application.status != ApplicationStatus.ACTIVE:
        return False
        
    # Check if assigned supervisor
    if application.employer_supervisor_id:
        opportunity = application.opportunity
        if opportunity.employer_id:
            supervisor = get_employer_supervisor_by_user(user_id=actor.id, employer_id=opportunity.employer_id)
            if supervisor and (str(application.employer_supervisor_id) == str(supervisor.id) or str(application.employer_supervisor_id) == str(actor.id)):
                return True

    if application.institution_supervisor_id:
        staff = get_institution_staff_profile(str(actor.id))
        if staff and (str(application.institution_supervisor_id) == str(staff.id) or str(application.institution_supervisor_id) == str(actor.id)):
            return True
        
    # Institution Admins should also be able to review
    opportunity = application.opportunity
    if opportunity.institution_id and can_create_internship(actor, institution_id=opportunity.institution_id):
        return True
        
    # Employer Admins (if owner)
    if opportunity.employer_id and can_create_internship(actor, employer_id=opportunity.employer_id):
        return True
        
    return False

def can_flag_misconduct(actor, application: InternshipApplication) -> bool:
    """
    Check if actor can flag misconduct (report incident).
    Allowed: Supervisor, Employer Admin, Institution Admin.
    """
    if application.status != ApplicationStatus.ACTIVE:
        return False
        
    # Check if assigned supervisor
    if application.employer_supervisor_id:
        opportunity = application.opportunity
        if opportunity.employer_id:
            supervisor = get_employer_supervisor_by_user(user_id=actor.id, employer_id=opportunity.employer_id)
            if supervisor and (str(application.employer_supervisor_id) == str(supervisor.id) or str(application.employer_supervisor_id) == str(actor.id)):
                return True

    if application.institution_supervisor_id:
        staff = get_institution_staff_profile(str(actor.id))
        if staff and (str(application.institution_supervisor_id) == str(staff.id) or str(application.institution_supervisor_id) == str(actor.id)):
            return True
        
    opportunity = application.opportunity
    
    # Institution Admins
    if opportunity.institution_id and can_create_internship(actor, institution_id=opportunity.institution_id):
        return True
        
    # Employer Admins
    if opportunity.employer_id and can_create_internship(actor, employer_id=opportunity.employer_id):
        return True
        
    return False

def can_transition_opportunity(actor, opportunity: InternshipOpportunity, target_state: str) -> bool:
    """
    Transition logic for Opportunities (DRAFT -> OPEN -> CLOSED).
    """
    current_state = opportunity.status
    
    # DRAFT -> OPEN
    if current_state == OpportunityStatus.DRAFT and target_state == OpportunityStatus.OPEN:
        if opportunity.institution_id and can_create_internship(actor, institution_id=opportunity.institution_id):
            return True
        if opportunity.employer_id and can_create_internship(actor, employer_id=opportunity.employer_id):
            return True
        return False
        
    # OPEN -> CLOSED
    if current_state == OpportunityStatus.OPEN and target_state == OpportunityStatus.CLOSED:
        if opportunity.institution_id and can_create_internship(actor, institution_id=opportunity.institution_id):
            return True
        if opportunity.employer_id and can_create_internship(actor, employer_id=opportunity.employer_id):
            return True
        return False
        
    return False

def can_transition_application(actor, application: InternshipApplication, target_state: str) -> bool:
    """
    Transition logic for Applications.
    """
    current_state = application.status
    opportunity = application.opportunity
    
    # Helper to check owner authority
    def is_owner():
        if opportunity.institution_id and can_create_internship(actor, institution_id=opportunity.institution_id):
            return True
        if opportunity.employer_id and can_create_internship(actor, employer_id=opportunity.employer_id):
            return True
        return False

    # APPLIED -> SHORTLISTED
    if current_state == ApplicationStatus.APPLIED and target_state == ApplicationStatus.SHORTLISTED:
        return is_owner()

    # SHORTLISTED -> ACCEPTED
    if current_state == ApplicationStatus.SHORTLISTED and target_state == ApplicationStatus.ACCEPTED:
        return is_owner()

    # ACCEPTED -> ACTIVE (Starting)
    if current_state == ApplicationStatus.ACCEPTED and target_state == ApplicationStatus.ACTIVE:
        return is_owner()

    # ACTIVE -> COMPLETED
    if current_state == ApplicationStatus.ACTIVE and target_state == ApplicationStatus.COMPLETED:
        if is_owner():
            return True
        
        # Supervisors
        if application.institution_supervisor_id:
            staff = get_institution_staff_profile(str(actor.id))
            if staff and (str(application.institution_supervisor_id) == str(staff.id) or str(application.institution_supervisor_id) == str(actor.id)) and not opportunity.employer_id:
                return True

        if application.employer_supervisor_id and opportunity.employer_id:
            supervisor = get_employer_supervisor_by_user(user_id=actor.id, employer_id=opportunity.employer_id)
            if supervisor and (str(application.employer_supervisor_id) == str(supervisor.id) or str(application.employer_supervisor_id) == str(actor.id)):
                return True

        return False

    # COMPLETED -> CERTIFIED
    if current_state == ApplicationStatus.COMPLETED and target_state == ApplicationStatus.CERTIFIED:
        # Only Institution Admin
        if opportunity.institution_id and can_create_internship(actor, institution_id=opportunity.institution_id):
            return True
        return False

    # Rejection (APPLIED/SHORTLISTED -> REJECTED)
    if target_state == ApplicationStatus.REJECTED:
        if current_state in [ApplicationStatus.APPLIED, ApplicationStatus.SHORTLISTED]:
            return is_owner()
        return False
        
    return False

def can_submit_final_feedback(actor, application: InternshipApplication) -> bool:
    """
    Assigned supervisors or admins can submit final feedback.
    """
    # Valid states for feedback: ACTIVE, COMPLETED, CERTIFIED
    if application.status not in [ApplicationStatus.ACTIVE, ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED]:
        return False

    # Check if assigned supervisor
    is_assigned = False
    if application.employer_supervisor_id:
        opportunity = application.opportunity
        if opportunity.employer_id:
            supervisor = get_employer_supervisor_by_user(user_id=actor.id, employer_id=opportunity.employer_id)
            if supervisor and (str(application.employer_supervisor_id) == str(supervisor.id) or str(application.employer_supervisor_id) == str(actor.id)):
                is_assigned = True

    if not is_assigned and application.institution_supervisor_id:
        staff = get_institution_staff_profile(str(actor.id))
        if staff and (str(application.institution_supervisor_id) == str(staff.id) or str(application.institution_supervisor_id) == str(actor.id)):
            is_assigned = True

    if is_assigned:
        return True

    # Admins
    opportunity = application.opportunity
    if opportunity.institution_id and can_create_internship(actor, institution_id=opportunity.institution_id):
        return True
    if opportunity.employer_id and can_create_internship(actor, employer_id=opportunity.employer_id):
        return True

    return False

def can_assign_supervisor(actor, opportunity: InternshipOpportunity) -> bool:
    """
    Only Institution Admins or Employer Admins can assign supervisors.
    """
    if opportunity.institution_id and can_create_internship(actor, institution_id=opportunity.institution_id):
        return True
    if opportunity.employer_id and can_create_internship(actor, employer_id=opportunity.employer_id):
        return True
    return False

def can_bulk_assign_supervisors(actor) -> bool:
    """
    Only Institution Admins can perform bulk assignment.
    """
    return actor.is_institution_admin
