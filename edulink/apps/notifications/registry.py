"""
Phase 3.2a: Notification Type Registry

Centralizes all notification types across the system into a single enumerated source.
Replaces 50+ scattered notification type string constants with a unified registry.

Benefits:
- Single source of truth
- Type safety (can't typo notification types)
- Easy to add new types consistently
- Frontend can auto-discover templates
- Audit trail clarity
"""

from enum import Enum
from typing import Dict, Optional, List


class NotificationType(Enum):
    """
    Centralized notification type registry.
    
    All notifications in the system must use one of these types.
    Pattern: "{entity}.{action}" for clarity.
    """
    
    # ========================================================================
    # Supervisor Assignment Workflow (5 types)
    # ========================================================================
    SUPERVISOR_ASSIGNMENT_CREATED = "supervisor_assignment.created"
    SUPERVISOR_ASSIGNMENT_ACCEPTED = "supervisor_assignment.accepted"
    SUPERVISOR_ASSIGNMENT_REJECTED = "supervisor_assignment.rejected"
    SUPERVISOR_ASSIGNMENT_WITHDRAWN = "supervisor_assignment.withdrawn"
    SUPERVISOR_ASSIGNMENT_EXPIRED = "supervisor_assignment.expired"
    
    # ========================================================================
    # Evidence Workflow (6 types)
    # ========================================================================
    EVIDENCE_SUBMITTED = "evidence.submitted"
    EVIDENCE_REVIEWED = "evidence.reviewed"
    EVIDENCE_APPROVED = "evidence.approved"
    EVIDENCE_REJECTED = "evidence.rejected"
    EVIDENCE_REVISION_REQUIRED = "evidence.revision_required"
    EVIDENCE_ESCALATED = "evidence.escalated"
    
    # ========================================================================
    # Incident Workflow (7 types)
    # ========================================================================
    INCIDENT_CREATED = "incident.created"
    INCIDENT_REPORTED = "incident.reported"
    INCIDENT_ASSIGNED = "incident.assigned"
    INCIDENT_INVESTIGATION_STARTED = "incident.investigation_started"
    INCIDENT_RESOLUTION_PROPOSED = "incident.resolution_proposed"
    INCIDENT_RESOLVED = "incident.resolved"
    INCIDENT_DISMISSED = "incident.dismissed"
    
    # ========================================================================
    # Application Workflow (6 types)
    # ========================================================================
    APPLICATION_SUBMITTED = "application.submitted"
    APPLICATION_ACCEPTED = "application.accepted"
    APPLICATION_REJECTED = "application.rejected"
    APPLICATION_STARTED = "application.started"
    APPLICATION_COMPLETED = "application.completed"
    APPLICATION_WITHDRAWN = "application.withdrawn"
    
    # ========================================================================
    # Opportunity Workflow (4 types)
    # ========================================================================
    OPPORTUNITY_PUBLISHED = "opportunity.published"
    OPPORTUNITY_CLOSED = "opportunity.closed"
    OPPORTUNITY_DEADLINE_APPROACHING = "opportunity.deadline_approaching"
    OPPORTUNITY_DEADLINE_EXTENDED = "opportunity.deadline_extended"
    
    # ========================================================================
    # Communication Events (3 types)
    # ========================================================================
    COMMUNICATION_REQUEST_SENT = "communication.request_sent"
    COMMUNICATION_REQUEST_ACCEPTED = "communication.request_accepted"
    COMMUNICATION_REQUEST_DECLINED = "communication.request_declined"
    
    # ========================================================================
    # System Notifications (4 types)
    # ========================================================================
    SYSTEM_ERROR = "system.error"
    SYSTEM_MAINTENANCE = "system.maintenance"
    SYSTEM_ANNOUNCEMENT = "system.announcement"
    SYSTEM_ALERT = "system.alert"
    
    def __str__(self) -> str:
        """Return the notification type value"""
        return self.value
    
    @property
    def entity_type(self) -> str:
        """Extract entity type from notification type (e.g., 'supervisor_assignment' from 'supervisor_assignment.created')"""
        return self.value.split('.')[0]
    
    @property
    def action_type(self) -> str:
        """Extract action type from notification type (e.g., 'created' from 'supervisor_assignment.created')"""
        return self.value.split('.')[1]


