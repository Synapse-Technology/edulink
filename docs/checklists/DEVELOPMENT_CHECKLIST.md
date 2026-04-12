# 🎯 Frontend Auth/RBAC Development Checklist

## Phase 1: Critical Fixes ✅ COMPLETE

### Bug Fixes
- [x] Fix AdminRouteGuards localStorage key extraction
- [x] Fix PendingAffiliations fetch() calls (3 locations)
- [x] Verify admin portal access
- [x] Verify pending affiliations page load

### New Utilities Created
- [x] Create permissions.ts (23+ functions)
- [x] Create RoleBasedAccess.tsx (5 components)
- [x] Add comprehensive JSDoc documentation
- [x] Add TypeScript types for all new exports

### Backend Verification
- [x] Verify apply_for_internship() role check
- [x] Verify submit_evidence() role check
- [x] Verify review_evidence() role check
- [x] Verify create_incident() role check
- [x] Verify resolve_incident() role check
- [x] Confirm policy.py enforcement in place

### Documentation
- [x] Create implementation guide
- [x] Create component migration examples
- [x] Create summary document
- [x] Create this checklist

**Phase 1 Status**: ✅ **COMPLETE** - Ready for deployment

---

## Phase 2: Component Migration 🔄 RECOMMENDED

### High Priority (Component Refactor)
- [ ] Migrate **Opportunities.tsx**
  - [ ] Replace scattered role checks with centralized permissions
  - [ ] Use RoleBasedAccess for student-only features
  - [ ] Add loading/error states
  - [ ] Test with different user roles
  - [ ] Verify filtering still works

- [ ] Migrate **OpportunityDetails.tsx**
  - [ ] Replace multiple role conditionals with PermissionGate
  - [ ] Use ProtectedAction for modify buttons
  - [ ] Handle partial views gracefully
  - [ ] Test apply, edit, publish flows

- [ ] Migrate **StudentApplications.tsx**
  - [ ] Consolidate permission checks
  - [ ] Use centralized permissions for status filters
  - [ ] Test student-only access

- [ ] Migrate **EmployerDashboard.tsx**
  - [ ] Replace employer role checks with centralized utility
  - [ ] Use RoleBasedAccess for dashboard sections
  - [ ] Verify employer_admin access

- [ ] Migrate **InstitutionDashboard.tsx**
  - [ ] Replace institution role checks
  - [ ] Use RoleBasedAccess for institution sections
  - [ ] Verify institution_admin access

### Testing for Phase 2
- [ ] Unit tests for components (5+ tests per component)
- [ ] Integration tests for role-based rendering
- [ ] User acceptance testing with each role
- [ ] Cross-browser testing

### Documentation for Phase 2
- [ ] Update Component style guide with permission examples
- [ ] Create migration runbook for team
- [ ] Document common mistakes/gotchas

**Estimated Effort**: 2-3 weeks  
**Risk Level**: 🟢 LOW (Mutations are isolated, can be tested thoroughly)

---

## Phase 3: Enhanced Standardization ⏳ OPTIONAL

### Auth Pattern Unification
- [ ] Unify admin auth with regular auth
  - [ ] Move admin to Zustand store (currently localStorage only)
  - [ ] Use same token refresh mechanism
  - [ ] Align storage keys (currently inconsistent)
  - [ ] Reduce code duplication in service layer

### Admin Improvements
- [ ] Create AdminPermissions enum (constants for all admin roles)
- [ ] Add admin role display names (for UI dropdowns)
- [ ] Create admin permission matrix visualization
- [ ] Test all 4 admin role combinations

### Audit & Compliance
- [ ] Add permission change audit logging
- [ ] Create permission audit viewer
- [ ] Document permission assumptions
- [ ] Export permission matrix report

### Security Hardening
- [ ] Implement token rotation policy
- [ ] Add CSRF token handling (if not present)
- [ ] Review localStorage security practices
- [ ] Consider httpOnly cookies for tokens (future)

