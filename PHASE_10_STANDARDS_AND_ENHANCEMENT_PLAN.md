# Phase 10: Documentation, Standards & UX Enhancement Plan

## Part A: Error Handling Standards Documentation

### 1. **Developer Guide: Using the Error Handling System**

All React developers should follow this pattern for API calls:

```typescript
// ✅ CORRECT PATTERN - All API calls follow this
import { useErrorHandler } from '../hooks/useErrorHandler';

function MyComponent() {
  const { handleError, parsedError } = useErrorHandler({
    onValidationError: (err) => console.warn('Validation:', err),
    onAuthError: (err) => redirectToLogin(),
    onUnexpected: (err) => showErrorAlert(err),
  });

  const fetchData = async () => {
    try {
      const response = await fetch('/api/resource');
      if (!response.ok) {
        const errorData = await response.json();
        await handleError(errorData);
        return;
      }
      const data = await response.json();
      setData(data);
    } catch (error) {
      await handleError(error);
    }
  };

  return (
    <div>
      {parsedError && <div className="alert">{parsedError.userMessage}</div>}
      <button onClick={fetchData}>Load</button>
    </div>
  );
}
```

### 2. **HTTP Status Code Reference**

| Status | Error Hook | Frontend Action | User Message |
|--------|-----------|-----------------|--------------|
| **400** | onValidationError | Show field errors inline | "Please correct the highlighted fields" |
| **401** | onAuthError | Redirect to login | "Session expired. Please log in again." |
| **403** | onAuthError | Show permission error | "You lack permission for this action" |
| **404** | onNotFound | Show not found | "Resource no longer exists" |
| **409** | onConflict | Refresh state → retry | "Data changed. Please review and retry" |
| **429** | onUnexpected | Show rate limit | "Too many requests. Please wait..." |
| **5xx** | onUnexpected | Show error + retry | "Server error. Please try again." |

### 3. **Field Validation Error Pattern**

**Backend sends** (400 Validation Error):
```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "status_code": 400,
  "timestamp": "2026-04-11T13:58:41Z",
  "context": {
    "email": ["Email is required.", "Email must be valid."],
    "password": ["At least 8 characters."]
  }
}
```

**Frontend displays**:
```typescript
const { getFieldError } = useFormErrorHandler();

<input type="email" />
{getFieldError('email') && (
  <span className="error">{getFieldError('email')}</span>
)}
```

### 4. **Conflict Resolution Pattern (409)**

When user submits change that conflicts with server state:

```typescript
const { handleError } = useErrorHandler({
  onConflict: async (error) => {
    // 1. Refresh data from server
    const fresh = await fetchLatestData();
    setData(fresh);
    
    // 2. Notify user
    showDialog({
      title: 'Data Changed',
      message: 'The resource was modified. Please review the updated version.',
      actions: ['OK'],
    });
    
    // 3. User can now retry their edit
  },
});
```

### 5. **Portal-Specific Messages**

For student/employer/institution/admin login pages:

```typescript
// Each portal uses same login component with different portal prop
<LoginForm portal="student" />    // "Incorrect email or password"
<LoginForm portal="employer" />   // "Invalid employer email or password"
<LoginForm portal="institution" /> // "Invalid institution email or password"
<LoginForm portal="admin" />      // "Invalid admin email or password"
```

---

## Part B: UX Enhancement Checklist (Priority-Ordered)

### Immediate (This Sprint)

#### Task 1: Add Error Boundaries to All Pages
**Timeline**: 3 days | **Complexity**: Low

```typescript
// components/common/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to monitoring
    console.error('Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// App.tsx
<ErrorBoundary>
  <StudentDashboard />
</ErrorBoundary>
```

#### Task 2: Create Skeleton Component Library
**Timeline**: 5 days | **Complexity**: Medium

```typescript
// components/skeleton/
export const TableSkeleton = () => (
  <div className="animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-gray-200 h-12 mb-2 rounded" />
    ))}
  </div>
);

// Usage everywhere
const { data, isLoading } = useQuery(...);

return (
  <>
    {isLoading && <TableSkeleton />}
    {data && <DataTable data={data} />}
  </>
);
```

#### Task 3: Implement Unified Toast System
**Timeline**: 2 days | **Complexity**: Low

