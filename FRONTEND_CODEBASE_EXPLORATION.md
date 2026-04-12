# EduLink Frontend Codebase - Comprehensive Exploration Report

**Date:** April 12, 2026  
**Location:** `/home/bouric/Documents/projects/edulink/edulink-frontend/src`  
**Framework:** React 19 + TypeScript + Vite  
**Key Libraries:** Zustand, Axios, Pusher-JS, React Router, React Hook Form, TailwindCSS

---

## 1. AUTHENTICATION & AUTHORIZATION STRUCTURE

### 1.1 Authentication Context & Store Architecture

**Dual Authentication System:**
- **Zustand Store** ([authStore.ts](edulink-frontend/src/stores/authStore.ts)): Primary state management for regular users (students, employers, institutions)
- **React Context** ([AuthContext.tsx](edulink-frontend/src/contexts/AuthContext.tsx)): Legacy wrapper that delegates to Zustand store for backward compatibility
- **Admin Context** ([AdminAuthContext.tsx](edulink-frontend/src/contexts/AdminAuthContext.tsx)): Separate context for admin-specific authentication

**Auth Store State:**
```typescript
{
  user: User | null,
  accessToken: string | null,
  refreshToken: string | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  
  // Actions
  login(credentials) → Promise<void>
  loginEmployer(credentials) → Promise<void>
  loginInstitution(credentials) → Promise<void>
  register(data) → Promise<void>
  logout() → Promise<void>
  updateUser(data) → void
  refreshSession() → Promise<void>
  setTokens(accessToken, refreshToken) → void
  setLoading(loading) → void
}
```

**User Role Types:**
- Regular users: `'student' | 'employer' | 'institution' | 'institution_admin' | 'employer_admin' | 'supervisor'`
- Admin users: `'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR'`
- Legacy: `'system_admin'`

### 1.2 Token Management & Storage

**Token Storage Strategy:**
- **Regular Users (Zustand):** Persisted via `auth-storage` localStorage key using Zustand's persist middleware
- **Admin Users:** Stored separately in localStorage (`adminToken`, `adminUser`, `adminRefreshToken`)
- **API Client In-Memory Cache:** Tokens cached in `apiClient` memory for request interceptor efficiency

**Token Lifecycle:**
1. Login successful → tokens returned from backend
2. Tokens stored in Zustand store (triggers localStorage persistence)
3. API client synchronizes in-memory copy via `tokenSync.ts`
4. Request interceptor adds `Authorization: Bearer <token>` header
5. On 401 response → automatic token refresh attempt
6. Refresh token sent to `/api/students/auth/token/refresh/` or equivalent