**Estimated Effort**: 3-4 weeks  
**Risk Level**: 🟡 MEDIUM (Larger refactor, requires UAT)

---

## Testing Coverage Checklist

### Unit Tests (permissions.ts)
```typescript
// Create: src/utils/__tests__/permissions.test.ts
- [ ] canApplyForInternship - student can, others can't
- [ ] canReviewEvidence - supervisor/admin can, others can't
- [ ] canCreateOpportunity - employer can, others can't
- [ ] canManageApplications - employer_admin can, others can't
- [ ] hasRole - correctly identifies user roles
- [ ] hasAnyPermission - OR logic works
- [ ] hasAllPermissions - AND logic works
- [ ] Admin role functions (8 tests)
- [ ] Edge cases (null user, missing roles, etc.)
```

### Integration Tests (RoleBasedAccess.tsx)
```typescript
// Create: src/components/auth/__tests__/RoleBasedAccess.test.tsx
- [ ] RoleBasedAccess renders children when authorized
- [ ] RoleBasedAccess renders fallback when unauthorized
- [ ] AdminRoleBasedAccess checks admin roles
- [ ] RequireExactRole enforces single role only
- [ ] ProtectedAction disables button when unauthorized
- [ ] PermissionGate renders correct level (full/partial/none)
- [ ] Components handle null user gracefully
```

### Component Tests
```typescript
// Create: src/pages/__tests__/Opportunities.test.tsx (example)
- [ ] Student can see apply button
- [ ] Non-student sees login prompt
- [ ] Employer cannot apply
- [ ] Deadline filtering works
- [ ] Expired opportunities hidden from students
```

### E2E Tests (Optional)
```
- [ ] Admin login → access admin portal (/admin)
- [ ] Admin denied when role changed
- [ ] Student apply flow with permissions
- [ ] Supervisor review evidence with permissions
- [ ] Employer view their opportunities
- [ ] Cross-role access attempts blocked
```

---

## Code Review Checklist

When reviewing Phase 2+ changes:

- [ ] All inline role checks replaced with centralized utilities
- [ ] No hardcoded role strings (use constants)
- [ ] All conditional renders use RoleBasedAccess or similar
- [ ] Error messages are user-friendly
- [ ] Loading states handled properly
- [ ] No console errors
- [ ] API errors include helpful context
- [ ] Tests cover happy path + error paths
- [ ] JSDoc updated with new component usage
- [ ] No duplicate permission logic

---

## Deployment Checklist

### Pre-Deployment (Phase 1)
- [x] Code reviewed and approved
- [x] All critical fixes tested
- [x] Backend role checks verified
- [x] Documentation complete
- [x] No console errors in admin portal
- [x] No console errors in pending affiliations

### Deployment Process
- [ ] Create release branch
- [ ] Run full test suite
- [ ] Deploy to staging environment
- [ ] Admin team tests admin portal
- [ ] Admin team tests pending affiliations
- [ ] Run Lighthouse/performance audit
- [ ] Deploy to production during off-peak hours

### Post-Deployment
- [ ] Monitor logs for errors
- [ ] Check admin portal functionality (30 min)
- [ ] Check pending affiliations (30 min)
- [ ] Verify new components in other roles
- [ ] Create postmortem if any issues

---

## Quick Reference for Developers

### Using permissions.ts
```typescript
import { canApplyForInternship, hasRole, getUserPermissions } from '@/utils/permissions';

// Simple check
if (!canApplyForInternship(user)) return <LoginPrompt />;

// Multiple roles
if (!hasRole(user, ['student', 'supervisor'])) return <Denied />;

// Get all permissions for user
const perms = getUserPermissions(user);
```

