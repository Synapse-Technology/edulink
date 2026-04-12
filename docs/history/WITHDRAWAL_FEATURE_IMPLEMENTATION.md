# Internship Application Withdrawal Feature Implementation

## Overview
Implemented a complete withdrawal service that allows students to withdraw from internship applications at key lifecycle stages (APPLIED, REVIEWED, SHORTLISTED, ACCEPTED) while preventing withdrawal from ongoing (ACTIVE) or completed internships.

## Files Modified

### 1. **edulink/apps/internships/services.py**
#### New Service Function: `withdraw_application()`
- **Location**: After `accept_offer()` function
- **Parameters**:
  - `actor`: The user performing the withdrawal
  - `application_id`: UUID of the application
  - `reason`: Optional withdrawal reason
- **Functionality**:
  - Validates application status (only allows withdrawal from APPLIED, REVIEWED, SHORTLISTED, ACCEPTED)
  - Checks authorization (student or admin)
  - Transitions application to WITHDRAWN status
  - Stores withdrawal metadata (reason, actor, timestamp)
  - Records event in ledger
  - Sends notification to student
  - Notifies employer about withdrawal
  - Triggers Pusher real-time event
- **Error Handling**:
  - ValueError: If withdrawal not allowed from current status
  - PermissionError: If actor not authorized
  - Logs errors for employer notification failures without breaking withdrawal

### 2. **edulink/apps/internships/queries.py**
#### New Query Functions:
1. **`get_withdrawn_applications_for_student()`**
   - Retrieves all withdrawn applications for a specific student
   - Ordered by most recent

2. **`get_withdrawn_applications_for_opportunity()`**
   - Retrieves all withdrawn applications for a specific opportunity
   - Useful for tracking withdrawal patterns

3. **`get_withdrawal_stats_for_opportunity()`**
   - Returns withdrawal statistics for an opportunity
   - Calculates withdrawal rate percentage

4. **`get_recent_withdrawals_for_opportunity()`**
   - Retrieves withdrawn applications from last N days
   - Helps identify withdrawal spikes

### 3. **edulink/apps/internships/policies.py**
#### New Policy Function: `can_withdraw_application()`
- **Authorization Rules**:
  - System admins can always withdraw any application
  - Students can only withdraw their own applications
  - Withdrawal only allowed from: APPLIED, REVIEWED, SHORTLISTED, ACCEPTED states
  - Withdrawal not allowed from: ACTIVE, COMPLETED, REJECTED, WITHDRAWN, CANCELLED states
- **Returns**: Boolean

### 4. **edulink/apps/internships/views.py**
#### New API Endpoint: `ApplicationViewSet.withdraw()`
- **HTTP Method**: POST
- **URL**: `/api/applications/{id}/withdraw/`
- **Request Body**: `{ "reason": "optional reason string" }`
- **Response**: Updated InternshipApplicationSerializer with WITHDRAWN status
- **Permissions**: Requires authentication and authorization check
- **Status Codes**:
  - 200 OK: Successful withdrawal
  - 400 Bad Request: Invalid state for withdrawal
  - 403 Forbidden: Unauthorized
- **Error Response**: Includes descriptive error message

#### Import Updates:
- Added `withdraw_application` to the imports from `.services`

### 5. **edulink/apps/notifications/models.py**
#### Notification Type Addition:
- **New Type**: `TYPE_INTERNSHIP_APPLICATION_WITHDRAWN = "internship_application_withdrawn"`
- **Choice Tuple**: `("internship_application_withdrawn", "Internship Application Withdrawn")`

### 6. **edulink/apps/notifications/services.py**
#### New Notification Function: `send_internship_application_withdrawn_to_employer_notification()`
- **Purpose**: Notifies employer when student withdraws from opportunity
- **Parameters**:
  - `application_id`: UUID of withdrawn application
  - `employer_id`: UUID of the employer
  - `student_name`: Name of student withdrawing
  - `opportunity_title`: Title of the opportunity
  - `reason`: Withdrawal reason (optional)
  - `actor_id`: Optional actor for audit trail
- **Template**: `internship_application_withdrawn_employer`
- **Context Passed to Template**:
  - employer_name
  - student_name
  - opportunity_title
  - application_id
  - reason
  - dashboard_url
  - site_name
- **Idempotency**: Uses key `withdrawn-employer-{application_id}`

## Test Coverage

### New Test File: `edulink/apps/internships/tests/test_withdrawal.py`
Comprehensive test suite with 20+ test cases covering:

#### Policy Tests:
- Student can withdraw own APPLIED application
- Student cannot withdraw ACTIVE application
- Student cannot withdraw COMPLETED application
- Student cannot withdraw other student's application
- Admin can withdraw any application

