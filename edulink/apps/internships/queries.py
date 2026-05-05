from typing import Optional, List, Dict, Iterable
from uuid import UUID
from datetime import timedelta
from django.utils import timezone
from django.db.models import QuerySet, Q, Count
from django.conf import settings
from edulink.apps.institutions.queries import get_institution_for_user, get_institution_staff_id_for_user
from edulink.apps.employers.queries import get_employer_for_user, get_supervisor_id_for_user
from edulink.apps.students.queries import get_student_for_user, get_total_students_count
from .models import (
    InternshipOpportunity,
    InternshipApplication,
    OpportunityStatus,
    ApplicationStatus,
    InternshipEvidence,
    SuccessStory,
    Incident,
    ExternalPlacementDeclaration,
)


def check_supervisor_assigned_to_application(supervisor_id: str, application_id: str) -> bool:
    """
    Checks if a supervisor is assigned to a specific application.
    Used for object-level permission checks.
    
    Returns True if supervisor is either institution or employer supervisor for the application.
    """
    try:
        supervisor_ids = {str(supervisor_id)}

        from edulink.apps.employers.queries import get_supervisor_id_for_user
        employer_supervisor_id = get_supervisor_id_for_user(supervisor_id)
        if employer_supervisor_id:
            supervisor_ids.add(str(employer_supervisor_id))

        from edulink.apps.institutions.queries import get_institution_supervisor_by_id
        institution_supervisor = get_institution_supervisor_by_id(supervisor_id=supervisor_id)
        if institution_supervisor:
            supervisor_ids.add(str(institution_supervisor.id))

        return InternshipApplication.objects.filter(
            id=application_id,
        ).filter(
            Q(employer_supervisor_id__in=supervisor_ids) |
            Q(institution_supervisor_id__in=supervisor_ids)
        ).exists()
    except:
        return False


def get_opportunities_for_user(user) -> QuerySet[InternshipOpportunity]:
    """
    Returns opportunities visible to the user.
    - Public (OPEN) opportunities are visible to everyone.
    - Owners (Employer/Institution Admins) see their own opportunities regardless of status.
    - Students see only OPEN opportunities.
    """
    queryset = InternshipOpportunity.objects.all().order_by('-created_at')

    # Base filter: Publicly open opportunities
    visibility_filter = Q(status=OpportunityStatus.OPEN)

    if not user.is_authenticated:
        return queryset.filter(visibility_filter)

    if user.is_system_admin:
        return queryset

    # Identify user's organization affiliations
    user_id = user.id if isinstance(user.id, UUID) else UUID(str(user.id))
    
    # Institution Admin Visibility
    if user.is_institution_admin:
        inst = get_institution_for_user(str(user_id))
        if inst:
            visibility_filter |= Q(institution_id=inst.id)

    # Employer Admin Visibility
    if user.is_employer_admin:
        employer = get_employer_for_user(user_id)
        if employer:
            visibility_filter |= Q(employer_id=employer.id)
    
    # Student Visibility (Only OPEN opportunities with valid deadlines, or no deadline)
    if user.is_student:
        from django.utils import timezone
        now = timezone.now()
        return queryset.filter(
            status=OpportunityStatus.OPEN
        ).filter(
            Q(application_deadline__isnull=True) |  # No deadline set
            Q(application_deadline__gt=now)  # Deadline is in the future
        )

    # Supervisors Visibility
    if user.is_supervisor:
        employer = get_employer_for_user(user_id)
        if employer:
             visibility_filter |= Q(employer_id=employer.id)
             
        from edulink.apps.institutions.queries import get_institution_staff_profile
        staff = get_institution_staff_profile(str(user_id))
        if staff:
             visibility_filter |= Q(institution_id=staff.institution_id)

    return queryset.filter(visibility_filter).distinct()

def get_applications_for_user(user) -> QuerySet[InternshipApplication]:
    """
    Returns applications visible to the user.
    """
    # Stable ordering is required for pagination consistency across pages.
    queryset = InternshipApplication.objects.select_related('opportunity').order_by('-created_at', '-id')
    
    if not user.is_authenticated:
        return InternshipApplication.objects.none()

    if user.is_system_admin:
        return queryset

    elif user.is_student:
        student = get_student_for_user(str(user.id))
        if student:
            return queryset.filter(student_id=student.id)
        return InternshipApplication.objects.none()

    elif user.is_institution_admin:
        inst = get_institution_for_user(str(user.id))
        if inst:
            # Application workflow ownership is scoped to the posting organization.
            # Institution monitoring/reporting for affiliated students lives in
            # dedicated institution queries, not the application management feed.
            return queryset.filter(
                opportunity__institution_id=inst.id
            ).exclude(
                opportunity__origin=InternshipOpportunity.ORIGIN_EXTERNAL_STUDENT_DECLARED
            )
        return InternshipApplication.objects.none()

    elif user.is_employer_admin:
        employer = get_employer_for_user(user.id)
        if employer:
            return queryset.filter(opportunity__employer_id=employer.id)
        return InternshipApplication.objects.none()

    elif user.is_supervisor:
        # Get profile IDs for this user using query helpers (no cross-app model imports)
        e_supervisor_id = get_supervisor_id_for_user(user.id)
        i_supervisor_id = get_institution_staff_id_for_user(str(user.id))
        
        filters = Q()
        if e_supervisor_id:
            filters |= Q(employer_supervisor_id=e_supervisor_id)
        if i_supervisor_id:
            filters |= Q(institution_supervisor_id=i_supervisor_id)
        user_id = user.id if isinstance(user.id, UUID) else UUID(str(user.id))
        filters |= Q(employer_supervisor_id=user_id) | Q(institution_supervisor_id=user_id)
            
        if not e_supervisor_id and not i_supervisor_id:
            # Fallback for robustness: check if user ID was used as profile ID
            filters = Q(employer_supervisor_id=user_id) | Q(institution_supervisor_id=user_id)
            
        return queryset.filter(filters)

    return InternshipApplication.objects.none()