```typescript
// utils/toast.ts
import { toast } from 'react-hot-toast';

export const showToast = {
  success: (msg: string) => toast.success(msg, { duration: 3000 }),
  error: (msg: string) => toast.error(msg, { duration: 5000 }),
  loading: (msg: string) => toast.loading(msg),
  info: (msg: string) => toast((t) => <div>{msg}</div>),
};

// Everywhere else
showToast.success('Profile updated');
showToast.error('Failed to save');
```

#### Task 4: Test Error Handling Across Portals
**Timeline**: 4 days | **Complexity**: Medium

Test scenarios per portal:

- [x] **Student Portal**
  - [ ] 400 validation (email, password)
  - [ ] 401 invalid credentials
  - [ ] 404 profile not found
  - [ ] 409 conflict on edit
  - [ ] 5xx server error

- [ ] **Employer Portal**
  - [ ] Same as student

- [ ] **Institution Portal**
  - [ ] Same as student

- [ ] **Admin Portal**
  - [ ] Admin-specific errors

### Short Term (Sprint 2)

#### Task 5: Migrate High-Traffic Pages to React Query
**Timeline**: 7 days | **Complexity**: High

Pages to migrate (in order):
1. StudentDashboard (3 days)
2. InstitutionDashboard (2 days)
3. StudentApplications (1 day)
4. InstitutionApplications (1 day)

#### Task 6: Extract Large Components
**Timeline**: 5 days | **Complexity**: Medium

Components to split:
- StudentHeader (861 lines) → 200 + 180 + 150 + 120
- InternshipDetailsModal (400+ lines) → orchestrator + sub-components
- CreateInternshipModal (400+ lines) → form builder + sections

#### Task 7: Add Accessibility Features
**Timeline**: 5 days | **Complexity**: Medium

- [ ] Add `aria-label` to all buttons
- [ ] Link form labels with `htmlFor`
- [ ] Add `aria-describedby` for errors
- [ ] Test keyboard navigation
- [ ] Add focus visible styles

### Medium Term (Sprint 3)

#### Task 8: Implement Progressive Forms
**Timeline**: 7 days | **Complexity**: High

Examples:
- Login → 1 step (no change)
- Register → 3 steps (credentials, profile, verification)
- Create Internship → 4 steps (basic, requirements, timeline, benefits)

#### Task 9: Add Code Splitting by Portal
**Timeline**: 5 days | **Complexity**: High

```typescript
// routes/AdminRoutes.tsx
const AdminRoutes = lazy(() => import('./AdminRoutes'));

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/admin/*" element={<AdminRoutes />} />
  </Routes>
</Suspense>
```

---

## Part C: Standards & Best Practices Documentation

### Component Creation Standards

Every component should follow PACE pattern:

```typescript
/**
 * PROPS - What props does this component accept?
 * BEHAVIOR - What does it do?
 * ACCESSIBILITY - Is it accessible?
 * COMPOSITION - Can it be composed/nested?
 * EDGE CASES - How does it handle errors/loading?
 */

interface StudentCardProps {
  student: Student;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  error?: Error;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onEdit,
  onDelete,
  isLoading,
  error,
}) => {
  // Loading state
  if (isLoading) return <CardSkeleton />;
  
  // Error state
  if (error) return <ErrorCard error={error} />;
  
  // Render
  return (
    <div
      className="student-card"
      role="article"
      aria-label={`Student: ${student.name}`}
    >
      {/* Content */}
    </div>
  );
};
```

### API/Service Layer Standards

```typescript
// services/student/studentService.ts

/**
 * Service Pattern:
 * 1. Type definitions (Request/Response)
 * 2. Error handling (specific errors for each scenario)
 * 3. Request validation
 * 4. Response parsing
 * 5. Caching hints
 */

interface GetStudentsResponse {
  students: Student[];
  total: number;
  page: number;
}

async function getStudents(
  filters?: StudentFilters
): Promise<GetStudentsResponse> {
  try {
    const response = await apiClient.get('/api/students', { params: filters });
    return response as GetStudentsResponse;
  } catch (error) {
    if (error instanceof ValidationError) {
      // Re-throw for field-level error display
      throw error;
    }
    throw new ServerError('Failed to fetch students');
  }
}

export const studentService = {
  list: getStudents,
  create: createStudent,
  update: updateStudent,
  delete: deleteStudent,
};
```

