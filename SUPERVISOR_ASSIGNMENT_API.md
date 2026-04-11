# Edulink Phase 2.4 API Documentation

## Supervisor Assignment Acceptance Workflow

**Version**: 1.0  
**Status**: Phase 2.4 Implementation  
**Base URL**: `/api/internships/`

---

## Overview

The Supervisor Assignment API implements the **Phase 2.4 Supervisor Consent Workflow**. This allows:

1. **Admin assigns supervisor** → creates assignment in PENDING state
2. **Supervisor receives notification** → can review and decide
3. **Supervisor accepts** → assignment transitions to ACCEPTED, application updated
4. **Supervisor rejects** → assignment transitions to REJECTED, admin notifies and reassigns

**Key Principle**: Supervisors have agency. No forced assignments.

---

## Endpoints

### 1. List Supervisor Assignments

**Endpoint**: `GET /api/internships/supervisor-assignments/`

**Authentication**: Required (JWT token)

**Query Parameters**:
- `status` (optional): Filter by status (`PENDING`, `ACCEPTED`, `REJECTED`)
- `assignment_type` (optional): Filter by type (`EMPLOYER`, `INSTITUTION`)
- `page` (optional): Pagination (default: 1, size: 20)

**Permissions**:
- Supervisors: See their own assignments
- Admins: See all assignments
- Students: See assignments for their own applications

**Response (200 OK)**:

```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "application": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "opportunity": {
          "title": "Marketing Internship",
          "description": "Summer marketing role"
        },
        "student_id": "550e8400-e29b-41d4-a716-446655440003",
        "status": "ACTIVE"
      },
      "supervisor_id": "550e8400-e29b-41d4-a716-446655440004",
      "assigned_by_id": "550e8400-e29b-41d4-a716-446655440005",
      "assignment_type": "EMPLOYER",
      "status": "PENDING",
      "assigned_at": "2026-04-11T10:30:00Z",
      "accepted_at": null,
      "rejected_at": null,
      "rejection_reason": "",
      "created_at": "2026-04-11T10:30:00Z",
      "updated_at": "2026-04-11T10:30:00Z"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not authorized to view assignments

---

### 2. Retrieve Assignment Details

**Endpoint**: `GET /api/internships/supervisor-assignments/{id}/`

**Authentication**: Required

**URL Parameters**:
- `id` (required): Assignment UUID

**Permissions**: User must be supervisor, admin, or student (for their own app)

**Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "application": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "opportunity": {
      "title": "Marketing Internship",
      "description": "3-month summer role working on campaign strategy"
    },
    "student_id": "550e8400-e29b-41d4-a716-446655440003",
    "status": "ACTIVE"
  },
  "supervisor_id": "550e8400-e29b-41d4-a716-446655440004",
  "assigned_by_id": "550e8400-e29b-41d4-a716-446655440005",
  "assignment_type": "EMPLOYER",
  "status": "PENDING",
  "assigned_at": "2026-04-11T10:30:00Z",
  "accepted_at": null,
  "rejected_at": null,
  "rejection_reason": "",
  "created_at": "2026-04-11T10:30:00Z",
  "updated_at": "2026-04-11T10:30:00Z"
}
```

**Error Responses**:
- `404 Not Found`: Assignment not found
- `403 Forbidden`: Not authorized to view this assignment

---

### 3. Accept Supervisor Assignment

**Endpoint**: `POST /api/internships/supervisor-assignments/{id}/accept/`

**Authentication**: Required

**URL Parameters**:
- `id` (required): Assignment UUID

**Request Body**:

```json
{}
```

(No additional fields required - just confirmation)

**Permissions**: Must be the assigned supervisor

**What Happens**:
1. Validates supervisor is the one assigned
2. Transitions assignment from PENDING → ACCEPTED
3. Updates application to point to this supervisor
   - If `assignment_type == "EMPLOYER"`: Sets `application.employer_supervisor_id`
   - If `assignment_type == "INSTITUTION"`: Sets `application.institution_supervisor_id`
4. Records ledger event: `SUPERVISOR_ASSIGNMENT_ACCEPTED`
5. Sends notification to admin

**Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "application": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "opportunity": {
      "title": "Marketing Internship"
    },
    "student_id": "550e8400-e29b-41d4-a716-446655440003",
    "status": "ACTIVE",
    "employer_supervisor_id": "550e8400-e29b-41d4-a716-446655440004"
  },
  "supervisor_id": "550e8400-e29b-41d4-a716-446655440004",
  "assigned_by_id": "550e8400-e29b-41d4-a716-446655440005",
  "assignment_type": "EMPLOYER",
  "status": "ACCEPTED",
  "assigned_at": "2026-04-11T10:30:00Z",
  "accepted_at": "2026-04-11T14:15:00Z",
  "rejected_at": null,
  "rejection_reason": "",
  "created_at": "2026-04-11T10:30:00Z",
  "updated_at": "2026-04-11T14:15:00Z"
}
```

**Error Responses**:
- `403 Forbidden`: "Only the assigned supervisor can accept this assignment"
- `400 Bad Request`: Assignment already accepted/rejected, or other business logic error
- `404 Not Found`: Assignment not found

---

### 4. Reject Supervisor Assignment

**Endpoint**: `POST /api/internships/supervisor-assignments/{id}/reject/`

**Authentication**: Required

**URL Parameters**:
- `id` (required): Assignment UUID

**Request Body**:

```json
{
  "reason": "Unable to commit due to scheduling conflicts"
}
```

**Fields**:
- `reason` (optional, string, max 500 chars): Why the supervisor is rejecting

**Permissions**: Must be the assigned supervisor

**What Happens**:
1. Validates supervisor is the one assigned
2. Transitions assignment from PENDING → REJECTED
3. **Does NOT** update application (supervisor still needed)
4. Stores rejection reason in `rejection_reason` field
5. Records ledger event: `SUPERVISOR_ASSIGNMENT_REJECTED`
6. Sends notification to admin (with reason)

**Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "application": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "opportunity": {
      "title": "Marketing Internship"
    },
    "student_id": "550e8400-e29b-41d4-a716-446655440003",
    "status": "ACTIVE",
    "employer_supervisor_id": null
  },
  "supervisor_id": "550e8400-e29b-41d4-a716-446655440004",
  "assigned_by_id": "550e8400-e29b-41d4-a716-446655440005",
  "assignment_type": "EMPLOYER",
  "status": "REJECTED",
  "assigned_at": "2026-04-11T10:30:00Z",
  "accepted_at": null,
  "rejected_at": "2026-04-11T14:15:00Z",
  "rejection_reason": "Unable to commit due to scheduling conflicts",
  "created_at": "2026-04-11T10:30:00Z",
  "updated_at": "2026-04-11T14:15:00Z"
}
```

**Error Responses**:
- `403 Forbidden`: "Only the assigned supervisor can reject this assignment"
- `400 Bad Request`: Assignment already accepted/rejected, or other business logic error
- `404 Not Found`: Assignment not found

---

## Data Model

### SupervisorAssignment

```python
{
  "id": UUID,                          # Unique ID
  "application": ForeignKey,           # The internship application
  "supervisor_id": UUID,               # The supervisor being assigned
  "assigned_by_id": UUID,              # Who assigned (admin)
  "assignment_type": str,              # "EMPLOYER" or "INSTITUTION"
  "status": str,                       # "PENDING", "ACCEPTED", "REJECTED"
  "assigned_at": DateTime,             # When admin assigned
  "accepted_at": DateTime,             # When supervisor accepted (null if pending/rejected)
  "rejected_at": DateTime,             # When supervisor rejected (null if pending/accepted)
  "rejection_reason": str,             # Why rejected (empty if accepted)
  "metadata": JSONField,               # Audit trail
  "created_at": DateTime,              # Record creation
  "updated_at": DateTime,              # Last update
}
```

**Status States**:

| Status | Meaning | Next States |
|--------|---------|------------|
| `PENDING` | Admin assigned, supervisor hasn't decided | `ACCEPTED`, `REJECTED` |
| `ACCEPTED` | Supervisor confirmed | (terminal) |
| `REJECTED` | Supervisor declined | (terminal) |

**Assignment Types**:

| Type | Meaning |
|------|---------|
| `EMPLOYER` | Supervisor from employer side (sets `application.employer_supervisor_id`) |
| `INSTITUTION` | Supervisor from institution side (sets `application.institution_supervisor_id`) |

---

## State Transitions

### Valid Transitions

```
┌─────────┐
│ PENDING │
└────┬────┘
     │
     ├─→ ACCEPTED (supervisor accepts)
     │       ↓
     │   (terminal - application updated)
     │
     └─→ REJECTED (supervisor declines)
             ↓
         (terminal - requires new assignment)
```

### Invalid Transitions

- Cannot go from ACCEPTED → anything
- Cannot go from REJECTED → anything
- Cannot accept after rejecting (requires new assignment)

---

## Event Recording (Ledger)

All state transitions are recorded as immutable ledger events:

**PENDING → ACCEPTED**:
```python
event_type: "SUPERVISOR_ASSIGNMENT_ACCEPTED"
payload: {
  "from_state": "PENDING",
  "to_state": "ACCEPTED",
  "application_id": "550e8400-e29b-41d4-a716-446655440002",
  "assignment_type": "EMPLOYER",
  "supervisor_id": "550e8400-e29b-41d4-a716-446655440004",
  "accepted_by": "550e8400-e29b-41d4-a716-446655440004"
}
```

**PENDING → REJECTED**:
```python
event_type: "SUPERVISOR_ASSIGNMENT_REJECTED"
payload: {
  "from_state": "PENDING",
  "to_state": "REJECTED",
  "application_id": "550e8400-e29b-41d4-a716-446655440002",
  "assignment_type": "EMPLOYER",
  "supervisor_id": "550e8400-e29b-41d4-a716-446655440004",
  "reason": "Unable to commit due to scheduling conflicts",
  "rejected_by": "550e8400-e29b-41d4-a716-446655440004"
}
```