**Token Refresh Mechanism** ([client.ts](edulink-frontend/src/services/api/client.ts#L114-L180)):
- ✅ **FIXED:** Cross-tab synchronization with unique `tabId` to prevent duplicate refreshes
- ✅ **FIXED:** Failed request queue - requests wait for refresh completion, then retry
- ✅ **FIXED:** Token sync callback registered on API client to sync refreshed tokens back to Zustand store
- Network lock (using `navigator.locks.request()`) ensures only one tab refreshes at a time

**Cross-Tab Sync** ([tokenSync.ts](edulink-frontend/src/services/tokenSync.ts)):
```typescript
initializeTokenSync() // Call in App.tsx useEffect
- Registers callback on API client for token updates
- Listens for storage changes (other tabs)
- Syncs auth state across all tabs when localStorage changes
```

### 1.3 Login/Logout Flows

**Student Login Flow:**
```
Login Page (form) 
  → AuthService.login() 
  → API POST /api/students/auth/login/ 
  → Response: {user, tokens}
  → Zustand Store.login() 
  → localStorage.setItem('auth-storage', {user, accessToken, refreshToken})
  → Redirect to /dashboard/student
```

**Admin Login Flow:**
```
SystemAdminLogin Page (form) 
  → AdminAuthService.login() 
  → API POST /api/admin/auth/login/ 
  → Response: {user, tokens}
  → AdminAuthContext state update 
  → localStorage.setItem('adminToken', 'adminUser', 'adminRefreshToken')
  → Redirect to /admin
```

**Logout:**
```
useAuthStore.logout() → Clear store, localStorage, sessionStorage
AdminAuthService.logout() → Clear admin localStorage
→ Both redirect to appropriate login page
```

**⚠️ ISSUE IDENTIFIED:** Admin role mapping inconsistency - uses `platform_staff_role` but may need fallback to `role` (fixed in AdminAuthContext.tsx).

---

## 2. API INTEGRATION PATTERNS

### 2.1 API Client Architecture

**Location:** [services/api/client.ts](edulink-frontend/src/services/api/client.ts)

**Client Type:** Custom Axios wrapper with advanced features

**Configuration:**
```typescript
{
  baseURL: import.meta.env.VITE_API_BASE_URL 
    || 'https://edulink-backend-2ren.onrender.com' (production)
    || 'http://localhost:8000' (development)
  timeout: 30000ms
  retryAttempts: 3
  retryDelay: 1000ms (exponential backoff)
}
```

**Retriable Status Codes:** `[408, 429, 500, 502, 503, 504]`
**Non-Retriable Status Codes:** `[400, 401, 403, 404, 409, 422]`

### 2.2 Interceptor Architecture

**Request Interceptor Flow:**
1. Handle FormData uploads (removes `Content-Type` to allow browser/axios to set boundary)
2. Add `Authorization: Bearer <token>` header (skipped for login/register endpoints)
3. Support custom headers via `custom-headers` config property
4. Skip auth decorator via `skipAuth: true` config

**Response Interceptor Flow:**
```
Success → Return response.data
Error:
  ├─ 401 (no retry yet, not login) → Trigger token refresh
  │  ├─ If already refreshing: Queue request & wait for refresh
  │  └─ On refresh success: Retry original request
  ├─ Retriable (408, 429, 5xx) → Exponential backoff retry
  ├─ Non-retriable → Throw ApiError
  └─ No response (network) → Throw NetworkError
```

### 2.3 Error Classes & Hierarchy

**Base Class:** `ApiError` extends Error
```typescript
class ApiError {
  message: string
  status?: number
  data?: any // Full backend response
}
```

**Specialized Classes:**
- `NetworkError` - Connection failed (status undefined)
- `ValidationError` - 400/422 with `fieldErrors` parsed from response
- `AuthenticationError` - 401
- `AuthorizationError` - 403
- `NotFoundError` - 404
- `ServerError` - 500
- `RateLimitError` - 429
- `TimeoutError` - 408

**Error Data Preservation:**
- ✅ Full backend response stored in `error.data` property
- ✅ Allows UI to extract field-specific validation errors
- ✅ Enables status-code-specific handling without loss of information

### 2.4 Common API Service Patterns

**Base Pattern:**
```typescript
class SomeService {
  private client = apiClient;
  
  async doSomething(): Promise<T> {
    try {
      const response = await this.client.post<T>('/api/endpoint/', data);
      return response;
    } catch (error) {
      // ✅ FIXED: Rethrow to preserve ApiError status codes
      throw error;
    }
  }
}
```

**Key Services:**
- [authService.ts](edulink-frontend/src/services/auth/authService.ts) - Student/Employer/Institution login
- [adminAuthService.ts](edulink-frontend/src/services/auth/adminAuthService.ts) - Admin login & management
- [studentService.ts](edulink-frontend/src/services/student/studentService.ts) - Profile management
- [internshipService.ts](edulink-frontend/src/services/internship/internshipService.ts) - Opportunity/Application management
- [employerService.ts](edulink-frontend/src/services/employer/) - Employer operations
- [institutionService.ts](edulink-frontend/src/services/institution/) - Institution operations

---

## 3. PERMISSION & ROLE MANAGEMENT

### 3.1 Centralized Permission Utility

**Location:** [utils/permissions.ts](edulink-frontend/src/utils/permissions.ts)

**Purpose:** Single source of truth for all permission checks across the app

**Key Permission Functions:**
```typescript
canApplyForInternship(user): boolean
  → user.role === 'student'

canViewOpportunities(user): boolean
  → user !== null (all authenticated)

canWithdrawApplication(user, studentId): boolean
  → user.role === 'student' && user.id === studentId

canReviewEvidence(user): boolean
  → ['supervisor', 'institution_admin', 'employer_admin'].includes(user.role)

canManageApplications(user): boolean
  → ['employer_admin', 'institution_admin', 'supervisor', 'employer'].includes(user.role)

canCreateOpportunity(user): boolean
  → ['employer_admin', 'institution_admin'].includes(user.role)

canEditOpportunity(user, creatorId): boolean
  → user.id === creatorId || user.role === 'institution_admin'
```

### 3.2 Admin Permission Management

**Admin Role Hierarchy:**
```
SUPER_ADMIN (full system access)
  ├─ PLATFORM_ADMIN (platform management)
  ├─ MODERATOR (content moderation)
  └─ AUDITOR (read-only audit)
```

**Admin User Interface:**
```typescript
interface AdminUser {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR'
  platform_staff_role?: string // Backend field
  permissions: string[]
  createdAt: string
  lastLogin: string
}
```

### 3.3 Permission Enforcement Patterns

**Pattern 1: Component-Level Guards**
```typescript
<ProtectedRoute role={['student']}>
  <StudentComponent />
</ProtectedRoute>
```

**Pattern 2: Function-Level Checks**
```typescript
if (canApplyForInternship(user)) {
  handleApplyClick();
}
```

**Pattern 3: Conditional Rendering**
```typescript
{canReviewEvidence(user) && <ReviewButton />}
```

**⚠️ ISSUE:** Admin role mapping - code checks both `role` and `platform_staff_role`, but inconsistency possible during migration.

---

## 4. ERROR HANDLING

### 4.1 Error Parsing & Response Structure

**Location:** [services/errorHandling.ts](edulink-frontend/src/services/errorHandling.ts)

**Parsed Error Response Format:**
```typescript
interface ParsedErrorResponse {
  errorCode: string              // 'UNKNOWN', 'TIMEOUT', 'RATE_LIMIT', etc.
  message: string                // Raw message from backend
  statusCode: number             // HTTP status
  title: string                  // User-friendly title ("Authentication Failed")
  userMessage: string            // Localized user-facing message
  timestamp: string              // ISO timestamp
  context?: Record<string, any>  // Backend context data
  fieldValidations?: ErrorFieldValidation[]  // Field-level validation errors
  isRetryable: boolean           // Should UI offer retry?
  suggestedAction?: string       // "Try again", "Log in again", etc.
}
```

### 4.2 Backend Error Response Format

**Assumed Backend Format:**
```typescript
{
  error_code: string,
  message: string,
  status_code: number,
  timestamp: string,
  context?: Record<string, any>
}
```

**Parsing Logic:**
```typescript
parseErrorResponse(error) → 
  if ApiError instance: extract status + data
  else if plain backend JSON: parse error_code + status_code
  else: generic network error
```

### 4.3 Status Code to Message Mapping

**Centralized Mapping** [types/errors.ts](edulink-frontend/src/types/errors.ts):
```typescript
STATUS_CODE_MESSAGE_MAP = {
  400: {
    title: 'Invalid Request',
    userMessage: 'Please correct the highlighted fields and try again.'
  },
  401: {
    title: 'Authentication Failed',
    userMessage: 'Please log in again to continue.'
  },
  403: {
    title: 'Access Denied',
    userMessage: 'You lack sufficient permissions.'
  },
  404: {
    title: 'Not Found',
    userMessage: 'This resource no longer exists.'
  },
  409: {
    title: 'Conflict',
    userMessage: 'This action conflicts with existing data.'
  },
  500: {
    title: 'Server Error',
    userMessage: 'We\'re experiencing technical difficulties.'
  },
  503: {
    title: 'Service Unavailable',
    userMessage: 'Our service is temporarily down.'
  }
}
```

### 4.4 Portal-Specific Error Messages

**Location:** [utils/loginErrorMessage.ts](edulink-frontend/src/utils/loginErrorMessage.ts)

**Feature:** Different error messages per login portal (student/employer/institution/admin)

```typescript
getLoginErrorMessage(error, { portal: 'student' })
  → 401: "Incorrect email or password. Please try again."
  
getLoginErrorMessage(error, { portal: 'admin' })
  → 401: "Invalid admin email or password. Please try again."
```

### 4.5 Error Propagation Pattern

**Location:** [services/errorPropagation.ts](edulink-frontend/src/services/errorPropagation.ts)

**Purpose:** Preserve ApiError status codes through service layer

**Pattern:**
```typescript
try {
  // API call
} catch (error) {
  // ✅ DO: Rethrow ApiError as-is
  rethrowWithContext(error);
  
  // ❌ DON'T: Convert to generic Error
  // throw new Error(error.message); // Loses status code!
}
```

**Type Guards:**
```typescript
isApiError(error): boolean      // Check if ApiError instance
getErrorMessage(error): string  // Extract message safely
```

### 4.6 Error Hooks

**`useErrorHandler` Hook** [hooks/useErrorHandler.ts](edulink-frontend/src/hooks/useErrorHandler.ts):
```typescript
useErrorHandler({
  onAuthError: (error) => {/* 401/403 */},
  onValidationError: (error) => {/* 400 */},
  onNotFound: (error) => {/* 404 */},
  onConflict: (error) => {/* 409 - refresh & retry */},
  onUnexpected: (error) => {/* 5xx */},
  retryConfig: { maxAttempts: 3, backoffMultiplier: 2 }
})
```

### 4.7 Retry Logic

**Strategy:** Exponential backoff
```
Attempt 1: immediate
Attempt 2: delay × 2^1 = 2000ms
Attempt 3: delay × 2^2 = 4000ms
Max retries: 3 (configured)
```

**Applies to:** 408, 429, 500, 502, 503, 504 status codes only

**Won't Retry:** 400, 401, 403, 404, 409, 422

---

## 5. STATE MANAGEMENT

### 5.1 Zustand Store Architecture

**Primary Store:** [stores/authStore.ts](edulink-frontend/src/stores/authStore.ts)

**Features:**
- ✅ Persist middleware (auto-saves to localStorage as `auth-storage`)
- ✅ Multiple login methods (student/employer/institution)
- ✅ Token refresh capability
- ✅ Reactive getters (via Zustand hooks)

**Usage Pattern:**
```typescript
const { user, isAuthenticated, login, logout } = useAuthStore();

// Subscribe to specific state
const user = useAuthStore(state => state.user);
```

### 5.2 React Context Providers

**App.tsx Provider Stack:**
```typescript
<QueryClientProvider>
  {/* React Query for server state (5min staleTime, 30min gcTime) */}
  <AuthProvider>
    {/* Legacy wrapper around Zustand store */}
    <PusherProvider>
      {/* Real-time events via Pusher */}
      <AdminAuthProvider>
        {/* Separate admin authentication */}
        <Toaster />
        <App />
      </AdminAuthProvider>
    </PusherProvider>
  </AuthProvider>
</QueryClientProvider>
```

### 5.3 React Query Configuration

**Location:** [main.tsx](edulink-frontend/src/main.tsx)

**Cache Strategy:**
- **Stale Time:** 5 minutes (data considered fresh)
- **GC Time:** 30 minutes (retain in memory after removal)
- **Retries:** 1 attempt on error
- **Window Focus:** No refetch on window focus

### 5.4 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  User Interaction                        │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────▼────────────────┐
        │  React Component             │
        │  (calls service method)       │
        └─────────────┬────────────────┘
                      │
        ┌─────────────▼────────────────┐
        │  Service Layer               │
        │  (business logic)             │
        └─────────────┬────────────────┘
                      │
        ┌─────────────▼────────────────┐
        │  API Client                  │
        │  (interceptors, retry)       │
        └─────────────┬────────────────┘
                      │
        ┌─────────────▼────────────────┐
        │  Backend API                 │
        │  (returns data/error)        │
        └─────────────┬────────────────┘
                      │
        ┌─────────────▼────────────────────────────────┐
        │  Update Zustand Store OR React Query Cache   │
        │  (state flows back to components via hooks)  │
        └──────────────────────────────────────────────┘
```

---

## 6. PROTECTED ROUTES & GUARDS

### 6.1 Regular Route Guards

**Location:** [routes/index.tsx](edulink-frontend/src/routes/index.tsx)

**ProtectedRoute Component:**
```typescript
<ProtectedRoute role={['student', 'employer']}>
  <SomeComponent />
</ProtectedRoute>

// Logic:
// 1. Check isAuthenticated via useAuthStore
// 2. If not authenticated → redirect to role-appropriate login
//    - /student/* → /login
//    - /employer/* → /employer/login
//    - /institution/* → /institution/login
//    - /admin/* → /admin/login
// 3. If authenticated but role mismatch → redirect to user's dashboard
// 4. If role matches → render children
```

**PublicRoute Component:**
```typescript
<PublicRoute>
  <LoginPage />
</PublicRoute>

// Logic:
// If already authenticated → redirect to user's dashboard
// Else → render login page
```

### 6.2 Admin Route Guards

**Location:** [components/admin/AdminRouteGuards.tsx](edulink-frontend/src/components/admin/AdminRouteGuards.tsx)

**AdminProtectedRoute:**
```typescript
// 1. Check adminToken in localStorage
// 2. Parse adminUser JSON from localStorage
// 3. Validate role in ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'MODERATOR', 'AUDITOR']
// 4. If invalid or missing → redirect to /admin/login
// 5. Else → render children
```

**AdminPublicRoute:**
```typescript
// If adminToken exists → redirect to /dashboard/admin
// Else → render login page
```

**⚠️ ISSUE:** Admin role extraction from localStorage - previously looked for 'adminRole' key (which was never stored). Now correctly extracts from 'adminUser' JSON object.

### 6.3 Route Configuration

**Route Structure:**
```
/                          (public landing)
├─ /login                  (student login)
├─ /register               (student register)
├─ /employer/login         (employer login)
├─ /institution/login      (institution login)
├─ /admin/login            (system admin login)
│
├─ /dashboard/student/*    (ProtectedRoute role=['student'])
├─ /employer/*             (ProtectedRoute role=['employer', 'employer_admin'])
├─ /institution/*          (ProtectedRoute role=['institution', 'institution_admin'])
├─ /admin/*                (AdminProtectedRoute)
│
└─ /*                      (NotFound)
```

---

## 7. THIRD-PARTY INTEGRATIONS

### 7.1 Pusher.js Real-Time Events

**Location:** [contexts/PusherContext.tsx](edulink-frontend/src/contexts/PusherContext.tsx)

**Configuration:**
```typescript
{
  key: import.meta.env.VITE_PUSHER_KEY || 'f43311e71172349f71a2',
  cluster: import.meta.env.VITE_PUSHER_CLUSTER || 'mt1',
  forceTLS: true,
  enabledTransports: ['ws', 'wss']
}
```

**Features:**
- ✅ Singleton pattern (one Pusher instance for entire app)
- ✅ Reference counting for subscriptions (avoid duplicate unsubscribe)
- ✅ Connection state tracking
- ✅ Event error handling with console logging
- ✅ Development mode: Pusher logs enabled

**Usage Hook:** [hooks/usePusher.ts](edulink-frontend/src/hooks/usePusher.ts)

```typescript
usePusher(
  channelName: 'updates_user_123',
  eventName: 'logbook-submitted',
  onEvent: (data) => console.log(data),
  {
    fallbackPoll: async () => { /* API call */ },
    fallbackDelay: 10000,  // Start polling if no Pusher event after 10s
    pollingInterval: 3000  // Poll every 3s
  }
)
```

**Fallback Mechanism:**
- Monitor Pusher event arrival
- If no event within `fallbackDelay` → start polling fallback
- Stop polling when Pusher event received
- Useful for unreliable connections

### 7.2 FullCalendar Integration

**Package:** `@fullcalendar/react@^6.1.20`

**Plugins Used:**
- `@fullcalendar/daygrid` - Day grid view
- `@fullcalendar/bootstrap5` - Bootstrap styling
- `@fullcalendar/interaction` - Event interactions

**Use Cases:**
- Internship timeline visualization
- Milestone scheduling
- Logbook entry calendar

### 7.3 Charting Library (Recharts)

**Package:** `recharts@^3.7.0`

**Use Cases:**
- Admin dashboards (stats charts)
- Analytics visualization
- Trustworthiness metrics over time

### 7.4 Form Libraries

**React Hook Form:** Form state management with validation
**Yup:** Schema validation library
**@hookform/resolvers:** Bridge between React Hook Form and Yup

### 7.5 UI Component Libraries

**Bootstrap 5:** Core UI components
**Hero Icons:** Icon library
**Phosphor Icons:** Alternative icon set
**Lucide React:** Modern icons
**Bootstrap Icons:** Additional icons

### 7.6 Query & State Management

**TanStack React Query v5:** Server state, caching, refetching
**Zustand v5:** Client state management
**React Router v7:** Client-side routing

### 7.7 Toast Notifications

**react-hot-toast:** Toast notifications

**Location:** [services/toast.ts](edulink-frontend/src/services/toast.ts) - wrapper utility

### 7.8 PDF Generation

**jspdf:** PDF export
**jspdf-autotable:** Table formatting in PDFs

**Use Cases:**
- Certificate generation
- Report export
- Document downloads

---

## 8. DATA HANDLING & SECURITY

### 8.1 Data Validation Strategy

**Layers:**
1. **Client-Side:** `utils/validation.ts` - fail fast before API call
2. **API:** Interceptor adds auth headers, handles FormData
3. **Backend:** Server validation (source of truth)

**Client Validators** [utils/validation.ts](edulink-frontend/src/utils/validation.ts):
```typescript
validateEmail(email): ValidationResult
  → EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  → Max 254 chars

