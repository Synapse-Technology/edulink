from edulink.apps.institutions.queries import get_institution_staff_profile

def can_admin_manage_institution(*, actor) -> bool:
    return actor.is_system_admin

def can_representative_request_institution(*, actor) -> bool:
    if not actor:
        return True
    return not (actor.is_system_admin or actor.is_institution_admin)

def can_review_institution_requests(*, actor) -> bool:
    return actor.is_system_admin

def can_submit_institution_request(*, actor) -> bool:
    if not actor:
        return True
    return not actor.is_system_admin

def can_view_institution_request(*, actor, request_id: str) -> bool:
    if actor.is_system_admin:   
        return True
    # Representatives can view their own requests (logic to be implemented in service/query)
    return True

def is_institution_staff(actor) -> bool:
    if actor.is_institution_admin or actor.is_supervisor:
        return True
    
    # Check if user has an active InstitutionStaff record
    staff = get_institution_staff_profile(str(actor.id))
    return staff is not None
