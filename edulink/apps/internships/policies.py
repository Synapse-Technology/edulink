from uuid import UUID
from typing import Optional, Union

from edulink.apps.institutions.queries import get_institution_for_user, get_institution_staff_profile
from edulink.apps.students.queries import get_student_for_user, get_student_approved_affiliation
from edulink.apps.employers.policies import can_post_internship as employer_can_post
from edulink.apps.employers.queries import get_employer_by_id, get_employer_for_user, get_employer_supervisor_by_user
from .models import InternshipOpportunity, InternshipApplication, OpportunityStatus, ApplicationStatus, ExternalPlacementDeclaration

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
    if getattr(actor, "is_system_admin", False) is True:
        return True

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
    if actor.is_institution_admin:
        if opportunity.origin == InternshipOpportunity.ORIGIN_EXTERNAL_STUDENT_DECLARED:
            return False
        if opportunity.institution_id:
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
    Allowed only in ACTIVE state to prevent tampering after completion/certification.
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
        
    # Also allow if the student belongs to the institution
    affiliation = get_student_approved_affiliation(application.student_id)
    if affiliation and affiliation.institution_id:
            if can_create_internship(actor, institution_id=affiliation.institution_id):
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
        
    # Also allow if the student belongs to the institution
    affiliation = get_student_approved_affiliation(application.student_id)
    if affiliation and affiliation.institution_id:
            if can_create_internship(actor, institution_id=affiliation.institution_id):
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
        if getattr(actor, "is_system_admin", False) is True:
            return True
        if opportunity.institution_id and can_create_internship(actor, institution_id=opportunity.institution_id):
            return True
        if opportunity.employer_id and can_create_internship(actor, employer_id=opportunity.employer_id):
            return True
        return False
        
    # OPEN -> CLOSED
    if current_state == OpportunityStatus.OPEN and target_state == OpportunityStatus.CLOSED:
        if getattr(actor, "is_system_admin", False) is True:
            return True
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
        # 1. If the opportunity belongs to an institution, that institution's admin can certify.
        if opportunity.institution_id and can_create_internship(actor, institution_id=opportunity.institution_id):
            return True
            
        # 2. If the opportunity is external (Employer), the student's institution admin can certify.
        affiliation = get_student_approved_affiliation(application.student_id)
        if affiliation and affiliation.institution_id:
             if can_create_internship(actor, institution_id=affiliation.institution_id):
                 return True
                 
        return False

    # Rejection (APPLIED/SHORTLISTED -> REJECTED)
    if target_state == ApplicationStatus.REJECTED:
        if current_state in [ApplicationStatus.APPLIED, ApplicationStatus.SHORTLISTED]:
            return is_owner()
        return False

    if target_state == ApplicationStatus.WITHDRAWN:
        return can_withdraw_application(actor, application)
        
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
        
    # Also allow if the student belongs to the institution
    affiliation = get_student_approved_affiliation(application.student_id)
    if affiliation and affiliation.institution_id:
            if can_create_internship(actor, institution_id=affiliation.institution_id):
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

def can_withdraw_application(actor, application: InternshipApplication) -> bool:
    """
    Define authorization rules for withdrawing an application.
    
    Rules:
    - Students can withdraw their own applications at any time (except ACTIVE/COMPLETED)
    - System admins can withdraw any application
    - Supervisors cannot withdraw applications
    """
    # System admin can withdraw any application
    if actor.is_system_admin:
        return True
    
    # Students can only withdraw their own applications
    if actor.is_student:
        student = get_student_for_user(str(actor.id))
        if student and str(student.id) == str(application.student_id):
            # Check if withdrawal is allowed from current state
            allowed_states = [
                ApplicationStatus.APPLIED,
                ApplicationStatus.SHORTLISTED,
                ApplicationStatus.ACCEPTED
            ]
            return application.status in allowed_states
    
    return False


# Incident Authorization Policies

def can_assign_incident_investigator(actor, incident) -> bool:
    """
    Determine if actor can assign an investigator to an incident.
    Allowed: Employer Admin, Institution Admin, System Admin
    """
    return actor.is_employer_admin or actor.is_institution_admin or actor.is_system_admin


def can_investigate_incident(actor, incident) -> bool:
    """
    Determine if actor can conduct investigation on an incident.
    Allowed: Assigned investigator, Admins
    """
    # Assigned investigator can investigate
    if incident.investigator_id and actor.id == incident.investigator_id:
        return True
    
    # Admins can investigate any incident
    return actor.is_employer_admin or actor.is_institution_admin or actor.is_system_admin


def can_propose_incident_resolution(actor, incident) -> bool:
    """
    Determine if actor can propose resolution for an incident.
    Allowed: Assigned investigator, Admins (not just anyone)
    """
    # Only the investigator or admins can propose
    is_investigator = incident.investigator_id and actor.id == incident.investigator_id
    is_admin = actor.is_employer_admin or actor.is_institution_admin or actor.is_system_admin
    
    return is_investigator or is_admin


