from typing import Optional
from django.contrib.auth import get_user_model
from .models import Employer, Supervisor

User = get_user_model()

def get_employer_staff(user: User) -> Optional[Supervisor]:
    """
    Helper to get the active supervisor profile for a user.
    """
    # Assuming user has related_name='supervisor_profile' from the ForeignKey in Supervisor model.
    # Since it's a ForeignKey, it returns a Manager.
    return user.supervisor_profile.filter(is_active=True).first()

def can_manage_employer(actor: User, employer: Employer) -> bool:
    """
    Check if actor is an Admin for the given employer.
    """
    if actor.is_superuser: # System admins can manage anything? Maybe.
        return True
        
    staff = get_employer_staff(actor)
    if not staff:
        return False
        
    if staff.employer_id != employer.id:
        return False
        
    return staff.role == Supervisor.ROLE_ADMIN

def can_post_internship(actor: User, employer: Employer) -> bool:
    """
    Check if actor can post internships for the employer.
    Requires:
    1. Actor is Employer Admin.
    2. Employer Trust Level >= 0 (Unverified allowed for testing/onboarding).
    """
    if not can_manage_employer(actor, employer):
        return False
        
    # Relaxed for testing/development to allow new employers to post
    if employer.trust_level < Employer.TRUST_UNVERIFIED:
        return False
        
    return True

def can_supervise_internship(actor: User, employer: Employer) -> bool:
    """
    Check if actor can supervise internships.
    Requires:
    1. Actor is Supervisor or Admin for the employer.
    2. Employer Trust Level >= 2 (Active Host).
    """
    staff = get_employer_staff(actor)
    if not staff:
        return False
        
    if staff.employer_id != employer.id:
        return False
        
    # Both Admin and Supervisor roles can supervise?
    # Blueprint says "Employer Supervisor ... Review logbooks".
    # "Employer Admin ... Manage profile".
    # Usually Admins can also supervise, or they assign supervisors.
    # Let's assume any staff can supervise if the employer is trusted enough.
    
    if employer.trust_level < Employer.TRUST_ACTIVE_HOST:
        return False
        
    return True

def can_submit_employer_request(actor: Optional[User]) -> bool:
    """
    Anyone can submit an onboarding request (public).
    """
    return True

def can_review_employer_requests(actor: User) -> bool:
    """
    Only Platform Admins (System Admins) can review requests.
    """
    return actor.role == User.ROLE_SYSTEM_ADMIN # Assuming ROLE_SYSTEM_ADMIN exists on User

def can_submit_staff_profile_request(actor: User) -> bool:
    """
    Check if actor can submit a profile update request.
    Requires:
    1. Actor is an active staff member (Supervisor or Admin).
    """
    staff = get_employer_staff(actor)
    return staff is not None

def can_review_staff_profile_requests(actor: User, employer: Employer) -> bool:
    """
    Check if actor can review staff profile update requests.
    Requires:
    1. Actor is Employer Admin.
    """
    return can_manage_employer(actor, employer)

def is_employer_staff(actor: User) -> bool:
    """
    Check if the user is a valid employer staff member.
    """
    return get_employer_staff(actor) is not None