### Using RoleBasedAccess
```typescript
import { 
  RoleBasedAccess, 
  ProtectedAction, 
  PermissionGate 
} from '@/components/auth/RoleBasedAccess';

// Conditional render
<RoleBasedAccess roles={['student']} fallback={<LoginMsg />}>
  <ApplyButton />
</RoleBasedAccess>

// Disable button
<ProtectedAction permission="apply_for_internship">
  <button>Apply</button>
</ProtectedAction>

// Multi-level access
<PermissionGate
  full={<AdminPanel />}
  partial={<ReadOnly />}
  none={<Upgrade />}
  fullRoles={['admin']}
/>
```

---

## Known Issues & Workarounds

### Issue: Admin user stored in localStorage as JSON
**Status**: ✅ FIXED in AdminRouteGuards.tsx  
**Workaround**: Use getAdminRole() helper from AdminRouteGuards  
**Long-term**: Move admin auth to Zustand (Phase 3)

### Issue: Token key inconsistency (regular vs admin users)
**Status**: ✅ MITIGATED via apiClient for regular flows  
**Workaround**: Admin routes now use localStorage directly (expected pattern)  
**Long-term**: Unify auth patterns in Phase 3

### Issue: Scattered permission logic across components
**Status**: ✅ ADDRESSED with centralized utilities  
**Workaround**: Use permissions.ts and RoleBasedAccess for new code  
**Long-term**: Migrate all components in Phase 2

---

## Resources & Documentation

### For Development
- 📖 [FRONTEND_AUTH_RBAC_IMPLEMENTATION.md](FRONTEND_AUTH_RBAC_IMPLEMENTATION.md) - Full guide
- 🔍 [COMPONENT_MIGRATION_EXAMPLES.md](COMPONENT_MIGRATION_EXAMPLES.md) - Before/after examples
- 📋 [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) - Summary

### For Architecture
- 🏗️ [EDULINK_DJANGO_ARCHITECTURE_RULES.md](docs/EDULINK_DJANGO_ARCHITECTURE_RULES.md) - Backend rules
- 🏗️ [APP_LAYER_RULE.md](docs/APP_LAYER_RULE.md) - Frontend rules

### Utility Files
- 🔐 [src/utils/permissions.ts](edulink-frontend/src/utils/permissions.ts) - Permission functions
- 🔐 [src/components/auth/RoleBasedAccess.tsx](edulink-frontend/src/components/auth/RoleBasedAccess.tsx) - Components
- 🔒 [src/services/api/client.ts](edulink-frontend/src/services/api/client.ts) - API client

---

## Questions & Support

### "How do I check if a user can do X?"
→ See [FRONTEND_AUTH_RBAC_IMPLEMENTATION.md](FRONTEND_AUTH_RBAC_IMPLEMENTATION.md) "How to Use New Utilities" section

### "How do I migrate component Y?"
→ Find similar component in [COMPONENT_MIGRATION_EXAMPLES.md](COMPONENT_MIGRATION_EXAMPLES.md)

### "What about admin roles?"
→ See AdminPermissions functions in permissions.ts + AdminRoleBasedAccess component

### "Is the backend enforcing roles?"
→ Yes! See [FRONTEND_AUTH_RBAC_IMPLEMENTATION.md](FRONTEND_AUTH_RBAC_IMPLEMENTATION.md) "Backend Role Enforcement Audit" section

### "When should I use RoleBasedAccess vs permissions.ts?"
→ Use RoleBasedAccess for conditional rendering in JSX  
→ Use permissions.ts for business logic checks in functions/hooks

---

## Contact

**Questions about Phase 1?**  
→ Review [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)

**Questions about Phase 2 migration?**  
→ See [COMPONENT_MIGRATION_EXAMPLES.md](COMPONENT_MIGRATION_EXAMPLES.md)

**Questions about specific components?**  
→ Check JSDoc comments in permissions.ts and RoleBasedAccess.tsx

---

**Last Updated**: April 10, 2026  
**Phase 1**: ✅ COMPLETE and PRODUCTION READY  
**Phase 2**: 🔄 RECOMMENDED for next sprint  
**Phase 3**: ⏳ OPTIONAL for future enhancement