def can_approve_incident_resolution(actor, incident) -> bool:
    """
    Determine if actor can approve a proposed incident resolution.
    Allowed: Admins only (not the investigator)
    
    This enforces separation of concerns: investigator proposes, admin approves.
    """
    return actor.is_employer_admin or actor.is_institution_admin or actor.is_system_admin


def can_dismiss_incident(actor, incident) -> bool:
    """
    Determine if actor can dismiss an incident.
    Allowed: Admins only (requires justification)
    """
    return actor.is_employer_admin or actor.is_institution_admin or actor.is_system_admin


# ==================== Phase 2.4: Supervisor Assignment Acceptance Policies ====================

def can_accept_supervisor_assignment(actor, assignment) -> bool:
    """
    Determine if actor can accept a supervisor assignment.
    Allowed: Only the assigned supervisor
    
    Enforcement: Only the person named in the assignment can accept it.
    This prevents admins or others from auto-accepting on their behalf.
    """
    return _actor_matches_supervisor_assignment(actor, assignment)


def can_reject_supervisor_assignment(actor, assignment) -> bool:
    """
    Determine if actor can reject a supervisor assignment.
    Allowed: Only the assigned supervisor
    
    Enforcement: Only the assigned supervisor can reject their own assignment.
    Admin cannot force rejection; supervisor has agency.
    """
    return _actor_matches_supervisor_assignment(actor, assignment)


def _actor_matches_supervisor_assignment(actor, assignment) -> bool:
    """
    Supervisor assignments store domain profile IDs, not global user-role identity.
    Resolve the actor through the assignment domain before comparing.
    """
    if not actor.is_authenticated or not actor.is_supervisor:
        return False

    if assignment.assignment_type == "EMPLOYER":
        from edulink.apps.employers.queries import get_supervisor_id_for_user
        supervisor_id = get_supervisor_id_for_user(actor.id)
        return bool(supervisor_id and str(supervisor_id) == str(assignment.supervisor_id))

    if assignment.assignment_type == "INSTITUTION":
        from edulink.apps.institutions.queries import get_institution_staff_id_for_user
        staff_id = get_institution_staff_id_for_user(str(actor.id))
        return bool(staff_id and str(staff_id) == str(assignment.supervisor_id))

    return False


def can_view_supervisor_assignment(actor, assignment) -> bool:
    """
    Determine if actor can view a supervisor assignment details.
    Allowed: The assigned supervisor, scoped domain admins, system admins, or
    the student who owns the application.
    """
    # Supervisor can view their own assignment
    if _actor_matches_supervisor_assignment(actor, assignment):
        return True
    
    if actor.is_system_admin:
        return True

    if actor.is_employer_admin and assignment.assignment_type == "EMPLOYER":
        from edulink.apps.employers.queries import get_employer_for_user
        employer = get_employer_for_user(actor.id)
        return bool(
            employer
            and str(assignment.application.opportunity.employer_id) == str(employer.id)
        )

    if actor.is_institution_admin and assignment.assignment_type == "INSTITUTION":
        from edulink.apps.institutions.queries import get_institution_for_user
        institution = get_institution_for_user(str(actor.id))
        if not institution:
            return False
        snapshot_institution_id = assignment.application.application_snapshot.get("institution_id")
        return (
            str(assignment.application.opportunity.institution_id) == str(institution.id)
            or str(snapshot_institution_id) == str(institution.id)
        )
    
    # Student can view assignments for their own application
    if actor.is_student:
        from edulink.apps.students.queries import get_student_for_user
        student = get_student_for_user(str(actor.id))
        return bool(student and str(student.id) == str(assignment.application.student_id))
    
    return False


def can_declare_external_placement(actor, institution_id: UUID) -> bool:
    if not actor.is_student:
        return False

    student = get_student_for_user(str(actor.id))
    if not student:
        return False

    affiliation = get_student_approved_affiliation(student.id)
    return bool(affiliation and str(affiliation.institution_id) == str(institution_id))


def can_review_external_placement_declaration(actor, declaration: ExternalPlacementDeclaration) -> bool:
    if actor.is_system_admin:
        return True

    if not actor.is_institution_admin:
        return False

    return get_actor_institution_id(actor) == declaration.institution_id


def can_view_external_placement_declaration(actor, declaration: ExternalPlacementDeclaration) -> bool:
    if can_review_external_placement_declaration(actor, declaration):
        return True

    if not actor.is_student:
        return False

    student = get_student_for_user(str(actor.id))
    return bool(student and str(student.id) == str(declaration.student_id))


def can_transition_internship(actor, internship, target_state: str) -> bool:
    """Backward-compatible wrapper for older opportunity policy callers."""
    return can_transition_opportunity(actor, internship, target_state)