class NotificationTemplate(Enum):
    """
    Maps NotificationType to email template file.
    
    Templates are stored in:
        notifications/templates/emails/{template_name}
    """
    
    # Supervisor Assignment Templates
    SUPERVISOR_ASSIGNMENT_CREATED = "supervisor_assignment_created.html"
    SUPERVISOR_ASSIGNMENT_ACCEPTED = "supervisor_assignment_accepted.html"
    SUPERVISOR_ASSIGNMENT_REJECTED = "supervisor_assignment_rejected.html"
    SUPERVISOR_ASSIGNMENT_WITHDRAWN = "supervisor_assignment_withdrawn.html"
    SUPERVISOR_ASSIGNMENT_EXPIRED = "supervisor_assignment_expired.html"
    
    # Evidence Templates
    EVIDENCE_SUBMITTED = "evidence_submitted.html"
    EVIDENCE_REVIEWED = "evidence_reviewed.html"
    EVIDENCE_APPROVED = "evidence_approved.html"
    EVIDENCE_REJECTED = "evidence_rejected.html"
    EVIDENCE_REVISION_REQUIRED = "evidence_revision_required.html"
    EVIDENCE_ESCALATED = "evidence_escalated.html"
    
    # Incident Templates
    INCIDENT_CREATED = "incident_created.html"
    INCIDENT_REPORTED = "incident_reported.html"
    INCIDENT_ASSIGNED = "incident_assigned.html"
    INCIDENT_INVESTIGATION_STARTED = "incident_investigation_started.html"
    INCIDENT_RESOLUTION_PROPOSED = "incident_resolution_proposed.html"
    INCIDENT_RESOLVED = "incident_resolved.html"
    INCIDENT_DISMISSED = "incident_dismissed.html"
    
    # Application Templates
    APPLICATION_SUBMITTED = "application_submitted.html"
    APPLICATION_ACCEPTED = "application_accepted.html"
    APPLICATION_REJECTED = "application_rejected.html"
    APPLICATION_STARTED = "application_started.html"
    APPLICATION_COMPLETED = "application_completed.html"
    APPLICATION_WITHDRAWN = "application_withdrawn.html"
    
    # Opportunity Templates
    OPPORTUNITY_PUBLISHED = "opportunity_published.html"
    OPPORTUNITY_CLOSED = "opportunity_closed.html"
    OPPORTUNITY_DEADLINE_APPROACHING = "opportunity_deadline_approaching.html"
    OPPORTUNITY_DEADLINE_EXTENDED = "opportunity_deadline_extended.html"
    
    # Communication Templates
    COMMUNICATION_REQUEST_SENT = "communication_request_sent.html"
    COMMUNICATION_REQUEST_ACCEPTED = "communication_request_accepted.html"
    COMMUNICATION_REQUEST_DECLINED = "communication_request_declined.html"
    
    # System Templates
    SYSTEM_ERROR = "system_error.html"
    SYSTEM_MAINTENANCE = "system_maintenance.html"
    SYSTEM_ANNOUNCEMENT = "system_announcement.html"
    SYSTEM_ALERT = "system_alert.html"


class NotificationPriority(Enum):
    """Priority level for notification delivery"""
    LOW = "LOW"           # Can be delivered asynchronously, no rush
    NORMAL = "NORMAL"     # Standard priority, deliver same-day
    HIGH = "HIGH"         # Important, deliver within hours
    URGENT = "URGENT"     # Critical, deliver immediately


class NotificationChannel(Enum):
    """Delivery channels for notifications"""
    EMAIL = "EMAIL"
    SMS = "SMS"
    IN_APP = "IN_APP"
    PUSH = "PUSH"


class NotificationRecipient(Enum):
    """Recipient types for notifications"""
    STUDENT = "STUDENT"
    SUPERVISOR = "SUPERVISOR"
    EMPLOYER = "EMPLOYER"
    INSTITUTION_ADMIN = "INSTITUTION_ADMIN"
    SYSTEM_ADMIN = "SYSTEM_ADMIN"
    MODERATOR = "MODERATOR"
    COORDINATOR = "COORDINATOR"


# ============================================================================
# Notification Type Registry Lookup Tables
# ============================================================================

