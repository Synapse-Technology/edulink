# Frontend Auth/RBAC - Visual Reference Guide

## 1. AUTHENTICATION FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                       USER VISITS APPLICATION                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ Has Token in    │
                    │ localStorage?   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
    NO  │                    │ YES                │ (First visit)
        │                    │                    │
        ▼                    ▼                    ▼
    ┌────────┐        ┌──────────────┐      ┌──────────┐
    │ Show   │        │ Hydrate      │      │ Show     │
    │ Login  │        │ Zustand from  │      │ Loading  │
    │ Page   │        │ localStorage  │      │ Screen   │
    └────┬───┘        └──────┬───────┘      └────┬─────┘
         │                   │                    │
         │                   ▼                    │
         │            ┌───────────────┐           │
         │            │ Verify Token  │           │
         │            │ Valid?        │           │
         │            └───┬───────┬───┘           │
         │                │       │               │
         │            YES │       │ NO            │
         │                │       │               │
         │                │       │               │ (Auto-refresh if possible)
         │                │       ▼               │
         │                │   ┌────────────────┐ │
         │                │   │ Force Logout   │ │
         │                │   │ Redirect to    │ │
         │                │   │ Login          │ │
         │                │   └────────────────┘ │
         │                │                      │
         │            ┌───▼──────────────────────┘
         │            │
         │            ▼
    ┌────▼────────────────────┐
    │ Get Initial User State  │
    │ (from store or API)     │
    └────┬────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │ Verify User Role        │
    │ - student               │
    │ - employer              │
    │ - institution           │
    │ - admin (separate)      │
    └────┬────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │ Render Role-Specific    │
    │ Dashboard               │
    │ (StudentDashboard...)   │
    └─────────────────────────┘
