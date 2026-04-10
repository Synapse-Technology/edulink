# Component Migration Examples - Auth/RBAC Refactoring

This document shows before/after examples for common permission patterns found in your codebase.

---

## Example 1: Opportunities.tsx - Student-Only Features

### Before (ANTIPATTERN - Scattered checks)
```typescript
// File: src/pages/Opportunities.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const Opportunities: React.FC = () => {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState([]);

  return (
    <div>
      <h1>Internship Opportunities</h1>
      
      {/* Check 1: Replicates role check */}
      {user?.role === 'student' && (
        <div className="filters">
          <button>View Saved</button>
        </div>
      )}

      <div className="opportunities-grid">
        {opportunities.map(opp => (
          <div key={opp.id} className="opportunity-card">
            <h2>{opp.title}</h2>
            
            {/* Check 2: Same check, different location */}
            {user?.role === 'student' && (
              <>
                <button>Apply Now</button>
                <button>Save for Later</button>
              </>
            )}

            {/* Check 3: Different roles check */}
            {user?.role === 'employer' && (
              <button>View Applications</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### After (BEST PRACTICE - Centralized permissions)
```typescript
// File: src/pages/Opportunities.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RoleBasedAccess } from '../components/auth/RoleBasedAccess';
import { canApplyForInternship } from '../utils/permissions';
import { internshipService } from '../services/internship/internshipService';