validatePassword(password, minLength=8): ValidationResult
  → Min 8 chars, uppercase, lowercase, digit, special char

validatePhone(phone): ValidationResult
  → PHONE_REGEX: /^[\d\s\-\+\(\)]+$/
  → Min 10 digits

validateUrl(url, optional?): ValidationResult
  → URL_REGEX: /^https?:\/\/.+/i
```

### 8.2 Type Definitions for Data Models

**Core Types** [types/index.ts](edulink-frontend/src/types/index.ts):

```typescript
// User Types
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'student' | 'employer' | 'institution' | 'admin' | ...
  trustLevel?: number
  trustPoints?: number
  avatar?: string
  institution_id?: string
  employer_id?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Internship Types
interface InternshipOpportunity {
  id: string
  title: string
  description: string
  department: string
  skills: string[]
  capacity: number
  location: string
  location_type: 'ONSITE' | 'REMOTE' | 'HYBRID'
  employer_id?: string
  status: string  // DRAFT, OPEN, CLOSED
  start_date?: string
  end_date?: string
  is_deadline_expired?: boolean  // Backend computed
  student_has_applied?: boolean
}

interface InternshipApplication {
  id: string
  status: string  // APPLIED, ACCEPTED, ACTIVE, COMPLETED, CERTIFIED, etc.
  student_id: string
  opportunity: string | object  // UUID or full object
  // ... many flattened opportunity fields
  cover_letter?: string
  can_complete?: boolean
}