```

---

## 2. TOKEN LIFECYCLE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TOKEN LIFECYCLE                                   │
│                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐         │
│  │ LOGIN    │──▶│ STORE IN │──▶│ SEND IN  │──▶│ API      │         │
│  │ SUBMIT   │   │ ZUSTAND  │   │ REQUESTS │   │ ACCEPTS  │         │
│  │ FORM     │   │ + LOCAL  │   │ WITH     │   │ REQUEST  │         │
│  │          │   │ STORAGE  │   │ HEADER   │   │          │         │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘         │
│                                                   │                  │
│                           ┌───────────────────────┘                  │
│                           │                                          │
│                      Time Passes...                                  │
│                           │                                          │
│                           ▼                                          │
│                  ┌──────────────────┐                                │
│                  │ Token Expires    │                                │
│                  │ API returns 401  │                                │
│                  │ Unauthorized     │                                │
│                  └────────┬─────────┘                                │
│                           │                                          │
│         ┌─────────────────┴─────────────────┐                      │
│         │                                   │                       │
│         ▼                                   ▼                       │
│    ┌──────────────┐                  ┌──────────────┐              │
│    │ Auto-Refresh │                  │ Show Error   │              │
│    │ Using        │                  │ Check Token  │              │
│    │ Refresh      │                  │ Only if Tab  │              │
│    │ Token        │                  │ in Focus     │              │
│    └────┬─────────┘                  └──────────────┘              │
│         │                                                            │
│         ▼                                                            │
│    ┌──────────────────────┐                                         │
│    │ navigator.locks      │                                         │
│    │ ('auth_refresh_lock')│                                         │
│    │ Sync across tabs     │                                         │
│    └────┬─────────────────┘                                         │
│         │                                                            │
│         ▼                                                            │
│    ┌──────────────────────────┐                                     │
│    │ POST /auth/token/refresh/│                                     │
│    │ with refresh token       │                                     │
│    └────┬─────────────────────┘                                     │
│         │                                                            │
│    ┌────▼──────────────────┐                                        │
│    │ Response: new access  │                                        │
│    │ token (+ refresh?)    │                                        │
│    └────┬──────────────────┘                                        │
│         │                                                            │
│         ▼                                                            │
│    ┌──────────────────────┐                                         │
│    │ Update Zustand +     │                                         │
│    │ localStorage         │                                         │
│    └────┬─────────────────┘                                         │
│         │                                                            │
│         ▼                                                            │
│    ┌──────────────────────┐                                         │
│    │ Retry Original       │                                         │
│    │ Request with New     │                                         │
│    │ Token                │                                         │
│    └────┬─────────────────┘                                         │
│         │                                                            │
│         ▼                                                            │
│    ┌──────────────────────┐                                         │
│    │ Query Succeeds       │                                         │
│    │ Continue App         │                                         │
│    │ Usage                │                                         │
│    └──────────────────────┘                                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. USER ROLE HIERARCHY

```
                    ┌─────────────────┐
                    │  All Users      │
                    │   (Logged In)   │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┬──────────────────┐
          │                  │                  │                  │
          ▼                  ▼                  ▼                  ▼
     ┌─────────┐        ┌──────────┐    ┌────────────┐      ┌──────────┐
     │ STUDENT │        │ EMPLOYER │    │ INSTITUTION│      │ ADMIN    │
     └────┬────┘        └────┬─────┘    └─────┬──────┘      └────┬─────┘
          │                  │                  │                  │
   Role: 'student'    Role: 'employer'  Role: 'institution' Role: UNION
          │                  │                  │
          │            ┌─────┴──────┐           │
          │            │            │           │
          ▼            ▼            ▼           ▼
   ┌─────────────┐  ┌──────────┐ ┌─────────────────────┐  ┌───────────────┐
   │ Browse      │  │ Post     │ │ Admin               │  │ SUPER_ADMIN   │
   │ Apps        │  │ Opps     │ │ (Institution Admin) │  │ PLATFORM_ADMIN│
   │ Apply       │  │ Review   │ │                     │  │ MODERATOR     │
   │ Apps        │  │ Apps     │ │ Can manage:         │  │ AUDITOR       │
   │ Upload      │  │ Assign   │ │ - Students          │  │               │
   │ Evidence    │  │ Super    │ │ - Employers         │  │ Access to:    │
   │ Track       │  │ visors   │ │ - Opportunities     │  │ - All data    │
   │ Internship  │  │ Review   │ │ - Applications      │  │ - Staff mgmt  │
   │             │  │ Evidence │ │ - Supervisors       │  │ - Audit logs  │
   │             │  │          │ │                     │  │ - Analytics   │
   └─────────────┘  └──────────┘ └─────────────────────┘  └───────────────┘
          │                │                   │                  │
          │                │                   │                  │
   Dashboard:        Dashboard:        Dashboard:          Dashboard:
   /dashboard/       /employer/        /dashboard/         /admin
   student           dashboard         institution
          │                │                   │                  │
          └────────────────┴───────────────────┴──────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Role-Specific  │
                    │  UI/Routes      │
                    │  Permission     │
                    │  Checks         │
                    └─────────────────┘
