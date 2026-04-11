# Phase 9: Frontend Error Handling Integration

## Overview

Phase 9 implements comprehensive error handling for the React frontend. This system:
- Parses backend error responses in standardized format
- Provides status-code-specific callbacks (400, 401, 403, 404, 409, 5xx)
- Handles field-level validation errors
- Manages conflict resolution (409) with refresh & retry
- Enables automatic retry for transient errors (5xx, 429, timeouts)

## Architecture

### Error Response Format

The backend returns errors in this JSON format:

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Email is required",
  "status_code": 400,
  "timestamp": "2026-04-11T13:58:41.234Z",
  "context": {
    "email": ["This field is required."],
    "password": ["This field is required."]
  }
}
```

### Three-Layer Error Handling

**Layer 1: Error Types & Utilities** (`src/types/errors.ts`)
- Backend response interface: `BackendErrorResponse`
- Status code to message mapping: `STATUS_CODE_MESSAGE_MAP`
- Helper functions: `getUserMessageForStatus()`, `getTitleForStatus()`

**Layer 2: Error Service** (`src/services/errorHandling.ts`)
- **parseErrorResponse()**: Convert any error to `ParsedErrorResponse`
- Classification utilities: `isAuthError()`, `isConflictError()`, etc.
- Suggested actions for each status code

**Layer 3: React Hooks** (`src/hooks/useErrorHandler.ts`)
- **useErrorHandler()**: Main hook for error handling with callbacks
- **useFormErrorHandler()**: For form fields with `getFieldError()`
- **useConflictResolution()**: For 409 Conflict scenarios

---

## Usage Patterns

### 1. Basic Error Handling

```typescript
const { handleError, parsedError } = useErrorHandler({
  onValidationError: (error) => console.log('Invalid input:', error),
  onAuthError: (error) => console.log('Session expired'),
  onUnexpected: (error) => console.log('Error:', error.message),
});

try {
  const response = await fetch('/api/resource');
  if (!response.ok) {
    const errorData = await response.json();
    await handleError(errorData);
  }
} catch (error) {
  await handleError(error);
}
```

### 2. Form Validation Errors (400)

```typescript
const { getFieldError, getAllFieldErrors, parsedError } = useFormErrorHandler({
  onValidationError: (error) => {
    console.log('Field errors:', error.fieldValidations);
  },
});

// In JSX:
<input 
  className={getFieldError('email') ? 'is-invalid' : ''}
/>
{getFieldError('email') && (
  <div className="invalid-feedback">
    {getFieldError('email')}
  </div>
)}
```

### 3. Authentication Errors (401/403)

```typescript
const { handleError } = useErrorHandler({
  onAuthError: (error) => {
    if (error.statusCode === 401) {
      // Session expired - redirect to login
      window.location.href = '/login';
    } else if (error.statusCode === 403) {
      // Insufficient permissions - show dialog
      alert('You lack permission to perform this action.');
    }
  },
});
```

### 4. Conflict Resolution (409)

```typescript
const conflictResolution = useConflictResolution(async () => {
  // Refresh data from server
  const response = await fetch('/api/resource/123');
  const freshData = await response.json();
  setResource(freshData);
});