#### Service Tests:
- Successful withdrawal from each allowed state
- Failure scenarios for invalid states
- Metadata tracking (reason, actor, timestamp)
- Unauthorized withdrawal attempts

#### API Tests:
- Student withdrawal via API
- Authorization checks
- Optional reason parameter
- Error responses for invalid states

## Workflow States

### Allowed Withdrawal Points:
```
APPLIED → WITHDRAWN ✓
REVIEWED → WITHDRAWN ✓
SHORTLISTED → WITHDRAWN ✓
ACCEPTED → WITHDRAWN ✓
ACTIVE → WITHDRAWN ✗
COMPLETED → WITHDRAWN ✗
REJECTED → WITHDRAWN ✗
```

## Data Flow

### Withdrawal Process:
1. Student initiates withdrawal via API
2. Policy check validates authorization
3. Service validates application status
4. Workflow transitions to WITHDRAWN state
5. Metadata stored (reason, timestamp, actor)
6. Ledger event recorded
7. Student notification sent (use existing status update flow)
8. Employer notification sent (new notification)
9. Real-time Pusher event triggered

### Metadata Stored:
```python
{
    "withdrawal_reason": "string or None",
    "withdrawn_by": "student" or "admin",
    "withdrawn_at": "ISO timestamp"
}
```

## Integration Points

### Existing Systems Used:
- **Workflow Engine**: Uses existing `application_workflow.transition()`
- **Event Tracking**: Records event via `record_event()` in ledger
- **Notifications**: Uses existing `send_internship_application_status_update_notification()` for student
- **Real-time**: Uses `_trigger_application_update_pusher()`
- **Authorization**: Leverages existing policy framework

## API Usage Examples

### Withdraw from Application
```http
POST /api/applications/{application_id}/withdraw/
Content-Type: application/json

{
    "reason": "Found another internship opportunity that better aligns with my career goals"
}
```

### Get Withdrawn Applications
```http
GET /api/applications/?status=withdrawn
Authorization: Bearer {token}
```

### Check Withdrawal Stats for Opportunity
```python
from edulink.apps.internships.queries import get_withdrawal_stats_for_opportunity

stats = get_withdrawal_stats_for_opportunity(opportunity_id)
# Returns: {
#     "total_applications": 50,
#     "withdrawn_applications": 5,
#     "withdrawal_rate": 10.0
# }
```

## Error Handling Scenarios

| Scenario | Response | Status |
|----------|----------|--------|
| Unauthorized student | "Not authorized to withdraw this application" | 403 |
| Invalid state | "Cannot withdraw from application in {status} status" | 400 |
| Not found | Standard Django 404 | 404 |
| Employer notification fails | Withdrawal succeeds, error logged | 200 |

## Performance Considerations

- **Queries**: Optimized with `select_related()` for withdrawal query functions
- **Notifications**: Employer notification wrapped in try-except to prevent blocking
- **Events**: Async event recording via `record_event()` to ledger
- **Real-time**: Pusher events triggered for immediate UI updates

## Security Considerations

1. **Authorization**: Enforced at both policy and API view levels
2. **Audit Trail**: All withdrawals recorded with actor information
3. **Idempotency**: Notification uses idempotency key to prevent duplicates
4. **State Validation**: Strict state machine prevents invalid transitions

## Future Enhancements

1. **Analytics Dashboard**:
   - Track withdrawal trends by opportunity
   - Identify high-withdrawal-rate positions
   - Student feedback collection

2. **Automated Actions**:
   - Notify supervisors of widespread withdrawals
   - Suggest improvements to opportunity postings
   - Auto-reopen positions after withdrawal

3. **Student Communication**:
   - Email templates customization
   - Withdrawal reason categorization
   - Re-engagement campaigns

4. **Admin Tools**:
   - Bulk withdrawal reversal (if business rule allows)
   - Withdrawal reason analytics
   - Position quality scoring based on withdrawal patterns

## Migration Notes

- No database schema changes required
- Metadata field in existing `application_snapshot` JSON field is used
- Backwards compatible with existing applications
- No data migration needed

## Testing Instructions

### Run All Withdrawal Tests
```bash
pytest edulink/apps/internships/tests/test_withdrawal.py -v
```

### Run Specific Test Class
```bash
pytest edulink/apps/internships/tests/test_withdrawal.py::TestWithdrawalService -v
```

### Run Specific Test
```bash
pytest edulink/apps/internships/tests/test_withdrawal.py::TestWithdrawalService::test_withdraw_from_applied_status -v
```

## Documentation URLs

API Documentation: `/api/docs/internships/applications/withdraw/`
Notification Templates: `templates/notifications/emails/internship_application_withdrawn_employer.html`