```

---

## 4. AUTHENTICATION STORAGE COMPARISON

```
┌────────────────────────────────────────────────────────────────────────┐
│                  Regular User (Student/Employer/Institution)           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  localStorage['auth-storage'] = {                                      │
│    "state": {                                                           │
│      "user": {                                                          │
│        "id": "uuid-123",                                                │
│        "email": "student@example.com",                                  │
│        "firstName": "John",                                             │
│        "lastName": "Doe",                                               │
│        "role": "student",              ← ROLE HERE                      │
│        "trustLevel": 5,                                                 │
│        "institution_id": "uuid-456"                                     │
│      },                                                                 │
│      "accessToken": "eyJhbGciOiJIUzI1NiIs...",                          │
│      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",                        │
│      "isAuthenticated": true                                            │
│    },                                                                   │
│    "version": 0                                                         │
│  }                                                                      │
│                                                                         │
│  Managed by: Zustand (authStore.ts)                                    │
│  Accessed via: useAuthStore() hook                                     │
│  Persisted: Automatic (middleware)                                     │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                        Admin User (System Admin)                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  localStorage['adminToken'] = "eyJhbGciOiJIUzI1NiIs..."               │
│                                                                         │
│  localStorage['adminUser'] = {                                         │
│    "id": "uuid-789",                                                    │
│    "email": "admin@example.com",                                        │
│    "first_name": "Admin",                                               │
│    "last_name": "User",                                                 │
│    "role": "SUPER_ADMIN",              ← ROLE HERE                      │
│    "platform_staff_role": "SUPER_ADMIN",  (also here)                   │
│    "permissions": [                                                     │
│      "user_management",                                                 │
│      "institution_management",                                          │
│      "analytics",                                                       │
│      "audit_logs"                                                       │
│    ],                                                                   │
│    "createdAt": "2026-01-01",                                           │
│    "lastLogin": "2026-04-10"                                            │
│  }                                                                      │
│                                                                         │
│  localStorage['adminRefreshToken'] = "eyJhbGciOiJIUzI1NiIs..."        │
│                                                                         │
│  Managed by: AdminAuthContext (manual)                                 │
│  Accessed via: useAdminAuth() hook                                     │
│  Persisted: Manual localStorage operations                             │
│                                                                         │
│  ⚠️  BUG: AdminRouteGuards looks for 'adminRole' key                    │
│      (doesn't exist - role is inside adminUser object)                 │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. COMPONENT ROLE CHECK PATTERNS

```
┌─ Route Level ──────────────────────────────────────────────────────┐
│                                                                     │
│  <ProtectedRoute role="student">                                   │
│    <StudentDashboard />                                            │
│  </ProtectedRoute>                                                 │
│                                                                     │
│  ✓ Checks isAuthenticated                                          │
│  ✓ Checks user role matches                                        │
│  ✗ Redirects to wrong dashboard if role mismatch                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─ Component Level ──────────────────────────────────────────────────┐
│                                                                     │
│  const initiateApply = () => {                                     │
│    if (user.role !== 'student') {  ← Hardcoded check              │
│      toast.error('Only students can apply');                       │
│      return;                                                        │
│    }                                                                │
│    // Show apply modal...                                          │
│  };                                                                 │
│                                                                     │
│  ✓ User sees error message                                         │
│  ✓ UI prevents action                                              │
│  ✗ Backend must STILL enforce (can't rely on frontend)             │
│                                                                     │
│  BETTER: Use permission utility                                    │
│  if (!canApplyForInternship(user)) {...}                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─ Conditional Rendering ─────────────────────────────────────────────┐
│                                                                      │
│  {user?.role === 'supervisor' && <ReviewSection />}                │
│  {user?.role === 'institution_admin' && <ManagementPanel />}       │
│  {user?.role === 'student' && <ApplicationsPanel />}               │
│                                                                      │
│  ✓ Simple toggle                                                    │
│  ✓ Easy to understand                                               │
│  ✗ Not centralized                                                  │
│  ✗ Hard to audit across codebase                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─ Dynamic Layout ────────────────────────────────────────────────────┐
│                                                                      │
│  switch(user.role) {                                                │
│    case 'student': return <StudentLayout />;                        │
│    case 'employer': return <EmployerLayout />;                      │
│    case 'supervisor': return <SupervisorLayout />;                  │
│    // ...                                                            │
│  }                                                                   │
│                                                                      │
│  ✓ Clear separation per role                                        │
│  ✓ Different layouts for different portals                          │
│  ✓ Matches business model                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. CRITICAL BUGS - BEFORE/AFTER

### Bug #1: AdminRouteGuards

```
BEFORE (BROKEN):
═══════════════════════════════════════════════════════════════════════

localStorage.setItem('adminUser', JSON.stringify({
  role: 'SUPER_ADMIN',
  ...
}));

// Later, in AdminRouteGuards.tsx:
const adminRole = localStorage.getItem('adminRole');  // ❌ null!

if (!adminRole) return <Navigate to="/admin/login" />;  // Always redirects!


AFTER (FIXED):
═══════════════════════════════════════════════════════════════════════

const getAdminRole = () => {
  const adminUserStr = localStorage.getItem('adminUser');
  if (!adminUserStr) return null;
  const { role, platform_staff_role } = JSON.parse(adminUserStr);
  return role || platform_staff_role;  // ✓ Extracts correctly
};

// Later, in AdminRouteGuards.tsx:
const adminRole = getAdminRole();

if (adminRole && validRoles.includes(adminRole)) {
  return <>{children}</>;  // ✓ Renders correctly
}
```

---

### Bug #2: PendingAffiliations

```
BEFORE (BROKEN):
═══════════════════════════════════════════════════════════════════════

const fetchPendingAffiliations = async () => {
  const response = await fetch('/api/student-affiliations/pending/', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,  ❌
    }                                           ↑ This key doesn't exist!
  });
};

