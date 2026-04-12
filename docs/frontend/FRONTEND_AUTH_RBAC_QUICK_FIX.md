# Frontend Auth/RBAC - Quick Fix Guide

## 🔴 CRITICAL BUGS (Fix Today)

### BUG #1: AdminRouteGuards - localStorage Key Mismatch
**File**: `src/components/admin/AdminRouteGuards.tsx` (Lines 6-7, 19-20)  
**Issue**: Checks for `adminRole` key that's never stored

```typescript
// ❌ BROKEN
const adminRole = localStorage.getItem('adminRole');  // Always null!

// ✅ FIX - Replace both AdminPublicRoute and AdminProtectedRoute functions:
const getAdminRole = (): string | null => {
  try {
    const adminUserStr = localStorage.getItem('adminUser');
    if (!adminUserStr) return null;
    const adminUser = JSON.parse(adminUserStr);
    return adminUser.role || adminUser.platform_staff_role;
  } catch {
    return null;
  }
};

export const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  const adminRole = getAdminRole();
  
  if (!adminToken || !adminRole) {
    return <Navigate to="/admin/login" replace />;
  }
  
  const validAdminRoles = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'MODERATOR', 'AUDITOR'];
  if (!validAdminRoles.includes(adminRole)) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
};

export const AdminPublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  const adminRole = getAdminRole();
  
  if (adminToken && adminRole) {
    return <Navigate to="/admin" replace />;
  }
  
  return <>{children}</>;
};
```

**Testing**: 
- [ ] Login as admin
- [ ] Verify route guards work
- [ ] Verify redirect to admin dashboard

---

