# Internship Application Withdrawal - Quick Reference Guide

## Feature Overview
Students can withdraw their internship applications at key stages before the internship starts. Once an internship is ACTIVE (started), students cannot withdraw. Platform admins can withdraw any application.

## Using the API

### 1. Withdraw an Application

**Endpoint:** `POST /api/applications/{application_id}/withdraw/`

**Request:**
```json
{
    "reason": "Found another internship opportunity"
}
```

**Response (200 OK):**
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "student_id": "...",
    "opportunity_id": "...",
    "status": "WITHDRAWN",
    "metadata": {
        "withdrawal_reason": "Found another internship opportunity",
        "withdrawn_by": "student",
        "withdrawn_at": "2024-01-15T10:30:00Z"
    },
    ...
}
```

**Error (400 Bad Request - Invalid State):**
```json
{
    "detail": "Cannot withdraw from application in ACTIVE status. Valid states: APPLIED, REVIEWED, SHORTLISTED, ACCEPTED"
}
```

**Error (403 Forbidden - Unauthorized):**
```json
{
    "detail": "Not authorized to withdraw this application"
}
```

### 2. List Withdrawn Applications

**Endpoint:** `GET /api/applications/?status=WITHDRAWN`

**Response:**
```json
{
    "count": 3,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": "...",
            "opportunity": {"title": "Software Engineer Internship"},
            "status": "WITHDRAWN",
            "updated_at": "2024-01-15T10:30:00Z",
            ...
        }
    ]
}
```

### 3. Check Withdrawal Statistics

**Python Code:**
```python
from edulink.apps.internships.queries import get_withdrawal_stats_for_opportunity

stats = get_withdrawal_stats_for_opportunity(opportunity_id)
print(f"Total Applications: {stats['total_applications']}")
print(f"Withdrawn: {stats['withdrawn_applications']}")
print(f"Withdrawal Rate: {stats['withdrawal_rate']}%")
```

**Output:**
```
Total Applications: 50
Withdrawn: 5
Withdrawal Rate: 10.0%
```

## Using the Service Layer

### Withdraw Application Programmatically

```python
from edulink.apps.internships.services import withdraw_application

# Withdraw with reason
withdrawn_app = withdraw_application(
    actor=student_user,
    application_id=application_id,
    reason="Found a better opportunity"
)

# Check new status
assert withdrawn_app.status == 'WITHDRAWN'
assert withdrawn_app.metadata['withdrawal_reason'] == "Found a better opportunity"
```

### Check Withdrawn Applications

```python
from edulink.apps.internships.queries import (
    get_withdrawn_applications_for_student,
    get_withdrawn_applications_for_opportunity
)

# Get student's withdrawn applications
withdrawn = get_withdrawn_applications_for_student(student_id)

# Get all withdrawals for an opportunity
opportunity_withdrawals = get_withdrawn_applications_for_opportunity(opportunity_id)
```

## Allowed Withdrawal States

✅ **CAN WITHDRAW FROM:**
- APPLIED - Submitted but not yet reviewed
- REVIEWED - Application reviewed but decision pending
- SHORTLISTED - Selected for consideration
- ACCEPTED - Offer accepted but haven't started

❌ **CANNOT WITHDRAW FROM:**
- ACTIVE - Internship has started
- COMPLETED - Internship is finished
- REJECTED - Application was rejected
- CANCELLED - Application was cancelled
- WITHDRAWN - Already withdrawn

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  Student Applies                            │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
         ┌────────────┐
    ┌───►│  APPLIED   │◄──┐
    │    └────────────┘   │  Can Withdraw ✓
    │         │            │
    │         ▼            │
    │    ┌────────────┐    │
    └───►│ REVIEWED   │◄──┐
         └────────────┘   │  Can Withdraw ✓
              │            │
              ▼            │
         ┌────────────┐    │
    ┌───►│SHORTLISTED│◄──┐
    │    └────────────┘   │  Can Withdraw ✓
    │         │            │
    │         ▼            │
    │    ┌────────────┐    │
    └───►│ ACCEPTED   │◄──┐
         └────────────┘   │  Can Withdraw ✓
              │            │
              ▼
         ┌────────────┐
         │  ACTIVE    │    Cannot Withdraw ✗
         └────────────┘    (Internship Started)
              │
              ▼
         ┌────────────┐
         │ COMPLETED  │    Cannot Withdraw ✗
         └────────────┘    (Internship Finished)
              │
              ▼
         ┌────────────┐
         │CERTIFIED   │    Cannot Withdraw ✗
         └────────────┘    (Formal Completion)

From any state above:
         │
         ▼
    ┌────────────┐
    │ WITHDRAWN  │    Final State
    └────────────┘
```

