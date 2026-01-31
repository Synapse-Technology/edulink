# Trust Tier Constants
TRUST_TIER_LEVELS = {
    0: "Self-Registered",
    1: "Document Verified", 
    2: "Institution Verified",
    3: "Internship Completed",
    4: "Completion Certified"
}

# Event to Trust Points Mapping
TRUST_EVENT_POINTS = {
    "STUDENT_PRE_REGISTERED": 5,
    "DOCUMENT_UPLOADED": 10,
    "STUDENT_VERIFIED": 20,
    "INTERNSHIP_LOGGED": 15,
    "SUPERVISOR_APPROVED": 20,
    "INTERNSHIP_CERTIFIED": 30,
}

# Trust Tier Thresholds
TRUST_TIER_THRESHOLDS = [
    (0, 9, 0, "Self-Registered"),
    (10, 24, 1, "Document Verified"),
    (25, 49, 2, "Institution Verified"), 
    (50, 79, 3, "Internship Completed"),
    (80, float('inf'), 4, "Completion Certified"),
]