// Response Types
interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: Record<string, string[]>
}

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
```

**Error Types** [types/errors.ts](edulink-frontend/src/types/errors.ts):
```typescript
interface BackendErrorResponse {
  error_code: string
  message: string
  status_code: number
  timestamp: string
  context?: Record<string, any>
}

interface ErrorFieldValidation {
  field: string
  errors: string[]
}
```

### 8.3 File Upload Handling

**Configuration** [config/index.ts](edulink-frontend/src/config/index.ts):
```typescript
upload: {
  maxFileSize: 10 * 1024 * 1024,  // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedDocumentTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  chunkSize: 5 * 1024 * 1024,  // 5MB chunks
  maxRetries: 3
}
```

**Upload Pattern** [services/student/studentService.ts](edulink-frontend/src/services/student/studentService.ts):
```typescript
uploadDocument(id: string, type: 'cv' | 'admission_letter' | 'id_document', file: File) {
  const formData = new FormData();
  formData.append('document_type', type);
  formData.append('file_name', file.name);
  formData.append('file', file);
  
  return this.client.post(
    `/api/students/${id}/upload_document/`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
}
```

**⚠️ Note:** API client automatically handles FormData by removing `Content-Type` header to allow browser to set boundary.

### 8.4 Data Caching Strategy

**React Query Cache:**
- Stale time: 5 minutes (data considered fresh for reads)
- GC time: 30 minutes (retain in memory)
- Single retry on failure
- No automatic refetch on window focus

**Config Cache (application-level):**
```typescript
cache: {
  defaultTTL: 5 * 60 * 1000,
  userProfileTTL: 60 * 60 * 1000,       // 1 hour
  dashboardStatsTTL: 10 * 60 * 1000,    // 10 minutes
  internshipListTTL: 15 * 60 * 1000     // 15 minutes
}
```

### 8.5 Security Vulnerabilities & Concerns

**✅ Protective Measures:**
1. **CSRF Protection:** Config flag `security.enableCSRF: true`
2. **Rate Limiting:** Config flag `security.enableRateLimiting: true`
3. **Token Management:** In-memory + localStorage (dual storage pattern)
4. **Cross-Tab Sync:** Unique `tabId` prevents duplicate refresh
5. **Error Data Preservation:** Status codes maintained through layers
6. **Field Validation Extraction:** Errors not lost when ApiError retrown

**⚠️ Potential Issues:**

1. **LocalStorage Token Exposure:**
   - ❌ Tokens stored in plain localStorage (XSS vulnerability)
   - ⚠️ Mitigation: HttpOnly cookies preferred (backend implementation)
   - ⚠️ Current: Using localStorage despite XSS risk

2. **Role-Based Redirect Logic:**
   - ✅ Routes check role and redirect appropriately
   - ⚠️ Client-side only - backend must also enforce
   - ⚠️ User can't access route but could bypass via dev tools

3. **Admin Role Inconsistency:**
   - ✅ Now checks both `role` and `platform_staff_role`
   - ⚠️ Migration window where inconsistency possible
   - ⚠️ Should validate role is properly normalized on login

4. **Error Message Information Leakage:**
   - ✅ Backend should not expose sensitive info
   - ⚠️ Frontend displays backend error messages directly
   - ⚠️ "User not found" reveals user account existence

5. **Refresh Token Rotation:**
   - ⚠️ Code assumes refresh token not rotated by backend (line 340: `refreshToken || state.refreshToken`)
   - ⚠️ If backend rotates on refresh, this could stale

6. **File Upload Validation:**
   - ✅ MIME type checking in config
   - ⚠️ Only client-side validation (easy to bypass)
   - ⚠️ Backend must enforce size/type restrictions

7. **Form Data JSON Serialization:**
   - ⚠️ `formData.append('skills', JSON.stringify(data.skills))` - could cause issues if backend expects array
   - ⚠️ Inconsistent with multipart/form-data handling

8. **Session Timeout:**
   - ✅ Config includes `security.sessionTimeout: 30 * 60 * 1000` (30 min)
   - ⚠️ Not implemented in code (config only)
   - ⚠️ No client-side session timeout enforcement

---

## 9. HOOKS & UTILITIES

### 9.1 Custom Hooks

**useApi** [hooks/useApi.ts](edulink-frontend/src/hooks/useApi.ts):
```typescript
useApi<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  options?: {
    skip?: boolean
    dependencies?: any[]
    onSuccess?: (data: T) => void
    onError?: (error: ApiError) => void
    retryOnFailure?: boolean
    retryAttempts?: number
    retryDelay?: number
  }
) → { data, loading, error, refetch }
```

**useErrorHandler** [hooks/useErrorHandler.ts](edulink-frontend/src/hooks/useErrorHandler.ts):
```typescript
useErrorHandler(options?: {
  onAuthError?: (error) => void
  onValidationError?: (error) => void
  onNotFound?: (error) => void
  onConflict?: (error) => Promise<void>
  onUnexpected?: (error) => void
  retryConfig?: { maxAttempts, initialDelay, backoffMultiplier }
}) → { parsedError, handleError, clearError, retry, isRetrying, retryAttempt }
```

**usePusher** [hooks/usePusher.ts](edulink-frontend/src/hooks/usePusher.ts):
```typescript
usePusher<T>(
  channelName: string,
  eventName: string,
  onEvent: (data: T) => void,
  options?: {
    fallbackPoll?: () => Promise<T | null>
    fallbackDelay?: number
    pollingInterval?: number
  }
)
```

## Other Custom Hooks:
- **useAuthErrorHandler** - Login-specific error handling
- **useFeedbackModal** - Feedback/modal state management
- **usePusherContext** - Pusher context access

### 9.2 Utility Functions

**dateFormatter.ts** - Date/time formatting utilities
**documentUtils.ts** - Document handling (uploads, conversions)
**errorMapper.ts** - Error context mapping
**pdfGenerator.ts** - PDF generation wrapper
**pagination.ts** - Pagination logic
**toast.ts** - Toast notification wrapper
**validation.ts** - Input validation (email, password, phone, URL)

---

## 10. IDENTIFIED ISSUES & RECOMMENDATIONS

### Critical Issues

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| LocalStorage token storage | **HIGH** | API Client, Auth Store | XSS vulnerability - tokens could be accessed by malicious scripts |
| Role normalization inconsistency | **MEDIUM** | AdminAuthContext | Admin login might have role mismatches (platform_staff_role vs role) |
| Session timeout not enforced | **MEDIUM** | Config only | Users not logged out after 30 minutes of inactivity |
| Form data JSON serialization | **MEDIUM** | studentService.ts | Skills array stringified in FormData - backend parsing issue |

### Recommendations

1. **Migrate to HttpOnly Cookies:**
   - Backend: Return tokens in `Set-Cookie` headers with `HttpOnly` flag
   - Frontend: Remove localStorage token storage
   - Benefit: Tokens never accessible to JavaScript (XSS-safe)

2. **Implement Session Timeout:**
   - Track last activity in Zustand store
   - Timer checks inactivity every minute
   - Auto-logout at `security.sessionTimeout`

3. **Normalize Admin Roles:**
   - Admin login should consistently set `role` field
   - Remove `platform_staff_role` fallback or deprecate one
   - Ensure backend returns only one role field

4. **Fix FormData Serialization:**
   - Keep skills as array in FormData (not stringified)
   - Verify backend expects multipart format
   - Test file upload + JSON field together

5. **Backend Error Message Validation:**
   - Audit error responses for information leakage
   - Remove user existence hints
   - Use generic messages for security-sensitive errors

6. **Add Refresh Token Rotation Support:**
   - Update token sync to handle new refresh token in response
   - Test refresh token expiration scenarios
   - Implement refresh token blacklist

7. **Server-Side Permission Enforcement:**
   - Current client-side guards insufficient
   - Backend must validate role before any action
   - Return 403 if user tries unauthorized action

---

## 11. COMPONENT STRUCTURE

### Main Pages
- [pages/auth/](edulink-frontend/src/pages/auth/) - Login, Register, Password Reset, Email Verification
- [pages/student/](edulink-frontend/src/pages/student/) - Student Dashboard, Applications, Logbook, Artifacts
- [pages/admin/](edulink-frontend/src/pages/admin/) - Admin dashboards (System, Institution, Employer, Supervisor)
- [pages/Home.tsx](edulink-frontend/src/pages/Home.tsx) - Landing page
- [pages/Opportunities.tsx](edulink-frontend/src/pages/Opportunities.tsx) - Browse internships
- [pages/Support.tsx](edulink-frontend/src/pages/Support.tsx) - Support tickets

### Components
- [components/common/](edulink-frontend/src/components/common/) - Reusable components (ErrorBoundary, etc.)
- [components/admin/](edulink-frontend/src/components/admin/) - Admin components (AdminLayout, Sidebar, etc.)
- [components/providers/](edulink-frontend/src/components/providers/) - Context providers

---

## 12. BUILD & CONFIGURATION

**Build Tool:** Vite 7.2  
**TypeScript:** 5.9  
**Development Server:** `npm run dev` (localhost:5173)  
**Production Build:** `npm run build` → `dist/` folder  
**Type Checking:** `npm run type-check`  
**Code Quality:** ESLint + Prettier

---

## Summary

The EduLink React frontend is a well-structured multi-user internship platform with:

✅ **Strengths:**
- Clear separation of concerns (services, contexts, hooks, utils)
- Comprehensive error handling with status code preservation
- Dual authentication system (regular + admin)
- Real-time capabilities (Pusher) with fallback polling
- Advanced API client features (retry, cross-tab sync, token refresh)
- Centralized permission checking
- Cross-tab synchronization for auth state

⚠️ **Areas for Improvement:**
- Migrate from localStorage to HttpOnly cookies
- Implement client-side session timeout
- Fix admin role normalization
- Add comprehensive security audit
- Improve error message information leakage

The codebase demonstrates strong patterns for state management, error handling, and API integration, with room for security enhancements.

---

**Report Generated:** April 12, 2026  
**Total Files Explored:** 50+  
**Code Analysis Depth:** Comprehensive (paths, flows, patterns, issues)