export const Opportunities: React.FC = () => {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState([]);

  return (
    <div>
      <h1>Internship Opportunities</h1>
      
      {/* Single source of truth for permission */}
      <RoleBasedAccess roles={['student']} user={user}>
        <div className="filters">
          <button>View Saved</button>
        </div>
      </RoleBasedAccess>

      <div className="opportunities-grid">
        {opportunities.map(opp => (
          <div key={opp.id} className="opportunity-card">
            <h2>{opp.title}</h2>
            
            {/* Reuse centralized permission check */}
            <RoleBasedAccess 
              permission="apply_for_internship"
              user={user}
              fallback={<p>Login as student to apply</p>}
            >
              <>
                <button>Apply Now</button>
                <button>Save for Later</button>
              </>
            </RoleBasedAccess>

            {/* Clear role separation */}
            <RoleBasedAccess roles={['employer']} user={user}>
              <button>View Applications</button>
            </RoleBasedAccess>
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Benefits**:
- ✅ Permission check in ONE place (`canApplyForInternship`)
- ✅ Clear fallback/error message
- ✅ Easy to audit permissions
- ✅ Easier to test and modify

---

## Example 2: OpportunityDetails.tsx - Multiple Roles with Different UX

### Before (ANTIPATTERN)
```typescript
export const OpportunityDetails: React.FC = () => {
  const { user } = useAuth();
  const [opportunity, setOpportunity] = useState(null);

  return (
    <div>
      <h2>{opportunity?.title}</h2>
      
      {/* Check 1: Student apply button */}
      {user?.role === 'student' ? (
        <button onClick={handleApply}>Apply</button>
      ) : null}

      {/* Check 2: Employer view apps */}
      {(user?.role === 'employer' || user?.role === 'employer_admin') && (
        <div>
          <button onClick={viewApplications}>View Applications</button>
          <button onClick={closeOpportunity}>Close Opportunity</button>
        </div>
      )}

      {/* Check 3: Supervisor review */}
      {user?.role === 'supervisor' ? (
        <button onClick={reviewEvidence}>Review Evidence</button>
      ) : null}

      {/* Check 4: Admin controls */}
      {(user?.role === 'system_admin' || user?.role === 'institution_admin') && (
        <button onClick={moderateContent}>Flag/Moderate</button>
      )}
    </div>
  );
};
```

### After (BEST PRACTICE)
```typescript
import { PermissionGate } from '../components/auth/RoleBasedAccess';
import { canApplyForInternship, canReviewEvidence } from '../utils/permissions';

export const OpportunityDetails: React.FC = () => {
  const { user } = useAuth();
  const [opportunity, setOpportunity] = useState(null);

  return (
    <div>
      <h2>{opportunity?.title}</h2>
      
      {/* Student experience */}
      <RoleBasedAccess 
        roles={['student']}
        user={user}
      >
        <button onClick={handleApply} className="btn-primary">
          Apply Now
        </button>
      </RoleBasedAccess>

      {/* Employer experience */}
      <RoleBasedAccess 
        roles={['employer_admin', 'employer']}
        user={user}
      >
        <div className="employer-controls">
          <button onClick={viewApplications}>View Applications</button>
          <button onClick={closeOpportunity}>Close Opportunity</button>
        </div>
      </RoleBasedAccess>

      {/* Supervisor experience */}
      <RoleBasedAccess 
        permission="review_evidence"
        user={user}
      >
        <button onClick={reviewEvidence}>Review Evidence</button>
      </RoleBasedAccess>

      {/* Admin experience */}
      <RoleBasedAccess 
        roles={['system_admin', 'institution_admin']}
        user={user}
      >
        <button onClick={moderateContent} className="btn-danger">
          Flag/Moderate
        </button>
      </RoleBasedAccess>
    </div>
  );
};
```

---

## Example 3: ReviewEvidence.tsx - Permission Gates with Degraded UI

### Before (ANTIPATTERN - All-or-nothing)
```typescript
export const ReviewEvidence: React.FC = () => {
  const { user } = useAuth();
  const [evidence, setEvidence] = useState(null);

  // Complete redirection if not authorized
  if (!user || !['supervisor', 'institution_admin'].includes(user.role)) {
    return <p>You don't have access to review evidence</p>;
  }

  // ... page content
};
```

### After (BEST PRACTICE - Multi-level access)
```typescript
import { PermissionGate } from '../components/auth/RoleBasedAccess';
import { canReviewEvidence } from '../utils/permissions';

export const ReviewEvidence: React.FC = () => {
  const { user } = useAuth();
  const [evidence, setEvidence] = useState(null);

  return (
    <PermissionGate
      user={user}
      full={<ReviewForm />}
      partial={<ReadOnlyReview />}
      none={<UpgradePrompt />}
      fullRoles={['supervisor', 'institution_admin']}
      partialRoles={['employer_admin']}
    />
  );
};

// Supervisor/Institution Admin get full editing capabilities
const ReviewForm = () => (
  <form>
    <textarea placeholder="Your feedback..." />
    <select>
      <option>Approve</option>
      <option>Request Revision</option>
      <option>Reject</option>
    </select>
    <button type="submit">Submit Review</button>
  </form>
);

// Employer admins can only view (read-only)
const ReadOnlyReview = () => (
  <div className="read-only">
    <p>You can view this evidence but cannot submit a review.</p>
    <pre>{JSON.stringify(evidence, null, 2)}</pre>
  </div>
);

// Everyone else
const UpgradePrompt = () => (
  <div className="upgrade-prompt">
    <p>Contact support to gain evidence review access</p>
  </div>
);
```

---

## Example 4: Dashboard Selection - Role-Based Navigation

### Before (ANTIPATTERN)
```typescript
export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return <Redirect to="/login" />;

  if (user.role === 'student') {
    return <StudentDashboard />;
  } else if (user.role === 'employer' || user.role === 'employer_admin') {
    return <EmployerDashboard />;
  } else if (user.role === 'supervisor' || user.role === 'institution_admin') {
    return <InstitutionDashboard />;
  } else if (user.role === 'system_admin') {
    return <AdminDashboard />;
  }

  return <NotFound />;
};
```

### After (BEST PRACTICE - DRY)
```typescript
import { PermissionGate } from '../components/auth/RoleBasedAccess';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return <Redirect to="/login" />;

  return (
    <PermissionGate
      user={user}
      full={<Redirect to="/admin/dashboard" />}
      partial={
        <PermissionGate
          user={user}
          full={<Redirect to="/student/dashboard" />}
          partial={<Redirect to="/employer/dashboard" />}
          none={<Redirect to="/institution/dashboard" />}
          fullRoles={['student']}
        />
      }
      none={<NotFound />}
      fullRoles={['system_admin']}
    />
  );
};
```

Or simpler with a mapping:

```typescript
const DASHBOARD_ROUTES: Record<string, string> = {
  student: '/student/dashboard',
  employer: '/employer/dashboard',
  employer_admin: '/employer/dashboard',
  supervisor: '/institution/dashboard',
  institution_admin: '/institution/dashboard',
  system_admin: '/admin/dashboard',
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const route = user ? DASHBOARD_ROUTES[user.role] : '/login';
  return <Redirect to={route} />;
};
```

---

## Example 5: Button/Action Permissions - ProtectedAction

### Before (ANTIPATTERN)
```typescript
export const ApplicationCard: React.FC = ({ application }) => {
  const { user } = useAuth();

  const handleAccept = async () => {
    if (user?.role !== 'employer_admin') {
      alert('Only employers can accept applications');
      return;
    }
    // ... accept logic
  };

  return (
    <div>
      <h3>{application.student_name}</h3>
      <button 
        onClick={handleAccept}
        disabled={user?.role !== 'employer_admin'}
      >
        Accept Application
      </button>
    </div>
  );
};
```

### After (BEST PRACTICE - Declarative with tooltip)
```typescript
import { ProtectedAction } from '../components/auth/RoleBasedAccess';

export const ApplicationCard: React.FC = ({ application }) => {
  const { user } = useAuth();

  const handleAccept = async () => {
    // No role check needed - component handles it
    // ... accept logic
  };

  return (
    <div>
      <h3>{application.student_name}</h3>
      <ProtectedAction
        role="employer_admin"
        user={user}
        disabledTooltip="Only employers can accept applications"
      >
        <button onClick={handleAccept}>
          Accept Application
        </button>
      </ProtectedAction>
    </div>
  );
};
```

---

## Example 6: Complex Multi-Entity Checks

### Before (ANTIPATTERN)
```typescript
export const AssignSupervisor: React.FC<{ application }> = ({ application }) => {
  const { user } = useAuth();

  const canAssign = () => {
    // Role check
    if (!['institution_admin', 'employer_admin'].includes(user?.role)) {
      return false;
    }

    // Institution check - institution admin can only assign to their students
    if (user.role === 'institution_admin') {
      // How to check if student belongs to this institution?
      // This info isn't even passed in...
      return true;  // Unsafe!
    }

    // Employer check
    if (user.role === 'employer_admin') {
      // Is this application for one of employer's positions?
      // Not checking...
      return true;  // Unsafe!
    }

    return false;
  };

  if (!canAssign()) {
    return <p>You cannot assign supervisors</p>;
  }

  return <AssignForm />;
};
```

### After (BEST PRACTICE - Delegated to backend+service)
```typescript
// New permission service for complex checks
import { authorizationService } from '../services/auth/authorizationService';

export const AssignSupervisor: React.FC<{ application }> = ({ application }) => {
  const { user } = useAuth();
  const [canAssign, setCanAssign] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Backend validates multi-entity logic
        const result = await authorizationService.canAssignSupervisor(
          application.id
        );
        setCanAssign(result);
      } catch (err) {
        setCanAssign(false);
      }
    };

    checkPermission();
  }, [application.id, user?.id]);

  if (!canAssign) {
    return <p>You cannot assign supervisors to this application</p>;
  }

  return <AssignForm />;
};
```

**Backend** (most important):
```python
# backends/policies.py
def can_assign_supervisor(user, application):
    """
    Supervisor assignment requires:
    1. User is institution_admin or employer_admin
    2. If institution_admin: application student is from their institution
    3. If employer_admin: application opportunity is posted by their employer
    """
    if user.role == 'institution_admin':
        return (
            application.opportunity.institution_id == user.institution_id
        )
    elif user.role == 'employer_admin':
        return (
            application.opportunity.employer_id == user.employer_id
        )
    return False
```

---

## Checklist for Component Migration

When refactoring a component:

- [ ] Identify all role/permission checks
- [ ] Map to centralized permission functions
- [ ] Replace inline `if` checks with `RoleBasedAccess`
- [ ] Add fallback UI for unauthorized users
- [ ] Review backend endpoint for matching role checks
- [ ] Add unit tests for permission logic
- [ ] Test with different user roles
- [ ] Document any new permission requirements

---

## Key Principles

1. **Single Source of Truth**: Permission logic in one place
2. **Defense in Depth**: Frontend + Backend enforcement
3. **Clear Fallbacks**: Show helpful message when access denied
4. **Fail Secure**: Deny by default, allow explicitly
5. **Backend Authoritative**: Frontend permissions are UX only

---

**Last Updated**: April 10, 2026