def get_opportunity_by_id(opportunity_id: UUID) -> Optional[InternshipOpportunity]:
    try:
        return InternshipOpportunity.objects.get(id=opportunity_id)
    except InternshipOpportunity.DoesNotExist:
        return None

def get_application_by_id(application_id: UUID) -> Optional[InternshipApplication]:
    try:
        return InternshipApplication.objects.get(id=application_id)
    except InternshipApplication.DoesNotExist:
        return None

def get_evidence_for_application(application_id: UUID) -> QuerySet[InternshipEvidence]:
    return InternshipEvidence.objects.filter(application_id=application_id)

def get_incidents_for_application(application_id: UUID) -> QuerySet[Incident]:
    return Incident.objects.filter(application_id=application_id)

def get_pending_evidence_for_user(user) -> QuerySet[InternshipEvidence]:
    """
    Returns evidence that needs review from this user (Supervisor or Admin).
    An item is pending if the user is responsible for reviewing it and has not yet set a review status.
    """
    if not user.is_authenticated:
        return InternshipEvidence.objects.none()
        
    if user.is_system_admin:
        return InternshipEvidence.objects.filter(
            application__status=ApplicationStatus.ACTIVE,
            status=InternshipEvidence.STATUS_SUBMITTED,
        ).select_related('application', 'application__opportunity')

    if user.is_institution_admin:
        from edulink.apps.institutions.queries import get_institution_for_user
        inst = get_institution_for_user(str(user.id))
        if inst:
            from edulink.apps.students.queries import get_affiliated_student_ids
            affiliated_student_ids = get_affiliated_student_ids(str(inst.id))
            return InternshipEvidence.objects.filter(
                Q(application__opportunity__institution_id=inst.id) |
                Q(application__student_id__in=affiliated_student_ids),
                application__status=ApplicationStatus.ACTIVE,
                institution_review_status__isnull=True
            ).select_related('application', 'application__opportunity').distinct()

    if user.is_employer_admin:
        from edulink.apps.employers.queries import get_employer_for_user
        employer = get_employer_for_user(user.id)
        if employer:
            return InternshipEvidence.objects.filter(
                application__opportunity__employer_id=employer.id,
                application__status=ApplicationStatus.ACTIVE,
                employer_review_status__isnull=True
            ).select_related('application', 'application__opportunity').distinct()

    if user.is_supervisor:
        from edulink.apps.employers.queries import get_supervisor_id_for_user
        from edulink.apps.institutions.queries import get_institution_staff_id_for_user
        
        employer_supervisor_id = get_supervisor_id_for_user(user.id)
        institution_supervisor_id = get_institution_staff_id_for_user(str(user.id))
        
        filters = Q()
        if employer_supervisor_id:
            filters |= Q(
                application__employer_supervisor_id=employer_supervisor_id,
                application__status=ApplicationStatus.ACTIVE,
                employer_review_status__isnull=True,
            )
        if institution_supervisor_id:
            filters |= Q(
                application__institution_supervisor_id=institution_supervisor_id,
                application__status=ApplicationStatus.ACTIVE,
                institution_review_status__isnull=True,
            )
            
        if not employer_supervisor_id and not institution_supervisor_id:
            user_id = user.id if isinstance(user.id, UUID) else UUID(str(user.id))
            filters = (
                Q(
                    application__employer_supervisor_id=user_id,
                    application__status=ApplicationStatus.ACTIVE,
                    employer_review_status__isnull=True,
                ) |
                Q(
                    application__institution_supervisor_id=user_id,
                    application__status=ApplicationStatus.ACTIVE,
                    institution_review_status__isnull=True,
                )
            )
        
        return InternshipEvidence.objects.filter(filters).select_related('application', 'application__opportunity')
    
    return InternshipEvidence.objects.none()