try {
  const response = await fetch('/api/resource/123', { method: 'PUT' });
  if (response.status === 409) {
    const error = await response.json();
    await conflictResolution.resolveConflict(error);
    alert('Data was updated. Please try again.');
  }
} catch (error) {
  await conflictResolution.resolveConflict(error);
}
```

### 5. Retry with Backoff

```typescript
const { retry, retryAttempt, isRetrying, parsedError } = useErrorHandler({
  retryConfig: {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
  },
  onUnexpected: (error) => {
    if (error.isRetryable && retryAttempt < 3) {
      setTimeout(() => retry(), 1000);
    }
  },
});
```

---

## Status Code Mapping

| Code | Scenario | Suggested Response |
|------|----------|-------------------|
| **400** | Validation failed | Show field errors, request user correction |
| **401** | Authentication expired | Redirect to login, refresh token |
| **403** | Insufficient permissions | Show "access denied" message |
| **404** | Resource not found | Show "not found" message, offer search |
| **409** | Conflict (optimistic lock) | Refresh data, ask user to retry |
| **5xx** | Server error | Show "try again" with retry button |
| **503** | Service unavailable | Show "temporarily down" with retry |

---

## Implementation Patterns

### Pattern 1: Login Form with Validation

See: `src/components/examples/LoginFormExample.tsx`

- Displays backend validation errors inline
- Shows 401 "invalid credentials" message
- Handles 5xx server errors with retry

### Pattern 2: Resource Update with Conflict Handling

See: `src/components/examples/InternshipEditorExample.tsx`

- Handles 409 Conflict with automatic refresh
- Uses optimistic locking (version field)
- Prompts user to re-submit after conflict

### Pattern 3: Data Fetching with Retry

See: `src/components/examples/InternshipListExample.tsx`

- Handles 404 (not found)
- Shows error for 5xx with manual retry button
- Automatically retries network errors

---

## Best Practices

### 1. Preserve ApiError Instances When Re-throwing

**❌ Don't convert to plain Error:**
```typescript
catch (error: ApiError) {
  throw new Error(error.message); // LOSES status code!
}
```

**✅ Do preserve ApiError:**
```typescript
catch (error: ApiError) {
  throw error; // Status code preserved
}
```

### 2. Centralize Status Message Mapping

**❌ Don't scatter messages:**
```typescript
// In StudentLogin
if (error.status === 401) message = "Student login failed";
// In EmployerLogin  
if (error.status === 401) message = "Employer login failed";
```

**✅ Do use centralized mapping:**
```typescript
// In errorHandling.ts STATUS_CODE_MESSAGE_MAP
const message = getUserMessageForStatus(401);
```

### 3. Handle Conflict Errors Explicitly

**❌ Don't treat 409 as generic error:**
```typescript
if (!response.ok) alert('Request failed');
```

**✅ Do refresh state:**
```typescript
if (error.status === 409) {
  await refreshStateFromServer();
  alert('Data changed. Please retry.');  
}
```

### 4. Use Field-Level Error Display

**❌ Don't show all errors at top:**
```typescript
<div className="alert">
  {allErrors.map(e => <p>{e}</p>)}
</div>
```

**✅ Do show errors near fields:**
```typescript
<input className={getFieldError('email') ? 'is-invalid' : ''} />
{getFieldError('email') && <div className="error">{getFieldError('email')}</div>}
```

---

## Files Created in Phase 9

### Types & Utilities
- `src/types/errors.ts` - Error types matching backend format
- `src/services/errorHandling.ts` - Error parsing and classification

### React Hooks
- `src/hooks/useErrorHandler.ts` - Main error handling hook

### Tests
- `src/services/__tests__/errorHandling.test.ts` - Error parsing tests
- `src/hooks/__tests__/useErrorHandler.test.ts` - Hook tests

### Examples
- `src/components/examples/LoginFormExample.tsx` - Form validation pattern
- `src/components/examples/InternshipEditorExample.tsx` - Conflict resolution pattern
- `src/components/examples/InternshipListExample.tsx` - Data fetching pattern

---

## Integration Checklist

- [ ] Import `useErrorHandler` hook in all API-calling components
- [ ] Replace generic error handling with status-code-specific callbacks
- [ ] Implement field-level error display for forms
- [ ] Add conflict resolution for resource mutations
- [ ] Add retry logic for transient errors
- [ ] Test all status codes (400, 401, 403, 404, 409, 500, 503)
- [ ] Update API client interceptors if needed
- [ ] Document component-specific error handling

---

## Migration from Old Error Handling

### Before (Generic Error Handling)
```typescript
try {
  await api.post('/url', data);
} catch (error) {
  alert('Request failed'); // Generic message
}
```

### After (Status-Code Specific)
```typescript
const { handleError } = useErrorHandler({
  onValidationError: (error) => /* show field errors */,
  onAuthError: (error) => /* redirect to login */,
  onConflict: async (error) => /* refresh and retry */,
});

try {
  await api.post('/url', data);
} catch (error) {
  await handleError(error);
}
```

---

## Next Steps (Phase 10)

- Create comprehensive error handling guide for developers
- Document HTTP status code conventions
- Create troubleshooting guide for common errors
- Add error analytics/monitoring integration
