from edulink.apps.ledger.queries import get_events_for_entity
from edulink.apps.trust.rules import (
    STUDENT_TRUST_EVENT_POINTS,
    STUDENT_TRUST_TIERS,
    get_student_trust_tier,
)


def get_student_trust_requirements(*, student_id: str) -> dict:
    from edulink.apps.students.models import Student, StudentInstitutionAffiliation
    from edulink.apps.internships.models import InternshipApplication, ApplicationStatus

    student = Student.objects.get(id=student_id)
    approved_affiliation = StudentInstitutionAffiliation.objects.filter(
        student_id=student.id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED,
    ).first()
    completed_application = InternshipApplication.objects.filter(
        student_id=student.id,
        status__in=[ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED],
    ).exists()
    certified_application = InternshipApplication.objects.filter(
        student_id=student.id,
        status=ApplicationStatus.CERTIFIED,
    ).exists()
    active_or_later_application = InternshipApplication.objects.filter(
        student_id=student.id,
        status__in=[ApplicationStatus.ACTIVE, ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED],
    ).exists()

    documents_uploaded = bool(student.cv and student.admission_letter and student.id_document)
    institution_verified = bool(student.is_verified and approved_affiliation)

    return {
        "self_registered": {
            "label": "Student profile created",
            "completed": True,
            "description": "Your EduLink student profile exists.",
        },
        "documents_uploaded": {
            "label": "Required documents uploaded",
            "completed": documents_uploaded,
            "description": "Upload your CV, admission letter, and school ID.",
            "missing": [
                label for present, label in [
                    (student.cv, "CV"),
                    (student.admission_letter, "Admission letter"),
                    (student.id_document, "School ID"),
                ] if not present
            ],
        },
        "institution_verified": {
            "label": "Institution affiliation approved",
            "completed": institution_verified,
            "description": "Your institution has verified your student status.",
            "affiliation_id": str(approved_affiliation.id) if approved_affiliation else None,
        },
        "placement_active": {
            "label": "Placement started",
            "completed": active_or_later_application,
            "description": "Start an accepted placement and keep evidence current.",
        },
        "internship_completed": {
            "label": "Internship completed",
            "completed": completed_application,
            "description": "Complete at least one supervised placement.",
        },
        "completion_certified": {
            "label": "Completion certified",
            "completed": certified_application,
            "description": "Institution certification confirms the completed placement.",
        },
    }


def _derive_student_level(requirements: dict) -> int:
    if requirements["completion_certified"]["completed"]:
        return 4
    if requirements["internship_completed"]["completed"]:
        return 3
    if requirements["institution_verified"]["completed"]:
        return 2
    if requirements["documents_uploaded"]["completed"]:
        return 1
    return 0


def _serialize_tier_requirements(requirements: dict) -> list:
    serialized = []
    for tier in STUDENT_TRUST_TIERS:
        requirement = requirements[tier["requirement_key"]]
        serialized.append({
            "level": tier["level"],
            "name": tier["name"],
            "label": tier["label"],
            "description": tier["description"],
            "requirement_key": tier["requirement_key"],
            "completed": requirement["completed"],
            "requirement": requirement,
        })
    return serialized


def calculate_student_trust_state(*, student_id: str) -> dict:
    """
    Authoritative calculation of student trust from profile state and ledger
    events. Read-only logic. No side effects.

    Levels are milestone-based so verified institution state cannot be lost
    because a ledger event name changed. Points remain useful as a progress
    signal and are never lower than the achieved tier's minimum score.
    """
    events = get_events_for_entity(entity_id=student_id, entity_type="Student")
    event_score = sum(STUDENT_TRUST_EVENT_POINTS.get(event.event_type, 0) for event in events)
    requirements = get_student_trust_requirements(student_id=student_id)
    tier_level = _derive_student_level(requirements)
    tier = get_student_trust_tier(tier_level)
    score = max(event_score, tier["min_score"])

    return {
        "student_id": student_id,
        "score": score,
        "event_score": event_score,
        "tier_level": tier_level,
        "tier_name": tier["name"],
        "tier_label": tier["label"],
        "current_level": tier_level,
        "current_label": tier["label"],
        "next_level": tier_level + 1 if tier_level < 4 else None,
        "progress_percentage": min(100, score),
        "requirements": _serialize_tier_requirements(requirements),
        "requirement_status": requirements,
    }
