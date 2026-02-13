from typing import Optional, List, Dict, Iterable
from uuid import UUID
from datetime import timedelta
from django.utils import timezone
from django.db.models import QuerySet, Q, Count
from django.conf import settings
from edulink.apps.institutions.queries import get_institution_for_user, get_institution_staff_id_for_user
from edulink.apps.employers.queries import get_employer_for_user, get_supervisor_id_for_user
from edulink.apps.students.queries import get_student_for_user, get_total_students_count
from .models import InternshipOpportunity, InternshipApplication, OpportunityStatus, ApplicationStatus, InternshipEvidence, SuccessStory, Incident

def get_opportunities_for_user(user) -> QuerySet[InternshipOpportunity]:
    """
    Returns opportunities visible to the user.
    """
    queryset = InternshipOpportunity.objects.all()

    if not user.is_authenticated:
        return queryset.filter(status=OpportunityStatus.OPEN)

    if user.is_system_admin:
        return queryset

    elif user.is_institution_admin:
        inst = get_institution_for_user(str(user.id))
        if inst:
            return queryset.filter(institution_id=inst.id)
        return InternshipOpportunity.objects.none()

    elif user.is_employer_admin:
        employer = get_employer_for_user(user.id)
        if employer:
            return queryset.filter(employer_id=employer.id)
        return InternshipOpportunity.objects.none()
    
    elif user.is_student:
        return queryset.filter(status=OpportunityStatus.OPEN)

    # Supervisors (view opportunities of their org)
    elif user.is_supervisor:
        employer = get_employer_for_user(user.id)
        if employer:
             return queryset.filter(employer_id=employer.id)
             
        from edulink.apps.institutions.queries import get_institution_staff_profile
        staff = get_institution_staff_profile(str(user.id))
        if staff:
             return queryset.filter(institution_id=staff.institution_id)

    return InternshipOpportunity.objects.none()