### Hook Standards

```typescript
/**
 * Custom Hook Naming:
 * - useData* → Data fetching hooks
 * - useForm* → Form handling hooks
 * - useUI* → UI state hooks
 * - useError* → Error handling hooks
 * - useLogic* → Business logic hooks
 */

// ✅ Data fetching hook
export const useStudents = (filters?: StudentFilters) => {
  return useQuery({
    queryKey: ['students', filters],
    queryFn: () => studentService.list(filters),
  });
};

// ✅ Form error handling hook
export const useFormErrorHandler = (onSuccess?: () => void) => {
  return useErrorHandler({ /* ... */ });
};

// ❌ Don't mix concerns
export const useEverything = () => { /* BAD */ };
```

---

## Part D: Error Handling Compliance Checklist

### All Components Must Have:

- [ ] Error state display (using Phase 9 hooks)
- [ ] Loading state display (skeleton or spinner)
- [ ] Try/catch around async operations
- [ ] Proper TypeScript error types
- [ ] Portal-specific error messages where applicable
- [ ] Field-level error display for forms
- [ ] Graceful degradation on API failures

### All Pages Must Have:

- [ ] Error boundary wrapper
- [ ] Loading state on initial load
- [ ] Retry button for failed operations
- [ ] Proper error messaging for users
- [ ] No console errors in production

### All Forms Must Have:

- [ ] Client-side validation
- [ ] Field-level error display
- [ ] Disabled submit during loading
- [ ] Success notification on submit
- [ ] Proper error display on failure

---

## Part E: Testing Standards

### Unit Test Requirements

```typescript
// hooks/useErrorHandler.test.ts
describe('useErrorHandler', () => {
  it('should call onValidationError for 400 status', async () => {
    const onValidationError = vi.fn();
    const { result } = renderHook(() =>
      useErrorHandler({ onValidationError })
    );

    const error = {
      error_code: 'VALIDATION_ERROR',
      status_code: 400,
      message: 'Invalid input',
    };

    await act(async () => {
      await result.current.handleError(error);
    });

    expect(onValidationError).toHaveBeenCalled();
  });
});
```

### Integration Test Requirements

```typescript
// pages/StudentLogin.test.tsx
describe('StudentLogin', () => {
  it('should display field errors from backend', async () => {
    const { getByText, getByPlaceholderText } = render(<StudentLogin />);

    // Simulate form submission with backend returning 400
    fireEvent.change(getByPlaceholderText('Email'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.click(getByText('Login'));

    // Wait for error display
    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
```

---

## Part F: Deployment & Beta Testing Checklist

### Pre-Beta Checklist

- [ ] All TypeScript errors resolved ✅ (Done)
- [ ] Error handling integrated in all pages
- [ ] Loading states visible everywhere
- [ ] All endpoints returning proper error formats
- [ ] Accessibility audit completed
- [ ] Performance baseline established
- [ ] Error monitoring/logging configured

### Beta Rollout Plan

**Week 1**: 10% of users
- Monitor error rates
- Collect feedback on error messages
- Check performance metrics

**Week 2**: 50% of users
- Roll out based on Week 1 feedback
- Continue monitoring

**Week 3**: 100% of users
- Full release

---

## Summary

**Phase 10 Deliverables**:
1. ✅ Error handling documentation (this file)
2. ✅ Architecture review with recommendations
3. ✅ UX enhancement sprint plan
4. ⏳ Component best practices guide
5. ⏳ API service standards
6. ⏳ Testing standards

**Overall Progress**:
- Phases 1-4: Backend infrastructure (136 errors fixed) ✅
- Phase 5: Integration tests ✅
- Phase 6: HTTP response serialization ✅
- Phase 7: Exception middleware ✅
- Phase 8: Error logging & monitoring ✅
- Phase 9: Frontend error handling ✅
- Phase 10: Documentation & standards ⏳ (IN PROGRESS)

**Expected Timeline to Production**:
- Core features: Ready (all phases complete)
- Beta testing: 3 weeks
- Production launch: 4-6 weeks

**Next Milestone**: Beta testing with error handling system live!