def get_incidents_for_supervisor(user) -> QuerySet[Incident]:
    """
    Returns incidents for applications assigned to the supervisor.
    """
    if not user.is_authenticated or not user.is_supervisor:
        return Incident.objects.none()
        
    from edulink.apps.employers.queries import get_supervisor_id_for_user
    from edulink.apps.institutions.queries import get_institution_staff_id_for_user
    
    employer_supervisor_id = get_supervisor_id_for_user(user.id)
    institution_supervisor_id = get_institution_staff_id_for_user(str(user.id))
    
    filters = Q()
    if employer_supervisor_id:
        filters |= Q(application__employer_supervisor_id=employer_supervisor_id)
    if institution_supervisor_id:
        filters |= Q(application__institution_supervisor_id=institution_supervisor_id)
        
    if not employer_supervisor_id and not institution_supervisor_id:
        user_id = user.id if isinstance(user.id, UUID) else UUID(str(user.id))
        filters = Q(application__employer_supervisor_id=user_id) | Q(application__institution_supervisor_id=user_id)
        
    return Incident.objects.filter(filters).select_related('application', 'application__opportunity')

def get_incidents_for_student(user) -> QuerySet[Incident]:
    """
    Returns incidents reported by the student.
    """
    if not user.is_authenticated or not user.is_student:
        return Incident.objects.none()
        
    return Incident.objects.filter(reported_by=user.id).select_related('application', 'application__opportunity')


def check_institution_has_internships(institution_id: UUID) -> bool:
    """
    Check if an institution has any internships (used for trust computation).
    """
    return InternshipOpportunity.objects.filter(institution_id=institution_id).exists()

def get_unique_employer_count_for_institution(institution_id: str) -> int:
    """
    Returns the number of unique employers that have engagements with an institution's students.
    """
    from edulink.apps.students.queries import get_affiliated_student_ids
    affiliated_student_ids = get_affiliated_student_ids(institution_id)
    
    return InternshipApplication.objects.filter(
        Q(opportunity__institution_id=institution_id) |
        Q(student_id__in=affiliated_student_ids)
    ).exclude(opportunity__employer_id__isnull=True).values('opportunity__employer_id').distinct().count()

def get_internship_count_for_institution(institution_id: str) -> int:
    """
    Returns total internships (opportunities) associated with an institution.
    """
    return InternshipOpportunity.objects.filter(institution_id=institution_id).count()

def count_active_internships_for_employer(employer_id: UUID) -> int:
    """
    Count active internships for an employer.
    """
    return InternshipApplication.objects.filter(
        opportunity__employer_id=employer_id, 
        status=ApplicationStatus.ACTIVE
    ).count()

def count_completed_internships_for_employer(employer_id: UUID) -> int:
    """
    Count completed internships for an employer.
    """
    return InternshipApplication.objects.filter(
        opportunity__employer_id=employer_id, 
        status=ApplicationStatus.COMPLETED
    ).count()

PLACEMENT_STATUSES = [
    ApplicationStatus.ACTIVE,
    ApplicationStatus.COMPLETED,
    ApplicationStatus.CERTIFIED,
]


def get_audit_readiness_score(
    institution_id: str,
    department_id: str = None,
    cohort_id: str = None,
) -> int:
    """
    Calculate institution's audit readiness score (0-100).
    
    Measures compliance across four dimensions:
    1. Student Verification (40% weight): % of students verified before placement
    2. Evidence Quality (30% weight): % of placements with submitted evidence
    3. Incident Resolution (20% weight): % of incidents resolved/closed
    4. Supervisor Assignment (10% weight): % of placements with both supervisors assigned
    
    Args:
        institution_id: The institution UUID
        department_id: Optional department filter
        cohort_id: Optional cohort filter
    
    Returns:
        Score from 0-100 (integer)
    """
    from edulink.apps.students.queries import get_affiliated_student_ids
    
    # Get affiliated students
    affiliated_student_ids = list(get_affiliated_student_ids(
        institution_id,
        department_id=department_id,
        cohort_id=cohort_id,
    ))
    
    if not affiliated_student_ids:
        return 100  # Default to 100 if no students
    
    # 1. Student Verification Score (40% weight)
    # Percentage of students with verified status
    from edulink.apps.students.models import Student
    total_students = len(affiliated_student_ids)
    verified_students = Student.objects.filter(
        id__in=affiliated_student_ids,
        is_verified=True
    ).count()
    verification_score = (verified_students / total_students * 100) if total_students > 0 else 0
    
    # 2. Evidence Quality Score (30% weight)
    # Percentage of active placements with submitted evidence
    placements = InternshipApplication.objects.filter(
        student_id__in=affiliated_student_ids,
        status__in=PLACEMENT_STATUSES,
    )
    total_placements = placements.count()
    
    if total_placements > 0:
        placements_with_evidence = placements.filter(evidence__isnull=False).distinct().count()
        evidence_score = (placements_with_evidence / total_placements * 100)
    else:
        evidence_score = 100  # Default to 100 if no placements
    
    # 3. Incident Resolution Score (20% weight)
    # Percentage of incidents that are resolved/closed
    incidents = Incident.objects.filter(
        application__student_id__in=affiliated_student_ids,
    )
    total_incidents = incidents.count()
    
    if total_incidents > 0:
        # Assume incidents with 'resolved' or 'closed' status are resolved
        resolved_incidents = incidents.filter(
            status__in=['RESOLVED', 'CLOSED']
        ).count()
        incident_score = (resolved_incidents / total_incidents * 100)
    else:
        incident_score = 100  # Default to 100 if no incidents
    
    # 4. Supervisor Assignment Score (10% weight)
    # Percentage of placements with both supervisors assigned
    placements_with_both_supervisors = placements.filter(
        institution_supervisor_id__isnull=False,
        employer_supervisor_id__isnull=False,
    ).count()
    
    if total_placements > 0:
        supervisor_score = (placements_with_both_supervisors / total_placements * 100)
    else:
        supervisor_score = 100  # Default to 100 if no placements
    
    # Calculate weighted score
    weighted_score = (
        (verification_score * 0.40) +
        (evidence_score * 0.30) +
        (incident_score * 0.20) +
        (supervisor_score * 0.10)
    )
    
    return round(weighted_score)


