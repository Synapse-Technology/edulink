# Event type definitions
EVENT_TYPES = {
    # User events
    "user_registered": "User registered",
    "user_logged_in": "User logged in",
    "user_logged_out": "User logged out",
    "user_profile_updated": "User profile updated",
    "user_password_changed": "User password changed",
    
    # Institution events
    "institution_request_submitted": "Institution onboarding request submitted",
    "institution_request_approved": "Institution onboarding request approved",
    "institution_request_rejected": "Institution onboarding request rejected",
    "institution_created": "Institution created",
    "institution_updated": "Institution updated",
    "institution_verified": "Institution verified",
    "department_created": "Department created",
    "course_created": "Course created",
    
    # Employer events
    "employer_created": "Employer organization created",
    "employer_updated": "Employer organization updated",
    "supervisor_added": "Supervisor added to employer",
    "supervisor_removed": "Supervisor removed from employer",
    
    # Internship events
    "internship_created": "Internship created",
    "internship_published": "Internship published",
    "internship_closed": "Internship closed",
    "internship_cancelled": "Internship cancelled",
    "internship_updated": "Internship updated",
    
    # Application events
    "application_submitted": "Application submitted",
    "application_reviewed": "Application reviewed",
    "application_accepted": "Application accepted",
    "application_rejected": "Application rejected",
    "application_withdrawn": "Application withdrawn",
    "interview_scheduled": "Interview scheduled",
    
    # Student events
    "student_profile_created": "Student profile created",
    "student_document_uploaded": "Student document uploaded",
    "student_document_verified": "Student document verified",
    
    # System events
    "system_maintenance": "System maintenance",
    "system_backup": "System backup completed",
    "system_error": "System error occurred",
}

# Event categories
EVENT_CATEGORIES = {
    "user_management": [
        "user_registered", "user_logged_in", "user_logged_out",
        "user_profile_updated", "user_password_changed"
    ],
    "institution_management": [
        "institution_request_submitted", "institution_request_approved", "institution_request_rejected",
        "institution_created", "institution_updated", "institution_verified",
        "department_created", "course_created"
    ],
    "employer_management": [
        "employer_created", "employer_updated", "supervisor_added", "supervisor_removed"
    ],
    "internship_management": [
        "internship_created", "internship_published", "internship_closed",
        "internship_cancelled", "internship_updated"
    ],
    "application_management": [
        "application_submitted", "application_reviewed", "application_accepted",
        "application_rejected", "application_withdrawn", "interview_scheduled"
    ],
    "student_management": [
        "student_profile_created", "student_document_uploaded", "student_document_verified"
    ],
    "system_operations": [
        "system_maintenance", "system_backup", "system_error"
    ],
}