### BUG #2: PendingAffiliations - Wrong localStorage Key
**File**: `src/components/admin/PendingAffiliations.tsx` (Lines 44, 70, 99)  
**Issue**: Retrieves `access_token` key (doesn't exist), should use API client

```typescript
// ❌ BROKEN - This key never exists!
'Authorization': `Bearer ${localStorage.getItem('access_token')}`,

// ✅ FIX - Option 1 (RECOMMENDED): Use API Client
// Add to imports:
import { apiClient } from '../../services/api/client';

// Replace fetch calls with:
const fetchPendingAffiliations = async () => {
  try {
    setLoading(true);
    setError(null);
    
    let url = '/api/student-affiliations/pending/';
    if (institutionId) {
      url += `?institution_id=${institutionId}`;
    }
    
    const data = await apiClient.get(url);  // ← Use API client
    setAffiliations(data.pending_affiliations || data.results || data);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
  } finally {
    setLoading(false);
  }
};

// Replace both handleApprove and handleReject fetch calls similarly:
const handleApprove = async (affiliationId: string, reviewNotes: string = '') => {
  try {
    setProcessingId(affiliationId);
    await apiClient.post(`/api/student-affiliations/${affiliationId}/approve/`, 
      { review_notes: reviewNotes }
    );
    setAffiliations(prev => prev.filter(a => a.id !== affiliationId));
    showSuccess('Affiliation Approved', '...');
  } catch (err: any) {
    showError('Approval Failed', '...', err.message);
  } finally {
    setProcessingId(null);
  }
};
```

**Testing**:
- [ ] Load pending affiliations page
- [ ] Verify data loads correctly
- [ ] Approve/reject affiliations
- [ ] Check network tab for correct 'Authorization' header

---

### BUG #3: Verify Backend Enforces Role Checks
**Files to Check**: Backend views in `edulink/apps/`

```python
# VERIFY: /internships/apply endpoint checks user role
# File: edulink/apps/internships/views.py

class InternshipViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        # ✅ MUST have role check:
        if request.user.role != 'student':
            raise PermissionDenied("Only students can apply")
        # ... rest of logic

# VERIFY: All protected endpoints have permission checks
# Example from internships/policies.py:
def can_apply_for_internship(user, opportunity):
    if user.role != 'student':
        return False
    # ... other checks
    return True
```

✅ Checklist:
- [ ] Check `/api/internships/{id}/apply/` - student role check
- [ ] Check `/api/applications/{id}/review-evidence/` - supervisor role check
- [ ] Check `/api/applications/{id}/process-application/` - employer/institution admin check
- [ ] Check `/api/admin/*` - system admin role check

---

## 🟠 HIGH PRIORITY (Fix This Week)

### Create Centralized Permission Utils
**New File**: `src/utils/permissions.ts`

```typescript
import type { User } from '../types';
import type { AdminUser } from '../contexts/AdminAuthContext';

// User Role Permissions
export const canApplyForInternship = (user: User | null): boolean => {
  return user?.role === 'student';
};

export const canReviewEvidence = (user: User | null): boolean => {
  return ['supervisor', 'institution_admin', 'employer_admin'].includes(user?.role);
};

export const canManageEmployer = (user: User | null): boolean => {
  return ['employer_admin', 'institution_admin'].includes(user?.role);
};

export const canAccessAdminPanel = (user: User | null): boolean => {
  return user?.role === 'system_admin';
};

// Admin Role Permissions
export const canManageUsers = (admin: AdminUser | null): boolean => {
  return admin && ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(admin.role);
};

export const canManageInstitutions = (admin: AdminUser | null): boolean => {
  return admin && ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(admin.role);
};

export const canViewAuditLogs = (admin: AdminUser | null): boolean => {
  return admin && ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'AUDITOR'].includes(admin.role);
};

// Dynamic Checks (based on user's institution/employer)
export const canViewStudent = (currentUser: User, targetUserId: string): boolean => {
  // Institution admins can view their students
  // System admins can view all students
  return (
    currentUser.role === 'system_admin' ||
    (currentUser.role === 'institution_admin' && 
     currentUser.institution_id === targetUser.institution_id)
  );
};
```

**Usage**: 
```typescript
// In components:
import { canApplyForInternship } from '../../utils/permissions';

if (!canApplyForInternship(user)) {
  toast.error('Only students can apply for internships');
  return;
}
```

---

### Remove Hardcoded Role Checks
**Files to Update**:
1. `src/pages/Opportunities.tsx` (Line 120)
2. `src/pages/OpportunityDetails.tsx` (Line 54)

```typescript
// ❌ BEFORE
if (user.role !== 'student') {
  toast.error('Only students can apply for internships');
  return;
}

// ✅ AFTER
import { canApplyForInternship } from '../../utils/permissions';

if (!canApplyForInternship(user)) {
  toast.error('Only students can apply for internships');
  return;
}
```

---

### Document Admin Auth System (Until Consolidated)
**New File**: `src/contexts/README.md`

```markdown
# Authentication Contexts

## Regular Users (Student/Employer/Institution)
- **Location**: `authStore.ts` (Zustand) + `AuthContext.tsx` (wrapper)
- **Storage**: `localStorage['auth-storage']`
- **State**: `user.role` = 'student' | 'employer' | 'institution' | ...

## Admin Users (System Admin)
- **Location**: `AdminAuthContext.tsx` 
- **Storage**: Separate keys: `adminToken`, `adminUser`, `adminRefreshToken`
- **State**: `admin.role` = 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | ...

## Accessing Auth
```typescript
// Regular users
const { user, isAuthenticated } = useAuthStore();
const { user, isAuthenticated } = useAuth();  // Also via context

// Admin users
const { admin, isAuthenticated } = useAdminAuth();
```

## TODO: Consolidation
- [ ] Merge AdminAuthContext into unified Zustand store
- [ ] Use single localStorage key for all auth types
- [ ] Discriminate user type via `user.userType` field
```

---

## 🟡 MEDIUM PRIORITY (Plan for Next Sprint)

### Consolidate Auth Systems
1. Create new unified store in `authStore.ts`
2. Support both regular and admin user types
3. Migrate admin auth to use unified store
4. Remove duplicate AdminAuthContext

### Audit All API Endpoints
- [ ] List all endpoints requiring role checks
- [ ] Verify backend has permission decorator
- [ ] Add tests for each permission scenario

### Improve Token Handling
- [ ] Add token expiry warning UI
- [ ] Better cross-tab synchronization
- [ ] Token rotation support documentation

---

## ✅ VERIFICATION CHECKLIST

### Before Committing Fixes
- [ ] AdminRouteGuards correctly parses adminUser from localStorage
- [ ] PendingAffiliations uses API client for all requests
- [ ] API client auth header is set correctly
- [ ] All 401 responses trigger token refresh
- [ ] Logout clears both regular + admin auth
- [ ] No direct `fetch()` calls with hardcoded tokens remain
- [ ] Mocked backend returns 403 for role violations
- [ ] Frontend gracefully handles permission denied errors

### Testing Commands
```bash
# Run auth tests
npm test -- auth

# Check for localStorage access patterns
grep -r "localStorage.getItem('access" src/
grep -r "localStorage.getItem('adminRole" src/

# Check for direct fetch calls
grep -r "fetch(" src/ | grep -v "node_modules"
```

---

## 📋 Implementation Order

### Day 1 (CRITICAL)
1. [ ] Fix AdminRouteGuards.tsx (BUG #1)
2. [ ] Fix PendingAffiliations.tsx (BUG #2)  
3. [ ] Test both fixes
4. [ ] Commit

### Day 2 (VERIFICATION)
1. [ ] Backend role check audit (BUG #3)
2. [ ] Create test cases for each endpoint
3. [ ] Document findings

### Week 2 (HIGH PRIORITY)
1. [ ] Create permissions.ts utility
2. [ ] Replace hardcoded role checks
3. [ ] Add unit tests
4. [ ] Code review + merge

### Week 3+ (MEDIUM PRIORITY)
1. [ ] Plan consolidation of auth systems
2. [ ] Implement unified store
3. [ ] Migrate admin auth
4. [ ] Remove duplicate code

---

## 📚 References

- **Full Report**: [FRONTEND_AUTH_RBAC_REPORT.md](../FRONTEND_AUTH_RBAC_REPORT.md)
- **Session Analysis**: Check session memory for detailed findings
- **Related User Pattern**: "Frontend auth UX: preserve ApiError instances when rethrowing"