---

## Authorization & Permissions

### Role-Based Access

| Role | List | View | Accept | Reject |
|------|------|------|--------|--------|
| Supervisor | Own only | Own only | Own only | Own only |
| Admin | All | All | No | No |
| Student | Own app | Own app | No | No |
| Other | None | None | None | None |

### Policy Functions

- `can_accept_supervisor_assignment(actor, assignment)` 
  - Returns: `actor.id == assignment.supervisor_id`
  - Only the assigned supervisor can accept

- `can_reject_supervisor_assignment(actor, assignment)`
  - Returns: `actor.id == assignment.supervisor_id`
  - Only the assigned supervisor can reject

- `can_view_supervisor_assignment(actor, assignment)`
  - Returns: Supervisor, admin, or student (on their own app)

---

## Common Workflows

### Workflow 1: Supervisor Accepts Assignment

```
Admin:
  POST /api/internships/applications/{id}/assign_supervisor/
  → Creates SupervisorAssignment (PENDING)
  → Supervisor gets notification

Supervisor:
  GET /api/internships/supervisor-assignments/
  → See pending assignment

  POST /api/internships/supervisor-assignments/{id}/accept/
  → PENDING → ACCEPTED
  → Application updated with supervisor_id
  → Admin notified

Student:
  GET /api/internships/applications/{id}/
  → Sees supervisor_id is now set
  → Supervisor profile visible
```

### Workflow 2: Supervisor Rejects Assignment

```
Admin:
  POST /api/internships/applications/{id}/assign_supervisor/
  → Creates SupervisorAssignment (PENDING)
  → Supervisor gets notification

Supervisor:
  POST /api/internships/supervisor-assignments/{id}/reject/
  → PENDING → REJECTED
  → Application NOT updated
  → Reason stored
  → Admin notified with reason

Admin:
  GET /api/internships/supervisor-assignments/
  → See rejected assignment with reason
  
  POST /api/internships/applications/{id}/assign_supervisor/
  → Create new assignment with different supervisor
  → Retry process
```

---

## Error Handling

### Standard Error Response

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Errors

| Status | Error | Meaning |
|--------|-------|---------|
| 401 | Unauthorized | User not authenticated |
| 403 | Forbidden | User not authorized for this action |
| 400 | Bad Request | Invalid data or business logic error |
| 404 | Not Found | Assignment doesn't exist |

---

## Testing the API

### Example cURL Commands

**List assignments**:
```bash
curl -X GET "http://localhost:8000/api/internships/supervisor-assignments/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Accept assignment**:
```bash
curl -X POST "http://localhost:8000/api/internships/supervisor-assignments/{id}/accept/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Reject assignment**:
```bash
curl -X POST "http://localhost:8000/api/internships/supervisor-assignments/{id}/reject/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Unable to commit time"}'
```

---

## Integration with Application Status

When a supervisor **accepts** an assignment:
- Assignment transitions to ACCEPTED
- `InternshipApplication.employer_supervisor_id` (or `institution_supervisor_id`) is set
- Student can now see the supervisor
- Supervisor can now access application logbooks, evidence, etc.

When a supervisor **rejects** an assignment:
- Assignment transitions to REJECTED
- Application supervisor fields **NOT updated**
- Admin must create a new assignment or assign different supervisor

---

## Database Schema

```sql
CREATE TABLE internship_supervisor_assignments (
  id UUID PRIMARY KEY,
  application_id UUID NOT NULL FOREIGN KEY,
  supervisor_id UUID NOT NULL,
  assigned_by_id UUID NOT NULL,
  assignment_type VARCHAR(20),
  status VARCHAR(20) DEFAULT 'PENDING',
  assigned_at TIMESTAMP AUTO,
  accepted_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,
  rejection_reason TEXT,
  metadata JSONB DEFAULT {},
  created_at TIMESTAMP AUTO,
  updated_at TIMESTAMP AUTO,
  UNIQUE(application_id, supervisor_id, assignment_type),
  INDEX(status),
  INDEX(application_id, assignment_type),
  INDEX(supervisor_id)
);
```

---

## Rate Limiting

No specific rate limiting for supervisor assignment endpoints. Uses default system limits (if configured).

---

## Versioning

API Version: `1.0`  
Last Updated: April 11, 2026  
Status: Phase 2.4 - Complete

---

## Implementation Notes

**Architecture Pattern**: Follows Django REST Framework standard pattern
- ViewSet for CRUD operations
- Serializers for validation
- Permissions for authorization
- Services for business logic

**Data Integrity**: Row-level locking via `select_for_update()` prevents race conditions

**Audit Trail**: All transitions recorded to immutable ledger

**Separation of Concerns**: 
- Views handle HTTP/REST
- Services handle business logic
- Policies handle authorization
- Models store data only

