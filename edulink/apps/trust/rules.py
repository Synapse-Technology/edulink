"""
Canonical trust rules.

This module is intentionally data-only so backend services, serializers, and
frontend API contracts can share one vocabulary instead of redefining trust
levels in multiple apps.
"""

STUDENT_TRUST_TIERS = [
    {
        "level": 0,
        "name": "Self-Registered",
        "label": "Self-Registered",
        "min_score": 0,
        "requirement_key": "self_registered",
        "description": "Student account and profile exist.",
    },
    {
        "level": 1,
        "name": "Documents Uploaded",
        "label": "Documents Uploaded",
        "min_score": 25,
        "requirement_key": "documents_uploaded",
        "description": "CV, admission letter, and school ID are uploaded.",
    },
    {
        "level": 2,
        "name": "Institution Verified",
        "label": "Institution Verified",
        "min_score": 50,
        "requirement_key": "institution_verified",
        "description": "Institution affiliation has been approved.",
    },
    {
        "level": 3,
        "name": "Internship Completed",
        "label": "Internship Completed",
        "min_score": 75,
        "requirement_key": "internship_completed",
        "description": "At least one placement has been completed.",
    },
    {
        "level": 4,
        "name": "Completion Certified",
        "label": "Completion Certified",
        "min_score": 100,
        "requirement_key": "completion_certified",
        "description": "A completed placement has been institution-certified.",
    },
]

STUDENT_TRUST_LEVELS = {
    tier["level"]: tier["label"]
    for tier in STUDENT_TRUST_TIERS
}

STUDENT_TRUST_EVENT_POINTS = {
    "STUDENT_PRE_REGISTERED": 5,
    "DOCUMENT_UPLOADED": 10,
    "AFFILIATION_DOCUMENT_UPLOADED": 5,
    "STUDENT_VERIFIED": 30,
    "STUDENT_VERIFIED_BY_INSTITUTION": 50,
    "INTERNSHIP_LOGGED": 15,
    "EVIDENCE_SUBMITTED": 10,
    "SUPERVISOR_APPROVED": 20,
    "EVIDENCE_REVIEWED": 20,
    "INTERNSHIP_COMPLETED": 75,
    "INTERNSHIP_CERTIFIED": 100,
}

STUDENT_TRUST_THRESHOLDS = [
    (
        tier["min_score"],
        STUDENT_TRUST_TIERS[index + 1]["min_score"] - 1
        if index + 1 < len(STUDENT_TRUST_TIERS)
        else float("inf"),
        tier["level"],
        tier["label"],
    )
    for index, tier in enumerate(STUDENT_TRUST_TIERS)
]


def get_student_trust_tier(level: int) -> dict:
    return next(
        (tier for tier in STUDENT_TRUST_TIERS if tier["level"] == level),
        STUDENT_TRUST_TIERS[0],
    )