# Map NotificationType to NotificationTemplate
NOTIFICATION_TEMPLATES: Dict[NotificationType, NotificationTemplate] = {
    NotificationType.SUPERVISOR_ASSIGNMENT_CREATED: NotificationTemplate.SUPERVISOR_ASSIGNMENT_CREATED,
    NotificationType.SUPERVISOR_ASSIGNMENT_ACCEPTED: NotificationTemplate.SUPERVISOR_ASSIGNMENT_ACCEPTED,
    NotificationType.SUPERVISOR_ASSIGNMENT_REJECTED: NotificationTemplate.SUPERVISOR_ASSIGNMENT_REJECTED,
    NotificationType.SUPERVISOR_ASSIGNMENT_WITHDRAWN: NotificationTemplate.SUPERVISOR_ASSIGNMENT_WITHDRAWN,
    NotificationType.SUPERVISOR_ASSIGNMENT_EXPIRED: NotificationTemplate.SUPERVISOR_ASSIGNMENT_EXPIRED,
    
    NotificationType.EVIDENCE_SUBMITTED: NotificationTemplate.EVIDENCE_SUBMITTED,
    NotificationType.EVIDENCE_REVIEWED: NotificationTemplate.EVIDENCE_REVIEWED,
    NotificationType.EVIDENCE_APPROVED: NotificationTemplate.EVIDENCE_APPROVED,
    NotificationType.EVIDENCE_REJECTED: NotificationTemplate.EVIDENCE_REJECTED,
    NotificationType.EVIDENCE_REVISION_REQUIRED: NotificationTemplate.EVIDENCE_REVISION_REQUIRED,
    NotificationType.EVIDENCE_ESCALATED: NotificationTemplate.EVIDENCE_ESCALATED,
    
    NotificationType.INCIDENT_CREATED: NotificationTemplate.INCIDENT_CREATED,
    NotificationType.INCIDENT_REPORTED: NotificationTemplate.INCIDENT_REPORTED,
    NotificationType.INCIDENT_ASSIGNED: NotificationTemplate.INCIDENT_ASSIGNED,
    NotificationType.INCIDENT_INVESTIGATION_STARTED: NotificationTemplate.INCIDENT_INVESTIGATION_STARTED,
    NotificationType.INCIDENT_RESOLUTION_PROPOSED: NotificationTemplate.INCIDENT_RESOLUTION_PROPOSED,
    NotificationType.INCIDENT_RESOLVED: NotificationTemplate.INCIDENT_RESOLVED,
    NotificationType.INCIDENT_DISMISSED: NotificationTemplate.INCIDENT_DISMISSED,
    
    NotificationType.APPLICATION_SUBMITTED: NotificationTemplate.APPLICATION_SUBMITTED,
    NotificationType.APPLICATION_ACCEPTED: NotificationTemplate.APPLICATION_ACCEPTED,
    NotificationType.APPLICATION_REJECTED: NotificationTemplate.APPLICATION_REJECTED,
    NotificationType.APPLICATION_STARTED: NotificationTemplate.APPLICATION_STARTED,
    NotificationType.APPLICATION_COMPLETED: NotificationTemplate.APPLICATION_COMPLETED,
    NotificationType.APPLICATION_WITHDRAWN: NotificationTemplate.APPLICATION_WITHDRAWN,
    
    NotificationType.OPPORTUNITY_PUBLISHED: NotificationTemplate.OPPORTUNITY_PUBLISHED,
    NotificationType.OPPORTUNITY_CLOSED: NotificationTemplate.OPPORTUNITY_CLOSED,
    NotificationType.OPPORTUNITY_DEADLINE_APPROACHING: NotificationTemplate.OPPORTUNITY_DEADLINE_APPROACHING,
    NotificationType.OPPORTUNITY_DEADLINE_EXTENDED: NotificationTemplate.OPPORTUNITY_DEADLINE_EXTENDED,
    
    NotificationType.COMMUNICATION_REQUEST_SENT: NotificationTemplate.COMMUNICATION_REQUEST_SENT,
    NotificationType.COMMUNICATION_REQUEST_ACCEPTED: NotificationTemplate.COMMUNICATION_REQUEST_ACCEPTED,
    NotificationType.COMMUNICATION_REQUEST_DECLINED: NotificationTemplate.COMMUNICATION_REQUEST_DECLINED,
    
    NotificationType.SYSTEM_ERROR: NotificationTemplate.SYSTEM_ERROR,
    NotificationType.SYSTEM_MAINTENANCE: NotificationTemplate.SYSTEM_MAINTENANCE,
    NotificationType.SYSTEM_ANNOUNCEMENT: NotificationTemplate.SYSTEM_ANNOUNCEMENT,
    NotificationType.SYSTEM_ALERT: NotificationTemplate.SYSTEM_ALERT,
}