// API Request fails with 401 (no token)
// Backend returns "Unauthorized - missing token"


AFTER (FIXED - Using API Client):
═══════════════════════════════════════════════════════════════════════

import { apiClient } from '../../services/api/client';

const fetchPendingAffiliations = async () => {
  const data = await apiClient.get('/api/student-affiliations/pending/');  ✓
  // API client automatically adds correct token from Zustand store
};

// API Request succeeds with valid token!
// Backend processes and returns data
```

---

## 7. PERMISSION CHECKING FLOW

```
┌────────────────────────────────────────────────────────────────┐
│                    User Action Triggered                        │
│                  (e.g., Click "Apply")                         │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
    ┌─────────────────────┐
    │ Check Frontend      │
    │ Permissions         │
    │                     │
    │ if (!canApply(...)) │
    │   return            │
    └────────┬────────────┘
             │
        YES  │  (User has permission)
             ▼
    ┌─────────────────────────────────┐
    │ Show UI Component                │
    │ (modal, form, etc)              │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ User Interacts with UI           │
    │ (fills form, clicks submit)      │
    └────────┬────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────┐
    │ Call API Endpoint                    │
    │ POST /api/internships/{id}/apply/    │
    │ + Authorization: Bearer {token}      │
    └────────┬─────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────┐
    │ API Client Interceptor               │
    │ ✓ Add Authorization header           │
    │ ✓ Handle 401 token refresh if needed │
    │ ✓ Retry request                      │
    └────────┬─────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────┐
    │ Backend API Endpoint                   │
    │                                        │
    │ MUST Check Again:                      │
    │ if request.user.role != 'student': ✓  │
    │    return 403 Forbidden                │
    └────────┬───────────────────────────────┘
             │
        ┌────┴────┐
        │          │
    YES │          │ NO
        │          │
        ▼          ▼
    ┌─────┐   ┌──────────┐
    │ 200 │   │ 403      │
    │ OK  │   │ Denied   │
    └──┬──┘   └──┬───────┘
       │         │
       │         ▼
       │    ┌──────────────┐
       │    │ Frontend Show│
       │    │ Error:       │
       │    │ Permission   │
       │    │ Denied       │
       │    └──────────────┘
       │
       ▼
    ┌──────────────┐
    │ Success      │
    │ Message      │
    │ Update UI    │
    └──────────────┘
```

---

## 8. QUICK DECISION TREE

```
                    User performs action
                           │
                           ▼
                  Is user logged in?
                      /         \
                    NO          YES
                    │            │
                    ▼            ▼
              Show Login    Is user role allowed
                            for this action?
                                /         \
                              NO          YES
                              │            │
                              ▼            ▼
                        Show Error    Call Backend
                     (Frontend check)  (API Endpoint)
                              │            │
                              ▼            ▼
                          BLOCKED      Backend checks
                                       permission AGAIN
                                       (security)
                                           /     \
                                         NO       YES
                                         │         │
                                         ▼         ▼
                                      403        200 OK
                                    Forbidden   Success


    KEY INSIGHT: Frontend checks are for UX only
                Backend checks are for security!
