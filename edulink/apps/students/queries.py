from typing import Optional, List, Dict
from uuid import UUID

from .models import StudentInstitutionAffiliation, Student
from edulink.apps.institutions.queries import get_institution_for_user, get_departments_map_by_ids
from edulink.apps.accounts.queries import get_users_map_by_ids, get_user_by_id


from django.db.models import QuerySet

def get_institution_id_for_user(user) -> Optional[str]:
    """
    Get the institution ID that the user is associated with.
    For institution admins, this would be the institution they manage.
    """
    # If user is an institution admin, we need to find which institution they manage
    if hasattr(user, 'is_institution_admin') and user.is_institution_admin:
        # Check for InstitutionStaff record (Primary Method) via service layer
        institution = get_institution_for_user(str(user.id))
        
        if institution:
            return str(institution.id)

    return None


def get_student_for_user(user_id: str) -> Optional[Student]:
    """
    Get Student profile for a User ID.
    """
    try:
        # Normalize UUID
        if isinstance(user_id, str):
            user_id = UUID(user_id)
            
        return Student.objects.get(user_id=user_id)
    except (Student.DoesNotExist, ValueError):
        return None


def get_pending_affiliations_for_all_admin_institutions(user):
    """
    Get all pending affiliations for institutions that the user can admin.
    """
    if not hasattr(user, 'is_institution_admin') or not user.is_institution_admin:
        return StudentInstitutionAffiliation.objects.none()
    
    institution_id = get_institution_id_for_user(user)
    if not institution_id:
        return StudentInstitutionAffiliation.objects.none()
    
    return StudentInstitutionAffiliation.objects.filter(
        institution_id=institution_id,
        status=StudentInstitutionAffiliation.STATUS_PENDING
    )


def get_all_affiliations_for_institution(institution_id: str):
    """
    Get all affiliations (approved) for a specific institution.
    """
    return StudentInstitutionAffiliation.objects.filter(
        institution_id=institution_id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED
    )


def get_student_by_id(student_id: str) -> Optional[Student]:
    """
    Get Student profile by ID.
    """
    try:
        # Normalize UUID
        if isinstance(student_id, str):
            student_id = UUID(student_id)
            
        student = Student.objects.get(id=student_id)
        # Manually attach user via query layer
        student.user = get_user_by_id(str(student.user_id))
        return student
    except (Student.DoesNotExist, ValueError):
        return None


def get_students_by_ids(student_ids: List[str]) -> dict:
    """
    Returns a dict mapping student_id -> Student object for a list of IDs.
    """
    valid_ids = []
    for sid in student_ids:
        try:
            valid_ids.append(UUID(str(sid)))
        except (ValueError, TypeError):
            continue
            
    students = list(Student.objects.filter(id__in=valid_ids))
    
    # Fetch and attach users via query layer
    user_ids = [str(s.user_id) for s in students if s.user_id]
    users_map = get_users_map_by_ids(user_ids)
    
    result = {}
    for s in students:
        s.user = users_map.get(str(s.user_id))
        result[str(s.id)] = s
    return result


def get_student_details_for_trust(*, student_id: UUID) -> dict:
    """
    Get student details required for trust computation.
    Returns a dict to avoid exposing the model.
    """
    student = Student.objects.get(id=student_id)
    return {
        "id": student.id,
        "trust_level": student.trust_level,
        "trust_points": student.trust_points,
        "trust_label": student.get_trust_level_display(),
    }


def get_total_students_count(institution_id: str) -> int:
    """
    Returns the total number of verified students affiliated with an institution.
    """
    return Student.objects.filter(institution_id=institution_id, is_verified=True).count()


def get_student_department_map(institution_id: str) -> dict:
    """
    Returns a map of student_id -> {dept_id, dept_name} for approved affiliations.
    """
    affiliations = list(StudentInstitutionAffiliation.objects.filter(
        institution_id=institution_id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED
    ).values('student_id', 'department_id'))
    
    # Batch fetch department names
    dept_ids = list(set([str(aff['department_id']) for aff in affiliations if aff['department_id']]))
    dept_names_map = get_departments_map_by_ids(dept_ids)
    
    return {
        str(aff['student_id']): {
            "dept_id": str(aff['department_id']) if aff['department_id'] else None,
            "dept_name": dept_names_map.get(str(aff['department_id']), "Unassigned")
        }
        for aff in affiliations
    }


def get_affiliated_student_ids(institution_id: str) -> List[UUID]:
    """
    Returns a list of student IDs affiliated with an institution.
    """
    return list(StudentInstitutionAffiliation.objects.filter(
        institution_id=institution_id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED
    ).values_list('student_id', flat=True))


def get_student_ids_by_trust_level(trust_level: int) -> List[str]:
    """
    Returns a list of student IDs that match the given trust level.
    """
    return [
        str(sid)
        for sid in Student.objects.filter(trust_level=trust_level).values_list("id", flat=True)
    ]


def get_students_by_trust_level(*, level: int):
    """
    Get students filtered by their cached trust level.
    """
    return Student.objects.filter(trust_level=level)


def get_verified_student_ids_by_affiliation(
    *, 
    institution_id: UUID, 
    department_id: UUID, 
    cohort_id: UUID = None
) -> List[UUID]:
    """
    Returns a list of student IDs who are verified and affiliated with a specific
    institution, department, and optionally cohort.
    """
    filters = {
        "institution_id": institution_id,
        "department_id": department_id,
        "status": StudentInstitutionAffiliation.STATUS_APPROVED
    }
    if cohort_id:
        filters["cohort_id"] = cohort_id
        
    return list(StudentInstitutionAffiliation.objects.filter(**filters).values_list("student_id", flat=True))