# Map NotificationType to default priority
NOTIFICATION_PRIORITIES: Dict[NotificationType, NotificationPriority] = {
    # High priority: requires immediate action
    NotificationType.SUPERVISOR_ASSIGNMENT_CREATED: NotificationPriority.HIGH,
    NotificationType.SUPERVISOR_ASSIGNMENT_EXPIRED: NotificationPriority.HIGH,
    NotificationType.INCIDENT_CREATED: NotificationPriority.URGENT,
    NotificationType.INCIDENT_ASSIGNED: NotificationPriority.HIGH,
    NotificationType.EVIDENCE_REVISION_REQUIRED: NotificationPriority.HIGH,
    NotificationType.APPLICATION_ACCEPTED: NotificationPriority.HIGH,
    NotificationType.APPLICATION_REJECTED: NotificationPriority.HIGH,
    
    # Normal priority: standard notification
    NotificationType.SUPERVISOR_ASSIGNMENT_ACCEPTED: NotificationPriority.NORMAL,
    NotificationType.SUPERVISOR_ASSIGNMENT_REJECTED: NotificationPriority.NORMAL,
    NotificationType.SUPERVISOR_ASSIGNMENT_WITHDRAWN: NotificationPriority.NORMAL,
    NotificationType.EVIDENCE_SUBMITTED: NotificationPriority.NORMAL,
    NotificationType.EVIDENCE_REVIEWED: NotificationPriority.NORMAL,
    NotificationType.EVIDENCE_APPROVED: NotificationPriority.NORMAL,
    NotificationType.EVIDENCE_REJECTED: NotificationPriority.NORMAL,
    NotificationType.INCIDENT_REPORTED: NotificationPriority.NORMAL,
    NotificationType.INCIDENT_INVESTIGATION_STARTED: NotificationPriority.NORMAL,
    NotificationType.INCIDENT_RESOLUTION_PROPOSED: NotificationPriority.NORMAL,
    NotificationType.INCIDENT_RESOLVED: NotificationPriority.NORMAL,
    NotificationType.INCIDENT_DISMISSED: NotificationPriority.NORMAL,
    NotificationType.APPLICATION_SUBMITTED: NotificationPriority.NORMAL,
    NotificationType.APPLICATION_STARTED: NotificationPriority.NORMAL,
    NotificationType.APPLICATION_COMPLETED: NotificationPriority.NORMAL,
    NotificationType.APPLICATION_WITHDRAWN: NotificationPriority.NORMAL,
    NotificationType.OPPORTUNITY_PUBLISHED: NotificationPriority.NORMAL,
    NotificationType.OPPORTUNITY_CLOSED: NotificationPriority.NORMAL,
    NotificationType.OPPORTUNITY_DEADLINE_APPROACHING: NotificationPriority.NORMAL,
    NotificationType.OPPORTUNITY_DEADLINE_EXTENDED: NotificationPriority.NORMAL,
    NotificationType.COMMUNICATION_REQUEST_SENT: NotificationPriority.NORMAL,
    NotificationType.COMMUNICATION_REQUEST_ACCEPTED: NotificationPriority.NORMAL,
    NotificationType.COMMUNICATION_REQUEST_DECLINED: NotificationPriority.NORMAL,
    
    # Low priority: can wait
    NotificationType.SYSTEM_ERROR: NotificationPriority.NORMAL,
    NotificationType.SYSTEM_MAINTENANCE: NotificationPriority.LOW,
    NotificationType.SYSTEM_ANNOUNCEMENT: NotificationPriority.LOW,
    NotificationType.SYSTEM_ALERT: NotificationPriority.NORMAL,
}

