# Phase 3: Design Improvements & System Optimization

**Status**: Post-Phase 2 Planning  
**Date**: April 11, 2026  
**Priority**: Medium (foundational improvements, not blocking)

---

## Overview

Phase 3 focuses on foundational system design improvements after the high-priority architectural fixes (Phase 2) are complete. These improvements enhance maintainability, scalability, and user experience but don't address data integrity or critical workflows.

---

## Phase 3.1: Metadata Schema Standardization

### Problem

Currently, metadata is stored in JSONField without consistent shape:

```python
# Incident metadata
{"from_state": "OPEN", "to_state": "ASSIGNED", "application_id": "..."}

# Evidence metadata
{"daily_entry": "...", "hours_worked": 8, "reflection": "..."}

# Supervisor metadata
{"reason": "...", "noted_at": "2026-04-11", "by_admin": "..."}
```

**Issues**:
- No schema validation
- Frontend can't predict shape
- Auditing harder (inconsistent structure)
- No IDE help for developers
- Serialization/deserialization fragile

### Solution

**Define typed metadata models** for each entity:

```python
# Phase 3.1a: Incident Metadata Schema
@dataclass
class IncidentMetadata:
    from_state: str
    to_state: str
    actor_name: str
    actor_role: str
    timestamp: datetime
    reason: Optional[str] = None
    notes: Optional[str] = None
    
    def to_dict(self):
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data):
        return cls(**data)

# Phase 3.1b: Evidence Review Metadata Schema
@dataclass
class EvidenceReviewMetadata:
    reviewer_id: UUID
    review_notes: str
    approval_status: str  # "APPROVED", "REJECTED", "REVISION_REQUIRED"
    reviewed_at: datetime
    category: Optional[str] = None  # "LOGBOOK", "REPORT", etc.
    
# Phase 3.1c: Supervisor Assignment Metadata Schema
@dataclass
class SupervisorAssignmentMetadata:
    event_type: str
    actor_id: UUID
    actor_role: str
    reason: Optional[str] = None
    created_at: datetime
```

**Implementation Plan**:
1. Define `@dataclass` for each metadata type
2. Add validation functions
3. Update all event recording to use typed metadata
4. Build migration to validate existing metadata
5. Add serializers/deserializers for JSON
6. Update frontend to use typed metadata

**Files to Create**:
- `metaph` to new file
- `edulink/apps/internships/metadata_schemas.py` (150 lines)

**Expected Benefit**:
- Type safety
- IDE autocomplete for developers
- Frontend predictability
- Audit trail clarity
- Easier future migrations

---

## Phase 3.2: Notification Type Consolidation

### Problem

System has grown 50+ notification types scattered across apps:

```python
# notifications/tasks.py
SUPERVISOR_ASSIGNED = "supervisor_assigned"
SUPERVISOR_INVITED = "supervisor_invited"
SUPERVISOR_ASSIGNMENT_CREATED = "supervisor_assignment_created"
INCIDENT_ASSIGNED = "incident_assigned"
INCIDENT_PROPOSED = "incident_proposed"
INCIDENT_RESOLVED = "incident_resolved"
# ... 40+ more
```

**Issues**:
- Hard to maintain (scattered definitions)
- No central registry
- Duplicate types for similar events
- Frontend has to handle 50+ templates
- Hard to add new notification types consistently

### Solution

**Create Notification Type Registry**:

```python
# Phase 3.2a: notifications/registry.py

class NotificationType(Enum):
    """Centralized notification type definitions"""
    
    # Supervisor workflow (replaces 5 scattered types)
    SUPERVISOR_ASSIGNMENT_CREATED = "supervisor.assignment_created"
    SUPERVISOR_ASSIGNMENT_ACCEPTED = "supervisor.assignment_accepted"
    SUPERVISOR_ASSIGNMENT_REJECTED = "supervisor.assignment_rejected"
    
    # Evidence workflow (replaces 8 scattered types)
    EVIDENCE_SUBMITTED = "evidence.submitted"
    EVIDENCE_REVIEWED = "evidence.reviewed"
    EVIDENCE_REQUIRED_REVISION = "evidence.required_revision"
    EVIDENCE_ACCEPTED = "evidence.accepted"
    EVIDENCE_REJECTED = "evidence.rejected"
    
    # Incident workflow (replaces 6 scattered types)
    INCIDENT_CREATED = "incident.created"
    INCIDENT_ASSIGNED = "incident.assigned"
    INCIDENT_INVESTIGATION_STARTED = "incident.investigation_started"
    INCIDENT_RESOLUTION_PROPOSED = "incident.resolution_proposed"
    INCIDENT_RESOLVED = "incident.resolved"
    INCIDENT_DISMISSED = "incident.dismissed"
    
    # Application workflow (4 core types)
    APPLICATION_ACCEPTED = "application.accepted"
    APPLICATION_REJECTED = "application.rejected"
    APPLICATION_STARTED = "application.started"
    APPLICATION_COMPLETED = "application.completed"
    
    # Opportunity workflow (3 types)
    OPPORTUNITY_PUBLISHED = "opportunity.published"
    OPPORTUNITY_CLOSED = "opportunity.closed"
    OPPORTUNITY_DEADLINE_APPROACHING = "opportunity.deadline_approaching"
    
    @classmethod
    def to_template_name(cls, notif_type):
        """Map to email template"""
        mapping = {
            cls.SUPERVISOR_ASSIGNMENT_CREATED: "supervisor_assignment_invitation.html",
            cls.SUPERVISOR_ASSIGNMENT_ACCEPTED: "supervisor_accepted.html",
            cls.INCIDENT_CREATED: "incident_reported.html",
            # ... etc
        }
        return mapping.get(notif_type, "default.html")

# Phase 3.2b: Usage in services
send_notification(
    recipient_id=supervisor_id,
    notification_type=NotificationType.SUPERVISOR_ASSIGNMENT_CREATED,
    context={
        "student_name": "John Doe",
        "opportunity_title": "Marketing Internship",
        "assignment_id": str(assignment.id),
    }
)
```

**Implementation Plan**:
1. Create NotificationType Enum (100 lines)
2. Build NotificationDispatcher that handles type → template mapping
3. Migrate existing notification calls to use enum
4. Deprecate old (scattered) notification functions
5. Update frontend to use centralized registry

**Files to Create**:
- `edulink/apps/notifications/registry.py` (150 lines)
- `edulink/apps/notifications/dispatcher.py` (200 lines)