def get_student_approved_affiliation(student_id: UUID) -> Optional[StudentInstitutionAffiliation]:
    """
    Get the current approved affiliation for a student.
    """
    return StudentInstitutionAffiliation.objects.filter(
        student_id=student_id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED
    ).first()


def get_student_institution_affiliation_by_id(affiliation_id: str) -> Optional[StudentInstitutionAffiliation]:
    """
    Get StudentInstitutionAffiliation by ID.
    """
    try:
        if isinstance(affiliation_id, str):
            affiliation_id = UUID(affiliation_id)
        return StudentInstitutionAffiliation.objects.get(id=affiliation_id)
    except (StudentInstitutionAffiliation.DoesNotExist, ValueError):
        return None


def calculate_profile_readiness(*, student_id: str) -> dict:
    """
    Calculate the profile readiness score (Trust Score) based on the blueprint.
    Returns score (0-100) and breakdown of criteria.
    """
    from edulink.apps.accounts.queries import get_user_by_id
    
    student = Student.objects.get(id=student_id)
    user = get_user_by_id(user_id=str(student.user_id))
    
    score = 0
    breakdown = {}
    
    # 1. Profile Complete (Basic Info): 20%
    # Checks: course_of_study, current_year, registration_number
    if student.course_of_study and student.current_year and student.registration_number:
        score += 20
        breakdown['profile_complete'] = True
    else:
        breakdown['profile_complete'] = False
        
    # 2. Email Verified: 20%
    if user.is_email_verified:
        score += 20
        breakdown['email_verified'] = True
    else:
        breakdown['email_verified'] = False
        
    # 3. Phone Verified: 10%
    if user.phone_number:
        score += 10
        breakdown['phone_verified'] = True
    else:
        breakdown['phone_verified'] = False
        
    # 4. Institution Verified: 30%
    if student.institution_id and student.is_verified:
        score += 30
        breakdown['institution_verified'] = True
    else:
        breakdown['institution_verified'] = False
        
    # 5. Skills Added: 10%
    if student.skills and len(student.skills) > 0:
        score += 10
        breakdown['skills_added'] = True
    else:
        breakdown['skills_added'] = False
        
    # 6. Documents Uploaded: 10%
    # At least one document
    if student.cv or student.admission_letter or student.id_document:
        score += 10
        breakdown['documents_uploaded'] = True
    else:
        breakdown['documents_uploaded'] = False
        
    return {
        "score": score,
        "breakdown": breakdown
    }


def get_student_dashboard_stats(*, student_id: str) -> dict:
    """
    Aggregate dashboard stats for a student from internships and profile readiness.
    """
    from edulink.apps.internships.queries import get_student_internship_dashboard_stats

    internship_stats = get_student_internship_dashboard_stats(student_id=student_id)
    readiness = calculate_profile_readiness(student_id=student_id)
    score = readiness.get("score", 0)

    profile_stats = {
        "score": score,
        "trend_value": 0,
        "trend_positive": True,
    }

    combined = dict(internship_stats)
    combined["profile"] = profile_stats
    return combined


def get_student_queryset(user) -> QuerySet:
    """
    Restrict access to student profiles based on user role.
    """
    if not user.is_authenticated:
        return Student.objects.none()
        
    # 1. System Admins see all
    if user.is_system_admin:
        return Student.objects.all()
        
    # 2. Students see only themselves
    if user.is_student:
        return Student.objects.filter(user_id=user.id)
        
    # 3. Institution Admins see students affiliated with their institution
    if user.is_institution_admin:
        institution_id = get_institution_id_for_user(user)
        if institution_id:
            student_ids = StudentInstitutionAffiliation.objects.filter(
                institution_id=institution_id,
                status=StudentInstitutionAffiliation.STATUS_APPROVED
            ).values_list('student_id', flat=True)
            
            return Student.objects.filter(id__in=student_ids)
            
    return Student.objects.none()


def get_student_affiliation_queryset(user) -> QuerySet:
    """
    Restrict access to student affiliations based on user role.
    """
    if not user.is_authenticated:
        return StudentInstitutionAffiliation.objects.none()
        
    if user.is_system_admin:
        return StudentInstitutionAffiliation.objects.all()
        
    if user.is_institution_admin:
        institution_id = get_institution_id_for_user(user)
        if institution_id:
            return StudentInstitutionAffiliation.objects.filter(institution_id=institution_id)
            
    if user.is_student:
        student = get_student_for_user(str(user.id))
        if student:
            return StudentInstitutionAffiliation.objects.filter(student_id=student.id)
        
    return StudentInstitutionAffiliation.objects.none()


def get_institution_students_queryset(
    *, institution_id: str, department_id: str = None, cohort_id: str = None
) -> QuerySet:
    """
    Get student affiliations for an institution with optional filtering.
    """
    affiliations = StudentInstitutionAffiliation.objects.filter(
        institution_id=institution_id
    )
    
    if department_id:
        affiliations = affiliations.filter(department_id=department_id)
    if cohort_id:
        affiliations = affiliations.filter(cohort_id=cohort_id)
        
    return affiliations