def get_active_placements_for_institution(
    institution_id: str,
    department_id: str = None,
    cohort_id: str = None,
) -> QuerySet[InternshipApplication]:
    """
    Returns current/history placement records for students affiliated with an institution.
    Application pipeline states are intentionally excluded from placement oversight.
    """
    from edulink.apps.students.queries import get_affiliated_student_ids

    affiliated_student_ids = get_affiliated_student_ids(
        institution_id,
        department_id=department_id,
        cohort_id=cohort_id,
    )
    if not affiliated_student_ids:
        return InternshipApplication.objects.none()

    return InternshipApplication.objects.filter(
        student_id__in=affiliated_student_ids,
        status__in=PLACEMENT_STATUSES,
    ).select_related("opportunity")


def get_active_placements_for_monitoring(
    institution_id: str,
    department_id: str = None,
    cohort_id: str = None,
) -> List[dict]:
    """
    Returns enriched placement data for monitoring dashboard.
    """
    from edulink.apps.students.queries import get_students_by_ids
    from edulink.apps.employers.queries import get_employers_by_ids

    placements = get_active_placements_for_institution(
        institution_id=institution_id,
        department_id=department_id,
        cohort_id=cohort_id,
    )
    
    # Collect IDs for batch fetching
    student_ids = [str(p.student_id) for p in placements if p.student_id]
    employer_ids = [str(p.opportunity.employer_id) for p in placements if p.opportunity and p.opportunity.employer_id]
    
    students_map = get_students_by_ids(student_ids)
    employers_map = get_employers_by_ids(employer_ids)
    
    data = []
    for p in placements:
        student = students_map.get(str(p.student_id))
        employer = employers_map.get(str(p.opportunity.employer_id) if p.opportunity else None)
        
        data.append({
            "id": p.id,
            "title": p.opportunity.title if p.opportunity else "N/A",
            "department": p.opportunity.department if p.opportunity else "N/A",
            "status": p.status,
            "start_date": p.opportunity.start_date if p.opportunity else None,
            "end_date": p.opportunity.end_date if p.opportunity else None,
            "employer_id": p.opportunity.employer_id if p.opportunity else None,
            "employer_name": employer.name if employer else "Unknown Employer",
            "student_info": {
                "id": str(student.id),
                "name": student.user.get_full_name() if student.user else "Unknown Student",
                "email": student.user.email if student.user else "N/A",
                "trust_level": student.trust_level,
            } if student else None
        })
    return data

def calculate_trend(current_count: int, previous_count: int) -> float:
    """
    Calculates the percentage change between two counts.
    """
    if previous_count == 0:
        return 100.0 if current_count > 0 else 0.0
    return round(((current_count - previous_count) / previous_count) * 100, 1)

def get_supervisor_for_student(student_id: UUID) -> Optional[dict]:
    """
    Returns the assigned institution supervisor for a student's active or recent internship.
    """
    app = InternshipApplication.objects.filter(
        student_id=student_id,
        status__in=[ApplicationStatus.ACTIVE, ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED]
    ).order_by('-updated_at').first()
    
    if app and app.institution_supervisor_id:
        from edulink.apps.institutions.queries import get_institution_supervisor_by_id
        staff = get_institution_supervisor_by_id(supervisor_id=app.institution_supervisor_id)
        if staff:
            return {
                "name": f"{staff.user.first_name} {staff.user.last_name}",
                "email": staff.user.email
            }
    return None