## Notifications Sent

When a student withdraws an application:

1. **Student Email**: Via `send_internship_application_status_update_notification()`
   - Confirms withdrawal
   - Links to application dashboard
   
2. **Employer Email**: Via `send_internship_application_withdrawn_to_employer_notification()`
   - Notifies employer of withdrawal
   - Includes student name and withdrawal reason
   - Links to employer dashboard

## Authorization Rules

| Actor Type | Can Withdraw |
|-----------|--------------|
| Student (own app) | ✅ YES (from allowed states) |
| Student (other's app) | ❌ NO |
| Employer | ❌ NO |
| Institution Admin | ❌ NO |
| System Admin | ✅ YES (any state) |

## Metadata Stored

When an application is withdrawn:

```python
{
    "withdrawal_reason": "string or None",
    "withdrawn_by": "student" or "admin",
    "withdrawn_at": "2024-01-15T10:30:00Z"
}
```

## Testing

### Manual Testing via Shell

```bash
# Start Django shell
python manage.py shell

# Get a student and application
from edulink.apps.students.queries import get_student_by_id
from edulink.apps.internships.models import InternshipApplication
from edulink.apps.internships.services import withdraw_application

student = get_student_by_id("student-id-uuid")
app = InternshipApplication.objects.get(id="app-id-uuid")

# Withdraw
result = withdraw_application(
    actor=student.user,
    application_id=app.id,
    reason="Test withdrawal"
)

print(f"Status: {result.status}")
print(f"Metadata: {result.metadata}")
```

### Run Automated Tests

```bash
# All withdrawal tests
pytest edulink/apps/internships/tests/test_withdrawal.py -v

# Specific test group
pytest edulink/apps/internships/tests/test_withdrawal.py::TestWithdrawalService -v

# With coverage
pytest edulink/apps/internships/tests/test_withdrawal.py --cov=edulink.apps.internships.services
```

## Frequently Asked Questions

### Q: Can the employer reverse a withdrawal?
A: Not through this feature. That would require an admin action.

### Q: What happens to the internship capacity after withdrawal?
A: The capacity slot is freed up. The opportunity returns to "available" status for that slot.

### Q: Can a student re-apply after withdrawing?
A: Yes. Withdrawal doesn't prevent re-application. They can apply again.

### Q: Are withdrawals visible to the employer?
A: Yes, they receive a notification and can see it in their dashboard.

### Q: What if the withdrawal notification fails to send?
A: The withdrawal still completes successfully. The error is logged but doesn't block the withdrawal.

## Troubleshooting

### Student Gets "Not Authorized" Error
- Verify student is authenticated
- Verify student owns the application
- Verify application is in allowed state

### Withdrawal Doesn't Appear in Dashboard
- Check application status filter
- Wait for page refresh/cache clear
- Check database directly: `SELECT * FROM internships_application WHERE status='WITHDRAWN'`

### Notification Not Received
- Check email logs: `SELECT * FROM notifications_notification WHERE type='internship_application_withdrawn'`
- Verify employer email is correct
- Check email queue (if using async tasks)

## Related Documentation

- [Full Implementation Guide](WITHDRAWAL_FEATURE_IMPLEMENTATION.md)
- [Django REST Framework Docs](https://www.django-rest-framework.org/)
- [Internship Models](edulink/apps/internships/models.py)
- [Test Cases](edulink/apps/internships/tests/test_withdrawal.py)
