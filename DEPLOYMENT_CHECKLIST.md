# Phase 2 Deployment Checklist

**Status**: Phase 2 Complete (Code Ready)  
**Target**: Production Deployment  
**Date**: April 11, 2026

---

## Pre-Deployment Tasks

### ✅ Code Implementation (COMPLETE)

- [x] Phase 2.1: Supervisor race condition fix
- [x] Phase 2.2: Evidence state machine implementation
- [x] Phase 2.3: Incident resolution workflow
- [x] Phase 2.4: Supervisor assignment acceptance flow
- [x] All code syntax validated
- [x] No architecture violations
- [x] All imports correct

### ✅ Migrations (COMPLETE)

- [x] 0019_supervisorassignment.py - Create SupervisorAssignment model
- [x] 0020_incident_workflow.py - Upgrade Incident to 6-state
- [x] Evidence migration (0014) - Already in place
- [x] All migrations syntax validated

### ✅ API Layer (COMPLETE)

- [x] SupervisorAssignmentViewSet built
- [x] Serializers created (read, accept, reject)
- [x] Endpoints registered in URL router
- [x] All views syntax validated
- [x] API documentation complete (SUPERVISOR_ASSIGNMENT_API.md)

### ✅ Documentation (COMPLETE)

- [x] Phase 2 completion report (PHASE_2_COMPLETE.md)
- [x] Supervisor Assignment API docs (SUPERVISOR_ASSIGNMENT_API.md)
- [x] Phase 3 planning document (PHASE_3_PLANNING.md)
- [x] This deployment checklist

---

## Deployment Steps

### Step 1: Database Migration

**Requires**: Django environment with database access

```bash
# Navigate to project root
cd /home/bouric/Documents/projects/edulink/edulink

# Apply migrations
python3 manage.py makemigrations internships
python3 manage.py migrate internships

# Verify tables created
python3 manage.py sqlmigrate internships 0019
python3 manage.py sqlmigrate internships 0020
```

**What happens**:
- Creates `internship_supervisor_assignments` table
- Adds indexes on status, application, supervisor_id
- Adds unique constraint on (application, supervisor_id, assignment_type)
- Upgrades Incident model with new fields
- Data migration: Existing incidents remain intact with NULL for new fields

**Estimated Time**: 5-10 minutes

---

### Step 2: Run Tests (Quality Gate)

```bash
# Run all internships tests
python3 manage.py test apps.internships

# Expected: All tests PASS
# If any fail: DO NOT PROCEED - debug and fix
```

**Critical Tests**:
- Phase 2.1: Supervisor locking prevents races
- Phase 2.2: Evidence workflow validates transitions
- Phase 2.3: Incident workflow enforces state machine
- Phase 2.4: Supervisor assignment creates PENDING state

**Estimated Time**: 2-5 minutes

---

### Step 3: Integration Testing (Manual Validation)

```bash
# Test supervisor assignment workflow manually
python3 manage.py shell
```

```python
# Test data setup
from edulink.apps.internships.models import *
from edulink.apps.internships.services import *
from edulink.apps.accounts.models import User
import uuid

# 1. Create test users
admin_user = User.objects.get_or_create(
    id=uuid.uuid4(),
    defaults={"username": "admin_test", "is_institution_admin": True}
)[0]

supervisor_user = User.objects.get_or_create(
    id=uuid.uuid4(),
    defaults={"username": "supervisor_test", "is_supervisor": True}
)[0]

# 2. Create test application
opp = InternshipOpportunity.objects.first()
app = InternshipApplication.objects.create(
    opportunity=opp,
    student_id=uuid.uuid4()
)

# 3. Test create assignment
assignment = create_supervisor_assignment(
    actor=admin_user,
    application_id=app.id,
    supervisor_id=supervisor_user.id,
    assignment_type="EMPLOYER"
)

assert assignment.status == "PENDING"
print("✓ Assignment created in PENDING state")

# 4. Test accept
assignment = accept_supervisor_assignment(supervisor_user, assignment.id)
assert assignment.status == "ACCEPTED"
assert app.employer_supervisor_id == supervisor_user.id
print("✓ Supervisor accepted, application updated")

# 5. Test event recording
from edulink.apps.ledger.models import Event
events = Event.objects.filter(
    event_type__in=[
        "SUPERVISOR_ASSIGNMENT_CREATED",
        "SUPERVISOR_ASSIGNMENT_ACCEPTED"
    ]
)
assert events.count() >= 2
print("✓ Events recorded to ledger")

print("\n✅ All integration tests passed!")
exit()
```

**Expected Output**: All assertions pass, events recorded

**Estimated Time**: 5 minutes

---

### Step 4: API Endpoint Verification

```bash
# Test actual HTTP endpoints
# (Assumes server running on localhost:8000 with JWT auth)

TOKEN="your_jwt_token_here"

# Test list
curl -X GET "http://localhost:8000/api/internships/supervisor-assignments/" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK with empty list (no assignments yet)

# Test detail (assuming assignment ID)
ASSIGNMENT_ID="550e8400-e29b-41d4-a716-446655440001"

curl -X GET "http://localhost:8000/api/internships/supervisor-assignments/$ASSIGNMENT_ID/" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK with assignment details

# Test accept
curl -X POST "http://localhost:8000/api/internships/supervisor-assignments/$ASSIGNMENT_ID/accept/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 200 OK with updated status = "ACCEPTED"

# Test reject
curl -X POST "http://localhost:8000/api/internships/supervisor-assignments/$ASSIGNMENT_ID/reject/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test rejection"}'
# Expected: 200 OK with updated status = "REJECTED"
```