def get_institution_placement_stats(
    institution_id: str,
    department_id: str = None,
    cohort_id: str = None,
    date_from: str = None,
    date_to: str = None,
) -> dict:
    """
    Returns rich, insightful placement analytics for institutional admins.
    Includes conversion funnels, department performance, and audit metrics.
    
    Args:
        institution_id: The institution UUID
        department_id: Optional department filter
        cohort_id: Optional cohort filter
        date_from: Optional start date (YYYY-MM-DD format)
        date_to: Optional end date (YYYY-MM-DD format)
    """
    from edulink.apps.students.queries import get_affiliated_student_ids, get_student_department_map
    from datetime import date as dateclass
    
    now = timezone.now()
    
    # Parse date range if provided
    if date_from:
        try:
            date_from_obj = timezone.make_aware(timezone.datetime.strptime(date_from, '%Y-%m-%d'))
        except:
            date_from_obj = None
    else:
        date_from_obj = now - timedelta(days=30)
    
    if date_to:
        try:
            # Set to end of day
            date_to_obj = timezone.make_aware(timezone.datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59))
        except:
            date_to_obj = now
    else:
        date_to_obj = now
    
    # Calculate trend period (compare with the same duration before date_from)
    date_range_days = (date_to_obj - date_from_obj).days
    prev_from = date_from_obj - timedelta(days=date_range_days + 1)
    prev_to = date_from_obj

    # 1. Base query for all applications related to this institution
    # (Students affiliated with this institution)
    affiliated_student_ids = get_affiliated_student_ids(
        institution_id,
        department_id=department_id,
        cohort_id=cohort_id,
    )
    all_placements = InternshipApplication.objects.filter(
        student_id__in=affiliated_student_ids,
        status__in=PLACEMENT_STATUSES,
    )
    
    # Management-specific apps (only those hosted by the institution)
    # This is what the admin actually manages in the "Applications" page
    institutional_apps = InternshipApplication.objects.filter(opportunity__institution_id=institution_id)
    
    total_placements_count = all_placements.count()
    total_students = (
        len(affiliated_student_ids)
        if department_id or cohort_id
        else get_total_students_count(institution_id)
    )
    
    # 2. Conversion Funnel
    funnel = {
        # "applied" here should represent applications pending review by the institution
        "applied": institutional_apps.filter(status=ApplicationStatus.APPLIED).count(),
        "shortlisted": institutional_apps.filter(status=ApplicationStatus.SHORTLISTED).count(),
        "accepted": institutional_apps.filter(status=ApplicationStatus.ACCEPTED).count(),
        "active": all_placements.filter(status=ApplicationStatus.ACTIVE).count(),
        "completed": all_placements.filter(status__in=[ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED]).count(),
        "certified": all_placements.filter(status=ApplicationStatus.CERTIFIED).count(),
    }
    
    # Conversion Rate: Students with at least one ACTIVE or COMPLETED placement / Total Students
    placed_student_ids = all_placements.values_list('student_id', flat=True).distinct().count()
    
    placement_rate = round((placed_student_ids / total_students) * 100, 1) if total_students else 0

    # 3. Department Performance
    # Get department mapping via student queries
    student_dept_map = get_student_department_map(institution_id)
    if department_id or cohort_id:
        allowed_student_ids = {str(student_id) for student_id in affiliated_student_ids}
        student_dept_map = {
            student_id: info
            for student_id, info in student_dept_map.items()
            if student_id in allowed_student_ids
        }
    
    dept_map = {}
    for student_id, info in student_dept_map.items():
        dept_id = info["dept_id"] or "Unassigned"
        dept_name = info["dept_name"]
        
        if dept_id not in dept_map:
            dept_map[dept_id] = {"name": dept_name, "student_ids": [], "placements": 0, "certified": 0}
        dept_map[dept_id]["student_ids"].append(UUID(student_id))

    for dept_id, data in dept_map.items():
        dept_apps = all_placements.filter(student_id__in=data["student_ids"])
        data["placements"] = dept_apps.count()
        data["certified"] = dept_apps.filter(status=ApplicationStatus.CERTIFIED).count()
        data["total_students"] = len(data["student_ids"])
        data["placement_rate"] = round((data["placements"] / data["total_students"]) * 100, 1) if data["total_students"] else 0
        # Remove student_ids before returning
        del data["student_ids"]

    # 3b. Cohort Performance
    # Build cohort map from affiliations
    from edulink.apps.students.models import StudentInstitutionAffiliation
    from edulink.apps.institutions.models import Cohort
    
    affiliations = StudentInstitutionAffiliation.objects.filter(
        institution_id=institution_id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED
    ).values('student_id', 'cohort_id')
    
    if department_id or cohort_id:
        affiliations = affiliations.filter(student_id__in=affiliated_student_ids)
    
    # Get cohort names
    cohort_ids = list(set([aff['cohort_id'] for aff in affiliations if aff['cohort_id']]))
    cohort_names_map = {str(c.id): c.name for c in Cohort.objects.filter(id__in=cohort_ids)}
    
    cohort_map = {}
    for aff in affiliations:
        cohort_id = aff['cohort_id'] or "Unassigned"
        cohort_id_str = str(cohort_id) if cohort_id != "Unassigned" else "Unassigned"
        cohort_name = cohort_names_map.get(cohort_id_str, "Unassigned") if cohort_id_str != "Unassigned" else "Unassigned"
        
        if cohort_id_str not in cohort_map:
            cohort_map[cohort_id_str] = {"name": cohort_name, "student_ids": [], "placements": 0, "certified": 0}
        cohort_map[cohort_id_str]["student_ids"].append(aff['student_id'])
    
    for cohort_id_str, data in cohort_map.items():
        cohort_apps = all_placements.filter(student_id__in=data["student_ids"])
        data["placements"] = cohort_apps.count()
        data["certified"] = cohort_apps.filter(status=ApplicationStatus.CERTIFIED).count()
        data["total_students"] = len(data["student_ids"])
        data["placement_rate"] = round((data["placements"] / data["total_students"]) * 100, 1) if data["total_students"] else 0
        # Calculate avg time to placement for this cohort
        cohort_placements = cohort_apps.select_related('opportunity')
        if cohort_placements.exists():
            cohort_times = []
            for app in cohort_placements:
                if app.opportunity and app.opportunity.start_date:
                    days = (app.opportunity.start_date - app.created_at.date()).days
                    if days >= 0:
                        cohort_times.append(days)
            data["avg_time_to_placement"] = round(sum(cohort_times) / len(cohort_times)) if cohort_times else 0
        else:
            data["avg_time_to_placement"] = 0
        # Remove student_ids before returning
        del data["student_ids"]

    # 4. Audit & Quality Control Metrics
    # Logbook submission frequency
    total_active_completed = all_placements
    total_evidence = InternshipEvidence.objects.filter(application__in=total_active_completed).count()
    evidence_per_placement = round(total_evidence / total_active_completed.count(), 1) if total_active_completed.count() else 0
    
    # Incidents
    total_incidents = Incident.objects.filter(application__in=all_placements).count()
    unresolved_incidents = Incident.objects.filter(application__in=all_placements, status=Incident.STATUS_OPEN).count()

    # 5. Trends
    total_current = all_placements.filter(created_at__gte=date_from_obj, created_at__lte=date_to_obj).count()
    total_previous = all_placements.filter(created_at__gte=prev_from, created_at__lt=prev_to).count()
    total_trend = calculate_trend(total_current, total_previous)

    # Calculate real audit readiness score
    audit_score = get_audit_readiness_score(
        institution_id,
        department_id=department_id,
        cohort_id=cohort_id,
    )

    return {
        "summary": {
            "total_students": total_students,
            "total_placements": placed_student_ids,
            "placement_rate": placement_rate,
            "total_applications": institutional_apps.count(),
            "total_placements_count": total_placements_count,
            "total_trend": total_trend,
        },
        "funnel": funnel,
        "departments": list(dept_map.values()),
        "cohorts": list(cohort_map.values()),
        "quality_control": {
            "evidence_count": total_evidence,
            "avg_evidence_per_placement": evidence_per_placement,
            "total_incidents": total_incidents,
            "unresolved_incidents": unresolved_incidents,
            "audit_readiness_score": audit_score,
        }
    }