**Expected Benefit**:
- Single source of truth for notification types
- Easier to add new types
- Frontend can auto-discover templates
- Type safety (can't typo notification type)
- Easier audit trails

---

## Phase 3.3: Admin Role Clarification

### Problem

Currently have monolithic "admin" but real system needs nuanced roles:

```python
# Current (too broad)
user.is_institution_admin  # Can do what exactly?
user.is_employer_admin     # How far do permissions extend?
user.is_system_admin       # God mode?
```

**Real-world admin needs**:
- **Coordinator**: Assigns supervisors, tracks deadlines, reports
- **Moderator**: Reviews incidents, approves evidence, makes judgment calls
- **Compliance Officer**: Audits, generates reports, ensures policy compliance
- **System Admin**: Manages database, permissions, system-level settings

**Current Issues**:
- One person can do everything (security risk)
- Hard to delegate specific duties
- No clear separation of duties
- Audit trails don't show which role performed action

### Solution

**Introduce Role-Based Fine-Grained Permissions**:

```python
# Phase 3.3a: roles/models.py

class AdminRole(models.TextChoices):
    COORDINATOR = "COORDINATOR", "Coordinator"       # Assigns, schedules
    MODERATOR = "MODERATOR", "Moderator"             # Reviews, approves
    COMPLIANCE = "COMPLIANCE", "Compliance Officer"  # Audits, reports
    SYSTEM = "SYSTEM", "System Administrator"        # Database, config

# Phase 3.3b: Permissions Matrix

COORDINATOR_CAN = [
    "assign_supervisor",
    "extend_deadline",
    "generate_reports",
    "bulk_actions",
]

MODERATOR_CAN = [
    "approve_evidence",
    "assign_investigator",
    "approve_incident_resolution",
    "change_application_status",
]

COMPLIANCE_CAN = [
    "view_all_incidents",
    "view_audit_logs",
    "generate_compliance_report",
    "export_data",
]

SYSTEM_CAN = [
    "manage_users",
    "manage_institutions",
    "manage_employers",
    "view_system_logs",
    "configure_settings",
]

# Phase 3.3c: Usage in policies
def can_assign_supervisor(actor, application):
    return (
        actor.is_system_admin or
        actor.admin_role == AdminRole.COORDINATOR
    )

def can_approve_evidence(actor, evidence):
    return (
        actor.is_system_admin or
        actor.admin_role == AdminRole.MODERATOR
    )

# Phase 3.3d: Audit trail
event_type = "SUPERVISOR_ASSIGNED"
event_payload = {
    "assigned_by": str(actor.id),
    "assigned_by_role": str(actor.admin_role),  # ← Capture role
    "supervisor_id": str(supervisor_id),
    "application_id": str(application.id),
}
```

**Implementation Plan**:
1. Add `admin_role` field to User model (migration)
2. Create AdminRole choices enum
3. Update all policies to check role
4. Update all event recording to include role
5. Build admin dashboard to show roles
6. Add role assignment workflows

**Files to Modify**:
- `edulink/apps/accounts/models.py` (+1 field)
- `edulink/apps/internships/policies.py` (update checks)
- All service files (update event payloads)
- Create `edulink/apps/roles/` app (new)

**Expected Benefit**:
- Principle of least privilege
- Separation of duties
- Easier audit trails (who did what)
- Compliance-ready
- Better security posture

---

## Phase 3.4: Error Handling & Resilience

### Problem

Current error handling is basic:

```python
try:
    assignment = accept_supervisor_assignment(actor, id)
except Exception as e:
    return Response({"detail": str(e)}, status=400)
```

**Issues**:
- No error categorization
- Users see raw exception messages
- No way to distinguish user error from system error
- Hard to instrument/monitor
- No retry logic for transient failures

### Solution

**Structured Error Handling**:

```python
# Phase 3.4a: errors.py

class EduLinkError(Exception):
    """Base exception for Edulink domain errors"""
    error_code: str
    http_status: int = 400
    user_message: str
    
class ValidationError(EduLinkError):
    error_code = "VALIDATION_ERROR"
    http_status = 400
    user_message = "The data you provided is invalid"

class NotFoundError(EduLinkError):
    error_code = "NOT_FOUND"
    http_status = 404
    user_message = "The requested resource does not exist"

class AuthorizationError(EduLinkError):
    error_code = "UNAUTHORIZED"
    http_status = 403
    user_message = "You are not authorized to perform this action"

class ConflictError(EduLinkError):
    error_code = "CONFLICT"
    http_status = 409
    user_message = "This action conflicts with current system state"

class TransientError(EduLinkError):
    """Recoverable error - should be retried"""
    error_code = "TRANSIENT_ERROR"
    http_status = 503
    user_message = "Service temporarily unavailable, please try again"

# Phase 3.4b: Usage in services
def accept_supervisor_assignment(actor, assignment_id):
    if actor.id != assignment.supervisor_id:
        raise AuthorizationError(
            f"User {actor.id} is not the assigned supervisor"
        )
    
    if assignment.status != "PENDING":
        raise ConflictError(
            f"Assignment is {assignment.status}, only PENDING can be accepted"
        )

# Phase 3.4c: Response in views
try:
    result = accept_supervisor_assignment(request.user, id)
    return Response(result_serializer(result).data)
except AuthorizationError as e:
    return Response(
        {"error": e.error_code, "message": e.user_message},
        status=e.http_status
    )
except EduLinkError as e:
    logger.error(f"Domain error: {e.error_code}", extra={"exception": e})
    return Response(
        {"error": e.error_code, "message": e.user_message},
        status=e.http_status
    )
```

**Implementation Plan**:
1. Create base error classes (50 lines)
2. Refactor service functions to throw specific errors
3. Update views to handle specific error types
4. Add structured logging
5. Build error monitoring dashboard

**Expected Benefit**:
- Clear error categorization
- Better user experience
- Easier debugging
- Monitorable/instrumentable
- Compliance-ready (error logs)

---

## Phase 3.5: Performance Optimization

### Areas for Improvement

1. **N+1 Query Problem**
   - Evidence reviews with application + student details
   - Incident assignments with supervisor names
   
2. **Missing Indexes**
   - Status lookups
   - Date range queries
   
3. **Cache Opportunities**
   - User roles (loaded on every request)
   - Opportunity metadata
   - Institution settings

4. **Bulk Operations**
   - `bulk_assign_institution_supervisors()` could be optimized
   - Batch notifications

### Optimization Plan

**Phase 3.5a: Query Optimization**
```python
# Before: N+1
incidents = Incident.objects.all()
for incident in incidents:
    print(incident.investigator.name)  # Query per incident

# After: Prefetch
incidents = Incident.objects.select_related(
    'application__opportunity'
).prefetch_related(
    Prefetch('supervisor_assignments', queryset=...)
)
```

**Phase 3.5b: Caching**
```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_user_permissions(user_id):
    user = User.objects.get(id=user_id)
    return {
        "role": user.admin_role,
        "is_admin": user.is_admin,
        "permissions": user.get_permissions(),
    }
```

**Expected Impact**:
- 30-50% faster queries
- Reduced database load
- Better UX (faster responses)

---

## Implementation Roadmap

### Timeline Estimate

| Phase | Est. Time | Complexity | Priority |
|-------|-----------|-----------|----------|
| 3.1 Metadata Schemas | 1-2 days | Medium | High |
| 3.2 Notification Registry | 1 day | Low | High |
| 3.3 Admin Roles | 2-3 days | High | High |
| 3.4 Error Handling | 1-2 days | Medium | Medium |
| 3.5 Performance | As-needed | Medium | Low |

### Recommended Sequence

1. **Start with 3.1** (Metadata schemas) — Foundation for audit trails
2. **Then 3.2** (Notifications) — Improves maintainability quickly
3. **Then 3.3** (Admin roles) — Better security posture
4. **Then 3.4** (Error handling) — Better monitoring
5. **Finally 3.5** (Performance) — Optimize when needed

---

## Decision Points

### For User/Team:

1. **Should we implement all Phase 3 items now?**
   - Recommended: Start with 3.1 + 3.2 (foundational)
   - Defer 3.3-3.5 depending on urgency

2. **What's the priority?**
   - High: Metadata + Notifications (foundational)
   - Medium: Admin roles (security)
   - Low: Error handling + Performance (nice-to-have)

3. **Timeline?**
   - If doing all: 1-2 weeks
   - If starting with core (3.1+3.2): 2-3 days

---

## Summary

**Phase 3 transforms the system from "working" to "maintainable and scalable":**

- **Metadata Schemas**: Type-safe structured data
- **Notification Registry**: Centralized, consistent notifications
- **Admin Roles**: Fine-grained permissions, audit trails
- **Error Handling**: Clear, categorized, monitorable errors
- **Performance**: Optimized queries and caching

All Phase 3 work happens **after** Phase 2 is complete and deployed, as these are improvements rather than blockers.

---

**Next Action**: Confirm which Phase 3 items to prioritize and start implementation schedule.