# Map NotificationType to default channels
NOTIFICATION_CHANNELS: Dict[NotificationType, List[NotificationChannel]] = {
    # Urgent: Email + SMS + Push
    NotificationType.SUPERVISOR_ASSIGNMENT_CREATED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.INCIDENT_CREATED: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
    
    # Important: Email + In-App
    NotificationType.EVIDENCE_REVISION_REQUIRED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.APPLICATION_ACCEPTED: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
    NotificationType.APPLICATION_REJECTED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    
    # Standard: Email + In-App
    NotificationType.SUPERVISOR_ASSIGNMENT_ACCEPTED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.SUPERVISOR_ASSIGNMENT_REJECTED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.EVIDENCE_SUBMITTED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.EVIDENCE_REVIEWED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.EVIDENCE_APPROVED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.EVIDENCE_REJECTED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.INCIDENT_REPORTED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.INCIDENT_ASSIGNED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.INCIDENT_INVESTIGATION_STARTED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.INCIDENT_RESOLUTION_PROPOSED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.INCIDENT_RESOLVED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.INCIDENT_DISMISSED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.APPLICATION_SUBMITTED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.APPLICATION_STARTED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.APPLICATION_COMPLETED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.OPPORTUNITY_PUBLISHED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.OPPORTUNITY_CLOSED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.OPPORTUNITY_DEADLINE_APPROACHING: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.OPPORTUNITY_DEADLINE_EXTENDED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.COMMUNICATION_REQUEST_SENT: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.COMMUNICATION_REQUEST_ACCEPTED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.COMMUNICATION_REQUEST_DECLINED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    
    # Low priority: In-App only
    NotificationType.SYSTEM_MAINTENANCE: [NotificationChannel.IN_APP],
    NotificationType.SYSTEM_ANNOUNCEMENT: [NotificationChannel.IN_APP],
    NotificationType.SYSTEM_ERROR: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.SYSTEM_ALERT: [NotificationChannel.IN_APP],
    NotificationType.SUPERVISOR_ASSIGNMENT_WITHDRAWN: [NotificationChannel.IN_APP],
    NotificationType.SUPERVISOR_ASSIGNMENT_EXPIRED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.EVIDENCE_ESCALATED: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    NotificationType.APPLICATION_WITHDRAWN: [NotificationChannel.IN_APP],
}


# ============================================================================
# Notification Registry API
# ============================================================================

class NotificationRegistry:
    """
    Central API for working with notification types.
    
    Usage:
        # Get notification template
        template = NotificationRegistry.get_template(NotificationType.SUPERVISOR_ASSIGNMENT_CREATED)
        
        # Get priority
        priority = NotificationRegistry.get_priority(NotificationType.SUPERVISOR_ASSIGNMENT_CREATED)
        
        # Get channels
        channels = NotificationRegistry.get_channels(NotificationType.SUPERVISOR_ASSIGNMENT_CREATED)
        
        # List all types
        all_types = NotificationRegistry.list_notification_types()
    """
    
    @classmethod
    def get_template(cls, notif_type: NotificationType) -> Optional[str]:
        """Get template filename for notification type"""
        template = NOTIFICATION_TEMPLATES.get(notif_type)
        return template.value if template else None
    
    @classmethod
    def get_priority(cls, notif_type: NotificationType) -> NotificationPriority:
        """Get default priority for notification type"""
        return NOTIFICATION_PRIORITIES.get(notif_type, NotificationPriority.NORMAL)
    
    @classmethod
    def get_channels(cls, notif_type: NotificationType) -> List[NotificationChannel]:
        """Get default delivery channels for notification type"""
        return NOTIFICATION_CHANNELS.get(notif_type, [NotificationChannel.IN_APP])
    
    @classmethod
    def list_notification_types(cls) -> List[str]:
        """List all available notification type values"""
        return [t.value for t in NotificationType]
    
    @classmethod
    def list_templates(cls) -> List[str]:
        """List all available templates"""
        return [t.value for t in NotificationTemplate]
    
    @classmethod
    def from_string(cls, notif_type_str: str) -> Optional[NotificationType]:
        """Get NotificationType from string value"""
        try:
            for notif in NotificationType:
                if notif.value == notif_type_str:
                    return notif
            return None
        except Exception:
            return None
    
    @classmethod
    def validate_notification_type(cls, notif_type: NotificationType) -> bool:
        """Validate that notification type exists"""
        return notif_type in NotificationType