def get_export_data(
    institution_id: str,
    department_id: str = None,
    cohort_id: str = None,
) -> QuerySet[InternshipApplication]:
    """
    Returns full data for export.
    """
    return get_active_placements_for_institution(
        institution_id,
        department_id=department_id,
        cohort_id=cohort_id,
    ).select_related('opportunity')

def get_time_to_placement_stats(
    institution_id: str,
    department_id: str = None,
    cohort_id: str = None,
) -> dict:
    """
    Calculate real time-to-placement metrics for an institution.
    
    Measures the number of days from when a student applied (application created_at)
    to when the internship actually started (opportunity.start_date).
    
    Only includes applications that have reached a placement state (ACTIVE, COMPLETED, CERTIFIED).
    
    Args:
        institution_id: The institution UUID
        department_id: Optional department filter
        cohort_id: Optional cohort filter
    
    Returns:
        Dict with 'average_days' and 'median_days' (integers)
    """
    from edulink.apps.students.queries import get_affiliated_student_ids
    from django.db.models import F, ExpressionWrapper, fields, FloatField
    from statistics import median, mean
    from decimal import Decimal
    
    # Get all students affiliated with this institution
    affiliated_student_ids = get_affiliated_student_ids(
        institution_id,
        department_id=department_id,
        cohort_id=cohort_id,
    )
    
    # Get applications that have reached placement status
    # and have both created_at and opportunity.start_date
    placements = InternshipApplication.objects.filter(
        student_id__in=affiliated_student_ids,
        status__in=PLACEMENT_STATUSES,
        opportunity__start_date__isnull=False,  # Only include if start_date is set
    ).select_related('opportunity')
    
    if not placements.exists():
        # Return defaults if no placements yet
        return {
            "average_days": 0,
            "median_days": 0,
            "sample_size": 0,
        }
    
    # Calculate days for each placement
    days_list = []
    for application in placements:
        if application.opportunity.start_date:
            # Calculate days from application creation to internship start
            application_date = application.created_at.date()
            start_date = application.opportunity.start_date
            days = (start_date - application_date).days
            # Only include if positive (shouldn't happen, but defensive)
            if days >= 0:
                days_list.append(days)
    
    if not days_list:
        return {
            "average_days": 0,
            "median_days": 0,
            "sample_size": 0,
        }
    
    # Calculate average and median
    average_days = round(mean(days_list))
    median_days = median(days_list)
    
    return {
        "average_days": average_days,
        "median_days": median_days,
        "sample_size": len(days_list),
    }