def get_applications_for_user(user) -> QuerySet[InternshipApplication]:
    """
    Returns applications visible to the user.
    """
    queryset = InternshipApplication.objects.select_related('opportunity')
    
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
            # Show applications for opportunities posted by this institution
            # AND applications by students affiliated with this institution (for monitoring/certification)
            from edulink.apps.students.queries import get_affiliated_student_ids
            affiliated_student_ids = get_affiliated_student_ids(str(inst.id))
            
            return queryset.filter(
                Q(opportunity__institution_id=inst.id) |
                Q(student_id__in=affiliated_student_ids)
            ).distinct()
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
            
        if not e_supervisor_id and not i_supervisor_id:
            # Fallback for robustness: check if user ID was used as profile ID
            user_id = user.id if isinstance(user.id, UUID) else UUID(str(user.id))
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
        return InternshipEvidence.objects.filter(status=InternshipEvidence.STATUS_SUBMITTED).select_related('application', 'application__opportunity')

    if user.is_institution_admin:
        from edulink.apps.institutions.queries import get_institution_for_user
        inst = get_institution_for_user(str(user.id))
        if inst:
            from edulink.apps.students.queries import get_affiliated_student_ids
            affiliated_student_ids = get_affiliated_student_ids(str(inst.id))
            return InternshipEvidence.objects.filter(
                Q(application__opportunity__institution_id=inst.id) |
                Q(application__student_id__in=affiliated_student_ids),
                institution_review_status__isnull=True
            ).select_related('application', 'application__opportunity').distinct()

    if user.is_employer_admin:
        from edulink.apps.employers.queries import get_employer_for_user
        employer = get_employer_for_user(user.id)
        if employer:
            return InternshipEvidence.objects.filter(
                application__opportunity__employer_id=employer.id,
                employer_review_status__isnull=True
            ).select_related('application', 'application__opportunity').distinct()

    if user.is_supervisor:
        from edulink.apps.employers.queries import get_supervisor_id_for_user
        from edulink.apps.institutions.queries import get_institution_staff_id_for_user
        
        employer_supervisor_id = get_supervisor_id_for_user(user.id)
        institution_supervisor_id = get_institution_staff_id_for_user(str(user.id))
        
        filters = Q()
        if employer_supervisor_id:
            filters |= Q(application__employer_supervisor_id=employer_supervisor_id, employer_review_status__isnull=True)
        if institution_supervisor_id:
            filters |= Q(application__institution_supervisor_id=institution_supervisor_id, institution_review_status__isnull=True)
            
        if not employer_supervisor_id and not institution_supervisor_id:
            user_id = user.id if isinstance(user.id, UUID) else UUID(str(user.id))
            filters = (
                Q(application__employer_supervisor_id=user_id, employer_review_status__isnull=True) | 
                Q(application__institution_supervisor_id=user_id, institution_review_status__isnull=True)
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

def get_active_placements_for_institution(institution_id: str) -> QuerySet[InternshipApplication]:
    """
    Returns active placements (engagements) for an institution.
    Includes internships posted by the institution OR students affiliated with the institution.
    """
    return InternshipApplication.objects.filter(
        Q(opportunity__institution_id=institution_id) |
        Q(application_snapshot__institution_id=institution_id),
        status__in=[
            ApplicationStatus.APPLIED, 
            ApplicationStatus.SHORTLISTED, 
            ApplicationStatus.ACCEPTED, 
            ApplicationStatus.ACTIVE, 
            ApplicationStatus.COMPLETED, 
            ApplicationStatus.CERTIFIED
        ]
    )


def get_active_placements_for_monitoring(institution_id: str) -> List[dict]:
    """
    Returns enriched placement data for monitoring dashboard.
    """
    from edulink.apps.students.queries import get_students_by_ids
    from edulink.apps.employers.queries import get_employers_by_ids

    placements = get_active_placements_for_institution(institution_id=institution_id)
    
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
        from edulink.apps.institutions.queries import get_institution_staff_by_id
        staff = get_institution_staff_by_id(staff_id=app.institution_supervisor_id)
        if staff:
            return {
                "name": f"{staff.user.first_name} {staff.user.last_name}",
                "email": staff.user.email
            }
    return None

def get_institution_placement_stats(institution_id: str) -> dict:
    """
    Returns rich, insightful placement analytics for institutional admins.
    Includes conversion funnels, department performance, and audit metrics.
    """
    from edulink.apps.students.queries import get_affiliated_student_ids, get_student_department_map
    
    now = timezone.now()
    last_month = now - timedelta(days=30)
    prev_month = last_month - timedelta(days=30)

    # 1. Base query for all applications related to this institution
    # (Students affiliated with this institution)
    affiliated_student_ids = get_affiliated_student_ids(institution_id)
    
    all_apps = InternshipApplication.objects.filter(
        Q(opportunity__institution_id=institution_id) |
        Q(student_id__in=affiliated_student_ids)
    )
    
    # Management-specific apps (only those hosted by the institution)
    # This is what the admin actually manages in the "Applications" page
    institutional_apps = InternshipApplication.objects.filter(opportunity__institution_id=institution_id)
    
    total_apps_count = all_apps.count()
    total_students = get_total_students_count(institution_id)
    
    # 2. Conversion Funnel
    funnel = {
        # "applied" here should represent applications pending review by the institution
        "applied": institutional_apps.filter(status=ApplicationStatus.APPLIED).count(),
        "shortlisted": institutional_apps.filter(status=ApplicationStatus.SHORTLISTED).count(),
        "accepted": institutional_apps.filter(status=ApplicationStatus.ACCEPTED).count(),
        "active": all_apps.filter(status=ApplicationStatus.ACTIVE).count(),
        "completed": all_apps.filter(status__in=[ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED]).count(),
        "certified": all_apps.filter(status=ApplicationStatus.CERTIFIED).count(),
    }
    
    # Conversion Rate: Students with at least one ACTIVE or COMPLETED placement / Total Students
    placed_student_ids = all_apps.filter(
        status__in=[ApplicationStatus.ACTIVE, ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED]
    ).values_list('student_id', flat=True).distinct().count()
    
    placement_rate = round((placed_student_ids / total_students) * 100, 1) if total_students else 0

    # 3. Department Performance
    # Get department mapping via student queries
    student_dept_map = get_student_department_map(institution_id)
    
    dept_map = {}
    for student_id, info in student_dept_map.items():
        dept_id = info["dept_id"] or "Unassigned"
        dept_name = info["dept_name"]
        
        if dept_id not in dept_map:
            dept_map[dept_id] = {"name": dept_name, "student_ids": [], "placements": 0, "certified": 0}
        dept_map[dept_id]["student_ids"].append(UUID(student_id))

    for dept_id, data in dept_map.items():
        dept_apps = all_apps.filter(student_id__in=data["student_ids"])
        data["placements"] = dept_apps.filter(status__in=[ApplicationStatus.ACTIVE, ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED]).count()
        data["certified"] = dept_apps.filter(status=ApplicationStatus.CERTIFIED).count()
        data["total_students"] = len(data["student_ids"])
        data["placement_rate"] = round((data["placements"] / data["total_students"]) * 100, 1) if data["total_students"] else 0
        # Remove student_ids before returning
        del data["student_ids"]

    # 4. Audit & Quality Control Metrics
    # Logbook submission frequency
    total_active_completed = all_apps.filter(status__in=[ApplicationStatus.ACTIVE, ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED])
    total_evidence = InternshipEvidence.objects.filter(application__in=total_active_completed).count()
    evidence_per_placement = round(total_evidence / total_active_completed.count(), 1) if total_active_completed.count() else 0
    
    # Incidents
    total_incidents = Incident.objects.filter(application__in=all_apps).count()
    unresolved_incidents = Incident.objects.filter(application__in=all_apps, status=Incident.STATUS_OPEN).count()

    # 5. Trends
    total_last_30 = all_apps.filter(created_at__gte=last_month).count()
    total_prev_30 = all_apps.filter(created_at__gte=prev_month, created_at__lt=last_month).count()
    total_trend = calculate_trend(total_last_30, total_prev_30)

    return {
        "summary": {
            "total_students": total_students,
            "total_placements": placed_student_ids,
            "placement_rate": placement_rate,
            "total_applications": total_apps_count,
            "total_trend": total_trend,
        },
        "funnel": funnel,
        "departments": list(dept_map.values()),
        "quality_control": {
            "evidence_count": total_evidence,
            "avg_evidence_per_placement": evidence_per_placement,
            "total_incidents": total_incidents,
            "unresolved_incidents": unresolved_incidents,
            "audit_readiness_score": 85, # Mock score for now based on evidence/incidents
        }
    }

def get_export_data(institution_id: str) -> QuerySet[InternshipApplication]:
    """
    Returns full data for export.
    """
    return get_active_placements_for_institution(institution_id).select_related('opportunity')

def get_time_to_placement_stats(institution_id: str) -> dict:
    return {
        "average_days": 14, 
        "median_days": 12 
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
    """
    from django.utils import timezone
    from datetime import timedelta

    now = timezone.now()
    last_month = now - timedelta(days=30)
    last_week = now - timedelta(days=7)
    prev_30 = last_month - timedelta(days=30)
    prev_week = last_week - timedelta(days=7)

    app_qs = InternshipApplication.objects.filter(student_id=student_id)

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
