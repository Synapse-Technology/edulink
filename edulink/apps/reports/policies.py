from uuid import UUID
from edulink.apps.internships.queries import get_application_by_id
from edulink.apps.students.queries import get_student_for_user

def can_generate_artifact(actor, application_id: UUID) -> bool:
    """
    Decide who can trigger artifact generation.
    - System Admin: Yes
    - Student: Only if it's their own application.
    - Supervisor: Only if they are assigned to the application.
    """
    if actor.is_system_admin:
        return True
        
    application = get_application_by_id(application_id)
    if not application:
        return False
        
    if actor.is_student:
        student = get_student_for_user(str(actor.id))
        return student and application.student_id == student.id
        
    if actor.is_supervisor:
        from edulink.apps.internships.roles import is_assigned_supervisor

        return is_assigned_supervisor(actor, application)

    if actor.is_institution_admin:
        from edulink.apps.institutions.queries import get_institution_for_user
        from edulink.apps.students.queries import get_student_approved_affiliation

        institution = get_institution_for_user(str(actor.id))
        if not institution:
            return False
        if str(application.opportunity.institution_id) == str(institution.id):
            return True
        affiliation = get_student_approved_affiliation(application.student_id)
        return bool(affiliation and str(affiliation.institution_id) == str(institution.id))
                
    return False

def can_view_artifact(actor, artifact) -> bool:
    """
    Decide who can view/download an artifact.
    """
    if actor.is_system_admin:
        return True
        
    if actor.is_student:
        student = get_student_for_user(str(actor.id))
        return student and artifact.student_id == student.id
        
    # Owners of the application (Supervisors/Admins) can also view
    application = get_application_by_id(artifact.application_id)
    if not application:
        return False
        
    if actor.is_supervisor:
        from edulink.apps.internships.roles import is_assigned_supervisor

        return is_assigned_supervisor(actor, application)
                
    # Org Admins
    if actor.is_employer_admin:
        from edulink.apps.employers.queries import get_employer_for_user

        employer = get_employer_for_user(actor.id)
        return bool(employer and str(application.opportunity.employer_id) == str(employer.id))

    if actor.is_institution_admin:
        from edulink.apps.institutions.queries import get_institution_for_user
        from edulink.apps.students.queries import get_student_approved_affiliation

        institution = get_institution_for_user(str(actor.id))
        if not institution:
            return False
        if str(application.opportunity.institution_id) == str(institution.id):
            return True
        affiliation = get_student_approved_affiliation(application.student_id)
        return bool(affiliation and str(affiliation.institution_id) == str(institution.id))
        
    return False