def get_published_success_stories() -> QuerySet[SuccessStory]:
    """
    Returns all published success stories.
    """
    return SuccessStory.objects.filter(is_published=True).order_by('-created_at')

def has_student_applied(opportunity_id: UUID, student_id: UUID) -> bool:
    """
    Checks if a student has applied for an opportunity.
    """
    return InternshipApplication.objects.filter(opportunity_id=opportunity_id, student_id=student_id).exists()

def get_success_story_for_application(application_id: UUID) -> Optional[SuccessStory]:
    """
    Get success story for an application.
    """
    try:
        return SuccessStory.objects.get(application_id=application_id)
    except SuccessStory.DoesNotExist:
        return None

def get_application_logbook_count(application_id: UUID) -> int:
    """
    Returns the count of logbook entries for an application.
    """
    return InternshipEvidence.objects.filter(application_id=application_id, evidence_type='LOGBOOK').count()

def get_student_internship_dashboard_stats(student_id: str) -> Dict[str, dict]:
    """
    Returns internship-related dashboard stats for a given student.
    Optimized with select_related to prevent N+1 queries.
    """
    from django.utils import timezone
    from datetime import timedelta

    now = timezone.now()
    last_month = now - timedelta(days=30)
    last_week = now - timedelta(days=7)
    prev_30 = last_month - timedelta(days=30)
    prev_week = last_week - timedelta(days=7)

    # Optimize: prefetch related opportunity data to avoid N+1 queries
    # Note: institution_id and employer_id are UUID fields, not ForeignKeys, so no select_related needed
    app_qs = InternshipApplication.objects.filter(student_id=student_id).select_related(
        'opportunity'
    )

    active_apps_count = app_qs.filter(
        status__in=[
            ApplicationStatus.APPLIED,
            ApplicationStatus.SHORTLISTED,
        ],
    ).count()

    apps_last_30 = app_qs.filter(
        created_at__gte=last_month,
        status__in=[
            ApplicationStatus.APPLIED,
            ApplicationStatus.SHORTLISTED,
            ApplicationStatus.ACCEPTED,
            ApplicationStatus.REJECTED,
        ],
    ).count()

    apps_prev_30 = app_qs.filter(
        created_at__gte=prev_30,
        created_at__lt=last_month,
        status__in=[
            ApplicationStatus.APPLIED,
            ApplicationStatus.SHORTLISTED,
            ApplicationStatus.ACCEPTED,
            ApplicationStatus.REJECTED,
        ],
    ).count()

    app_trend_val = calculate_trend(apps_last_30, apps_prev_30)

    active_internship = app_qs.filter(
        status=ApplicationStatus.ACTIVE,
    ).first()

    active_int_progress = 0
    # active_internship doesn't have start_date directly, it's on opportunity. 
    # Or maybe we should rely on 'started_at' which we might need to add to Application if they start at different times.
    # For now, use opportunity's start date or mock.
    if active_internship and active_internship.opportunity.start_date and active_internship.opportunity.end_date:
        start_date = active_internship.opportunity.start_date
        end_date = active_internship.opportunity.end_date
        total_days = (end_date - start_date).days
        if total_days > 0:
            elapsed = (now.date() - start_date).days
            active_int_progress = int((elapsed / total_days) * 100)
            if active_int_progress < 0:
                active_int_progress = 0
            if active_int_progress > 100:
                active_int_progress = 100

    opp_qs = InternshipOpportunity.objects.filter(status=OpportunityStatus.OPEN)
    
    open_opps = opp_qs.count()

    new_opps_week = opp_qs.filter(
        created_at__gte=last_week,
    ).count()

    new_opps_prev_week = opp_qs.filter(
        created_at__gte=prev_week,
        created_at__lt=last_week,
    ).count()

    opp_trend_val = calculate_trend(new_opps_week, new_opps_prev_week)

    return {
        "applications": {
            "count": active_apps_count,
            "trend_value": app_trend_val,
            "trend_positive": app_trend_val >= 0,
        },
        "active_internship": {
            "is_active": bool(active_internship),
            "progress": active_int_progress,
            "trend_value": active_int_progress,
            "trend_positive": True,
        },
        "opportunities": {
            "count": open_opps,
            "trend_value": opp_trend_val,
            "trend_positive": opp_trend_val >= 0,
        },
    }

def check_supervisor_assigned_to_student(*, supervisor_id: str, student_id: str) -> bool:
    """
    Checks if a supervisor is assigned to a student via an active internship.
    Used for authority checks in policies.
    """
    return InternshipApplication.objects.filter(
        student_id=student_id,
        status=ApplicationStatus.ACTIVE
    ).filter(
        Q(employer_supervisor_id=supervisor_id) | 
        Q(institution_supervisor_id=supervisor_id)
    ).exists()