```

---

## 9. DATA FLOW - Apply for Internship Example

```
┌────────────────────────────────────────────────────────────────┐
│ 1. User sees Opportunities page                                │
│    (src/pages/Opportunities.tsx)                               │
│                                                                 │
│    useAuthStore() → { user }                                   │
│                                                                 │
│    user = {                                                     │
│      id: "uuid-123",                                            │
│      role: "student",  ← CHECK THIS                             │
│      email: "student@example.com",                              │
│      ...                                                        │
│    }                                                            │
│                                                                 │
│    opportunities = [                                            │
│      { id: "opp-1", title: "Summer Internship", ... },         │
│      ...                                                        │
│    ]                                                            │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. User clicks "Apply" button on opportunity                   │
│                                                                 │
│    initiateApply(opportunity)                                  │
│      ↓                                                          │
│      if (!user) showLoginModal()  ✓ Logical                    │
│      if (user.role !== 'student') {                            │
│        toast.error('Only students can apply')                  │
│        return;  ✓ Frontend check                               │
│      }                                                          │
│                                                                 │
│      setShowApplyModal(true)  → Show modal                    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. ApplyModal renders                                          │
│                                                                 │
│    <input placeholder="Cover letter (optional)" />             │
│    <button onClick={handleConfirm}>Submit Application</button> │
│                                                                 │
│    User enters cover letter and clicks Submit                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. handleConfirmApply() called                                 │
│    (from OpportunityDetails.tsx)                               │
│                                                                 │
│    internshipService.applyForInternship(                        │
│      opportunityId: "opp-1",                                   │
│      coverLetter: "Dear HR team..."                            │
│    )                                                            │
│                                                                 │
│    → Calls API client:                                         │
│      POST /api/internships/opp-1/apply/                       │
│      {                                                         │
│        cover_letter: "Dear HR team..."                         │
│      }                                                         │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. API Client Request Interceptor                              │
│    (src/services/api/client.ts)                                │
│                                                                 │
│    ✓ Get token from store:                                     │
│      token = useAuthStore.getState().accessToken              │
│      → "eyJhbGciOiJIUzI1NiIs..."                               │
│                                                                 │
│    ✓ Add Authorization header:                                 │
│      Authorization: Bearer eyJhbGciOiJIUzI1NiIs...            │
│                                                                 │
│    ✓ Send request to backend:                                 │
│      POST /api/internships/opp-1/apply/                       │
│      [Authorization: Bearer ...]                              │
│      { cover_letter: "..." }                                   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. Backend Validates (CRITICAL - MUST HAPPEN!)                 │
│    (edulink/apps/internships/views.py)                         │
│                                                                 │
│    ✓ Decode JWT token                                          │
│    ✓ Get user from token:                                      │
│      user.role = "student"                                     │
│                                                                 │
│    ✓ Check permission:                                         │
│      if user.role != 'student':                                │
│        return 403 Forbidden                                    │
│                                                                 │
│    ✓ Check other business rules:                               │
│      - opportunity.status == 'OPEN'?                           │
│      - deadline not passed?                                    │
│      - already applied?                                        │
│      - has CV?                                                 │
│                                                                 │
│    ✓ Create InternshipApplication                              │
│    ✓ Return 201 Created                                        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ 7. Frontend Handles Response                                   │
│    (back in OpportunityDetails.tsx)                            │
│                                                                 │
│    ✓ Response 201 Created:                                     │
│      toast.success('Application submitted!')                   │
│      setOpportunity({...opportunity, applied: true})           │
│      closeModal()                                              │
│                                                                 │
│    ✗ Response 403 Forbidden:                                   │
│      toast.error('Access denied')                              │
│      (Frontend check failed - shouldn't reach here)            │
│                                                                 │
│    ✗ Response 401 Unauthorized:                                │
│      API Client refreshes token                                │
│      Retries request automatically                             │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│ 8. User sees success message                                   │
│    Application now appears in StudentApplications page         │
│                                                                 │
│    Real-time update via Pusher (if configured):                │
│    → 'application-status-updated' event                        │
│    → UI updates automatically                                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 10. TESTING CHECKLIST

```
Frontend Tests:
  [ ] ProtectedRoute blocks unauthenticated users
  [ ] ProtectedRoute allows authenticated users
  [ ] Role mismatch redirects to correct dashboard
  [ ] Token persists across page reload
  [ ] 401 triggers token refresh automatically
  [ ] Logout clears all auth state
  [ ] Hardcoded role check prevents UI action
  [ ] Error messages are consistent across portals
  
Backend Tests:
  [ ] /api/internships/apply/ blocks non-students (403)
  [ ] /api/applications/review-evidence/ blocks non-supervisors (403)
  [ ] /api/admin/* blocks non-admins (403)
  [ ] Expired JWT returns 401
  [ ] Invalid JWT returns 401
  [ ] Refresh token endpoint returns new access token
  [ ] Refresh token endpoint blocks without refresh token
  
Integration Tests:
  [ ] E2E: Student login → browse → apply flow
  [ ] E2E: Admin login → manage users flow
  [ ] E2E: Token refresh during long operation
  [ ] E2E: Logout after inactivity
  [ ] E2E: Cross-tab synchronization
```

---

**Generated**: April 10, 2026 | **For**: Edulink Frontend Team
