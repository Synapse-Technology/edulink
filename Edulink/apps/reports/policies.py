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
        return (str(application.employer_supervisor_id) == str(actor.id) or 
                str(application.institution_supervisor_id) == str(actor.id))
                
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
        return (str(application.employer_supervisor_id) == str(actor.id) or 
                str(application.institution_supervisor_id) == str(actor.id))
                
    # Org Admins
    if actor.is_employer_admin:
        return str(application.opportunity.employer_id) == str(actor.employer_id) # Hypothetical employer_id on actor
        
    return False