def get_internship_growth_stats(days: int = 30) -> dict:
    """
    Get internship growth statistics for trend calculation.
    """
    from django.utils import timezone
    from datetime import timedelta
    
    now = timezone.now()
    cutoff = now - timedelta(days=days)
    
    current_opps = InternshipOpportunity.objects.count()
    prev_opps = InternshipOpportunity.objects.filter(created_at__lt=cutoff).count()
    
    current_apps = InternshipApplication.objects.count()
    prev_apps = InternshipApplication.objects.filter(created_at__lt=cutoff).count()
    
    return {
        "current_opportunities": current_opps,
        "previous_opportunities": prev_opps,
        "current_applications": current_apps,
        "previous_applications": prev_apps,
    }


def get_valid_opportunities() -> QuerySet[InternshipOpportunity]:
    """
    Returns only OPEN opportunities with valid deadlines (not expired).
    
    Per architecture: This is a read-only query that combines filtering logic.
    Follows queries.py purpose: encapsulate all read patterns for reuse.
    
    Business rule: An opportunity is "valid" when:
    - Status is OPEN
    - Either deadline is NULL (no deadline) OR deadline is in the future
    
    Used by: API listing endpoints, marketplace marketplace filtering
    """
    from django.utils import timezone
    now = timezone.now()
    
    return InternshipOpportunity.objects.filter(
        Q(status=OpportunityStatus.OPEN) & (
            Q(application_deadline__isnull=True) |  # No deadline set
            Q(application_deadline__gt=now)  # Deadline is in the future
        )
    ).order_by('-created_at')


def get_withdrawn_applications_for_student(student_id: UUID) -> QuerySet[InternshipApplication]:
    """
    Returns all withdrawn applications for a specific student.
    Includes information about when and why they were withdrawn.
    """
    return InternshipApplication.objects.filter(
        student_id=student_id,
        status=ApplicationStatus.WITHDRAWN
    ).select_related('opportunity').order_by('-updated_at')


def get_withdrawn_applications_for_opportunity(opportunity_id: UUID) -> QuerySet[InternshipApplication]:
    """
    Returns all withdrawn applications for a specific opportunity.
    Useful for monitoring withdrawal trends and patterns.
    """
    return InternshipApplication.objects.filter(
        opportunity_id=opportunity_id,
        status=ApplicationStatus.WITHDRAWN
    ).select_related('student').order_by('-updated_at')


def get_withdrawal_stats_for_opportunity(opportunity_id: UUID) -> dict:
    """
    Returns withdrawal statistics for a specific opportunity.
    Helps identify if an opportunity has high withdrawal rates.
    """
    total_applications = InternshipApplication.objects.filter(
        opportunity_id=opportunity_id
    ).count()
    
    withdrawn_applications = InternshipApplication.objects.filter(
        opportunity_id=opportunity_id,
        status=ApplicationStatus.WITHDRAWN
    ).count()
    
    withdrawal_rate = 0
    if total_applications > 0:
        withdrawal_rate = round((withdrawn_applications / total_applications) * 100, 2)
    
    return {
        "total_applications": total_applications,
        "withdrawn_applications": withdrawn_applications,
        "withdrawal_rate": withdrawal_rate,
    }


def get_recent_withdrawals_for_opportunity(opportunity_id: UUID, days: int = 30) -> QuerySet[InternshipApplication]:
    """
    Returns withdrawn applications from the last N days for an opportunity.
    Useful for identifying if an opportunity has recent withdrawal spikes.
    """
    from django.utils import timezone
    from datetime import timedelta
    
    cutoff_date = timezone.now() - timedelta(days=days)
    
    return InternshipApplication.objects.filter(
        opportunity_id=opportunity_id,
        status=ApplicationStatus.WITHDRAWN,
        updated_at__gte=cutoff_date
    ).select_related('student').order_by('-updated_at')


def get_external_placement_declarations_for_user(user) -> QuerySet[ExternalPlacementDeclaration]:
    queryset = ExternalPlacementDeclaration.objects.select_related(
        "application",
        "application__opportunity",
    ).order_by("-created_at", "-id")

    if user.is_system_admin:
        return queryset

    if user.is_student:
        student = get_student_for_user(str(user.id))
        if student:
            return queryset.filter(student_id=student.id)
        return ExternalPlacementDeclaration.objects.none()

    if user.is_institution_admin:
        institution = get_institution_for_user(str(user.id))
        if institution:
            return queryset.filter(institution_id=institution.id)
        return ExternalPlacementDeclaration.objects.none()

    return ExternalPlacementDeclaration.objects.none()


def get_external_placement_declaration_by_id(declaration_id) -> Optional[ExternalPlacementDeclaration]:
    try:
        return ExternalPlacementDeclaration.objects.select_related(
            "application",
            "application__opportunity",
        ).get(id=declaration_id)
    except ExternalPlacementDeclaration.DoesNotExist:
        return None