**Estimated Time**: 10 minutes

---

### Step 5: Load Testing (Optional, for Production)

```bash
# Using Apache Bench or similar
ab -n 1000 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/internships/supervisor-assignments/
```

**Look For**:
- No 500 errors
- Response time < 500ms
- Database connections don't exceed limit

**Estimated Time**: 5 minutes

---

## Go/No-Go Checklist

### Before Deployment - Answer ALL

- [ ] All code compiles without errors?
- [ ] All migrations executed successfully?
- [ ] All tests pass?
- [ ] Integration tests manual validation passed?
- [ ] API endpoints responding correctly?
- [ ] Error handling tested (e.g., unauthorized access)?
- [ ] Permissions correctly enforced?
- [ ] Ledger events recorded?
- [ ] Documentation current?
- [ ] Rollback plan documented?

### If Any "NO":
**DO NOT DEPLOY** — Debug and fix first

### If All "YES":
**PROCEED TO DEPLOYMENT** ✅

---

## Deployment

### Production Environment

```bash
# On production server:

# 1. Pull latest code
git pull origin main

# 2. Install any new dependencies (if needed)
pip install -r requirements.txt

# 3. Apply migrations
python manage.py migrate internships

# 4. Run tests in production environment
python manage.py test apps.internships --keepdb

# 5. Collect static files (if changed)
python manage.py collectstatic --noinput

# 6. Restart application server
supervisorctl restart edulink
# or
systemctl restart gunicorn

# 7. Verify deployment
curl -X GET "https://api.example.com/api/internships/supervisor-assignments/" \
  -H "Authorization: Bearer $TOKEN"
```

**Estimated Time**: 10-15 minutes

---

## Post-Deployment Validation

### Login & Test

1. **Log in as Admin**: Create a supervisor assignment
2. **Log in as Supervisor**: See pending assignment, accept/reject it
3. **Check Notifications**: Verify notifications sent
4. **Check Logs**: Verify no errors in application logs

### Monitoring

Set up alerts for:
- HTTP 500 errors
- Database connection errors
- High response times (> 1s)
- Missing events in ledger

### Rollback Plan

If issues occur post-deployment:

```bash
# Revert to previous migration
python manage.py migrate internships 0018

# Revert code
git revert HEAD

# Restart
supervisorctl restart edulink
```

---

## Risk Assessment

### Low Risk ✅

- Phase 2.1 (row locking): Only adds synchronization mechanism
- Phase 2.2 (evidence workflow): Already has dual-review fields
- Phase 2.3 (incident workflow): Extends existing incident model

### Data Safety

- **No data loss**: All migrations are additive only
- **Backward compatible**: Existing code continues to work
- **Atomic transactions**: Either all changes apply or none
- **Easy rollback**: Can revert migration if needed

---

## Success Criteria

### Immediate (First 24 hours)

- ✅ No 500 errors in logs
- ✅ All endpoints responding
- ✅ Supervisor assignments can be created/accepted/rejected
- ✅ Events recorded to ledger
- ✅ Notifications sent

### Short-term (First week)

- ✅ No data corruption or inconsistencies
- ✅ API response times < 500ms
- ✅ No N+1 query problems
- ✅ Users can complete workflows end-to-end

### Long-term (First month)

- ✅ Incident resolution working as designed
- ✅ Evidence review enforcing state machine
- ✅ No race conditions detected
- ✅ Supervisor satisfaction with acceptance workflow

---

## Escalation Path

**If issues occur**:

1. **During deployment**: Abort, rollback, investigate
2. **Post-deployment (minor)**: Log issue, investigate, deploy hotfix
3. **Post-deployment (critical)**: Rollback immediately, then investigate
4. **If data corruption**: Contact database team, check backups

**Contact**:
- Dev Lead: [role/name]
- Database Admin: [role/name]
- Operations: [role/name]

---

## Documentation for Operations

### Deployment Notes
- Phase 2.4 adds supervisor assignment workflow
- Migrations required before new API endpoints work
- No configuration changes needed
- Database: Read-only (existing), Write (new tables)

### Monitoring Points
- `/api/internships/supervisor-assignments/` endpoint
- `internship_supervisor_assignments` table growth
- Event ledger for assignment workflow events

### Troubleshooting
- **API 404**: Ensure migrations applied
- **API 403**: Check user permissions and roles
- **Missing notifications**: Check notification service integration
- **Slow queries**: Check indexes were created

---

## Timeline Summary

| Phase | Time | Status |
|-------|------|--------|
| Pre-deployment setup | 5 min | Ready |
| Database migration | 10 min | Ready |
| Integration testing | 15 min | Ready |
| Deployment | 15 min | Ready |
| Post-deployment validation | 10 min | Ready |
| **TOTAL** | **~1 hour** | **Go** |

---

## Sign-off

**Code Author**: [Copilot]  
**Code Review**: [Pending]  
**QA Team**: [Pending]  
**Operations**: [Pending]  
**Product**: [Pending]

**Approval to Deploy**: ☐ (Requires all sign-offs)

---

**Last Updated**: April 11, 2026  
**Status**: Ready for Deployment (Pending Approvals)

