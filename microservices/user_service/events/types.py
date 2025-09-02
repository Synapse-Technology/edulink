from enum import Enum

class EventType(Enum):
    """Event types for inter-service communication."""
    
    # User Profile Events
    STUDENT_PROFILE_CREATED = 'student_profile_created'
    STUDENT_PROFILE_UPDATED = 'student_profile_updated'
    STUDENT_PROFILE_VERIFIED = 'student_profile_verified'
    STUDENT_PROFILE_DELETED = 'student_profile_deleted'
    
    EMPLOYER_PROFILE_CREATED = 'employer_profile_created'
    EMPLOYER_PROFILE_UPDATED = 'employer_profile_updated'
    EMPLOYER_PROFILE_VERIFIED = 'employer_profile_verified'
    EMPLOYER_PROFILE_DELETED = 'employer_profile_deleted'
    
    INSTITUTION_PROFILE_CREATED = 'institution_profile_created'
    INSTITUTION_PROFILE_UPDATED = 'institution_profile_updated'
    INSTITUTION_PROFILE_DELETED = 'institution_profile_deleted'
    
    # Profile Completion Events
    PROFILE_COMPLETION_MILESTONE = 'profile_completion_milestone'
    PROFILE_COMPLETION_REMINDER = 'profile_completion_reminder'
    
    # Invitation Events
    PROFILE_INVITATION_CREATED = 'profile_invitation_created'
    PROFILE_INVITATION_USED = 'profile_invitation_used'
    PROFILE_INVITATION_EXPIRED = 'profile_invitation_expired'
    
    # Verification Events
    UNIVERSITY_VERIFICATION_REQUESTED = 'university_verification_requested'
    UNIVERSITY_VERIFICATION_COMPLETED = 'university_verification_completed'
    EMPLOYER_VERIFICATION_REQUESTED = 'employer_verification_requested'
    EMPLOYER_VERIFICATION_COMPLETED = 'employer_verification_completed'
    
    # Role Events
    USER_ROLE_ASSIGNED = 'user_role_assigned'
    USER_ROLE_REMOVED = 'user_role_removed'
    USER_PERMISSIONS_UPDATED = 'user_permissions_updated'
    
    # Institution Events
    STUDENT_ENROLLED = 'student_enrolled'
    STUDENT_UNENROLLED = 'student_unenrolled'
    COURSE_ENROLLMENT_UPDATED = 'course_enrollment_updated'
    
    # Notification Events
    NOTIFICATION_REQUESTED = 'notification_requested'
    EMAIL_VERIFICATION_REQUESTED = 'email_verification_requested'
    SMS_VERIFICATION_REQUESTED = 'sms_verification_requested'
    
    # System Events
    SERVICE_HEALTH_CHECK = 'service_health_check'
    DATA_SYNC_REQUESTED = 'data_sync_requested'
    CACHE_INVALIDATION_REQUESTED = 'cache_invalidation_requested'


class EventPriority(Enum):
    """Event priority levels."""
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'


class EventStatus(Enum):
    """Event processing status."""
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'
    RETRYING = 'retrying'