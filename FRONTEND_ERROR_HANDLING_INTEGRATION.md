# Phase 9: React Frontend Error Handling Integration Guide

## Overview

Phase 9 has fully integrated comprehensive error handling throughout the React frontend. The system:
- Parses backend error responses in standardized JSON format
- Provides status-code-specific error handling in hooks
- Handles field-level validation errors
- Manages conflict resolution (409) with refresh & retry
- Enables automatic retry for transient errors

## Backend Error Response Format

The backend returns errors in this standardized JSON format:

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

## Architecture

### 1. Error Type System (`src/types/errors.ts`)
- Matches backend response format
- Centralized status code to message mapping
- Helper functions: `getUserMessageForStatus()`, `getTitleForStatus()`

### 2. Error Service (`src/services/errorHandling.ts`)
- **parseErrorResponse()**: Convert any error to `ParsedErrorResponse`
- Classification utilities: `isAuthError()`, `isConflictError()`, etc.
- Suggested actions for each status code

### 3. React Hooks
- **useErrorHandler()** (`src/hooks/useErrorHandler.ts`): Main error handling hook
- **useLoginErrorHandler()** (`src/hooks/useAuthErrorHandler.ts`): Specialized for login/auth
- **useRegisterErrorHandler()**: Specialized for registration with field errors
- **useConflictResolution()**: For 409 Conflict scenarios

### 4. Error Utilities
- **loginErrorMessage.ts**: Portal-specific login messages with centralized mapping
- **apiClient/client.ts**: HTTP layer error parsing and conversion

## Integrated Components

### Login Page (`src/pages/auth/Login.tsx`)
✅ **Status**: Fully integrated
- Uses `useLoginErrorHandler()` for portal-specific messaging
- Shows portal-specific error messages (student/employer/institution/admin)
- Preserves existing UI (toast notifications, animations)
- Handles 400 (validation), 401 (invalid credentials), 5xx (server errors)

### Register Page (`src/pages/auth/Register.tsx`)
✅ **Status**: Fully integrated
- Uses `useRegisterErrorHandler()` for field-level validation
- Shows field-specific error messages inline
- Handles registration errors with proper messaging
- Displays combined field errors when validation fails

## Usage Patterns for New Components

### Pattern 1: Basic Error Handling

```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';

export function MyComponent() {
  const { handleError, parsedError } = useErrorHandler({
    onValidationError: (error) => {
      console.log('Show field errors:', error.fieldValidations);
    },
    onAuthError: (error) => {
      window.location.href = '/login'; // Redirect
    },
    onUnexpected: (error) => {
      console.log('Show error alert:', error.userMessage);
    },
  });

  const fetchData = async () => {
    try {
      const response = await fetch('/api/resource');
      if (!response.ok) {
        const errorData = await response.json();
        await handleError(errorData);
        return;
      }
    } catch (error) {
      await handleError(error);
    }
  };

  return (
    <div>
      {parsedError && (
        <div className="alert alert-danger">
          {parsedError.userMessage}
        </div>
      )}
      <button onClick={fetchData}>Load Data</button>
    </div>
  );
}
```

### Pattern 2: Form with Field Validation (400)

```typescript
import { useFormErrorHandler } from '../hooks/useErrorHandler';

export function MyForm() {
  const { handleError, getFieldError, getAllFieldErrors } = useFormErrorHandler({
    onValidationError: (error) => {
      console.log('Validation failed');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/submit', { method: 'POST' });
      if (!response.ok) {
        await handleError(await response.json());
      }
    } catch (error) {
      await handleError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input type="email" name="email" />
        {getFieldError('email') && (
          <span className="error">{getFieldError('email')}</span>
        )}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Pattern 3: Conflict Resolution (409)

```typescript
import { useConflictResolution } from '../hooks/useErrorHandler';

export function MyResourceEditor() {
  const [resource, setResource] = useState();
  
  const conflictResolution = useConflictResolution(async () => {
    // Refresh data from server
    const response = await fetch('/api/resource/123');
    setResource(await response.json());
  });

  const handleSave = async () => {
    try {
      const response = await fetch('/api/resource/123', {
        method: 'PUT',
        body: JSON.stringify(resource),
      });
      
      if (response.status === 409) {
        await conflictResolution.resolveConflict(await response.json());
        alert('Data changed. Please review and retry.');
      }
    } catch (error) {
      await conflictResolution.resolveConflict(error);
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### Pattern 4: Login with Portal-Specific Messages

```typescript
import { useLoginErrorHandler } from '../hooks/useAuthErrorHandler';

export function PortalLogin({ portal = 'student' }) {
  const { handleLoginError } = useLoginErrorHandler({ portal });

  const handleSubmit = async (email, password) => {
    try {
      await loginAPI(email, password);
    } catch (error) {
      const message = await handleLoginError(error);
      showToast(message, 'error'); // Portal-specific message
    }
  };

  return <LoginForm onSubmit={handleSubmit} />;
}
```

## Status Code Handling

| Code | Component | Behavior | User Message |
|------|-----------|----------|--------------|
| **400** | onValidationError | Show field errors | "Please check the highlighted fields" |
| **401** | onAuthError | Redirect to login or ask to re-authenticate | "Session expired. Please log in again." |
| **403** | onAuthError | Show access denied | "You lack permission" |
| **404** | onNotFound | Show not found | "Resource no longer exists" |
| **409** | onConflict | Refresh state and prompt retry | "Data changed. Please refresh and retry." |
| **5xx** | onUnexpected | Show error with retry option | "Server error. Please try again." |

## Error Response Preservation

**Important**: The API client now preserves the full backend error response (including `error_code`, `timestamp`, `context`) in the `data` field of ApiError instances. This enables:

1. **Status code mapping** - Consistent messages via `STATUS_CODE_MESSAGE_MAP`
2. **Field validation** - Extract from `context` field automatically
3. **Error tracking** - `error_code` and `timestamp` for logging/monitoring
4. **Debugging** - Full context preserved for developer tools

## Migration Checklist for New Components

- [ ] Import appropriate hook (`useErrorHandler`, `useFormErrorHandler`, `useLoginErrorHandler`, `useConflictResolution`)
- [ ] Wrap API calls in try/catch with `handleError()`
- [ ] Handle auth errors (401/403) with redirect or dialog
- [ ] Handle validation errors (400) with field-level display
- [ ] Handle conflicts (409) with refresh/retry
- [ ] Handle server errors (5xx) with retry option
- [ ] Test all error scenarios before deployment

## Testing Error Responses

Use these backend responses for local testing:

```json
// 400 Validation Error
{
  "error_code": "VALIDATION_ERROR",
  "message": "Invalid data",
  "status_code": 400,
  "timestamp": "2026-04-11T13:58:41Z",
  "context": {
    "email": ["Email is required.", "Email must be valid."],
    "password": ["Password must be at least 8 characters."]
  }
}

// 401 Auth Error
{
  "error_code": "AUTHENTICATION_ERROR",
  "message": "Invalid credentials",
  "status_code": 401,
  "timestamp": "2026-04-11T13:58:41Z"
}

// 409 Conflict
{
  "error_code": "CONFLICT_ERROR",
  "message": "Resource was modified",
  "status_code": 409,
  "timestamp": "2026-04-11T13:58:41Z",
  "context": { "version": "2" }
}
```

## Integration Points

✅ **Already Integrated**:
- Login page (src/pages/auth/Login.tsx)
- Register page (src/pages/auth/Register.tsx)
- API client error handling (src/services/api/client.ts)
- Error utilities (src/utils/loginErrorMessage.ts)

### To Integrate in Other Components:

1. **Data Fetching Components** (student list, internships, etc.)
   - Use `useErrorHandler()` with `onNotFound`, `onUnexpected`
   - Show retry button for 5xx errors

2. **Form Components** (create/edit dialogs, modals)
   - Use `useFormErrorHandler()` or `useErrorHandler()`
   - Display field errors inline

3. **Resource Editor Components** (edit profile, update settings)
   - Use `useConflictResolution()` for optimistic updates
   - Handle 409 Conflict gracefully

4. **Admin Components**
   - Use portal-agnostic error handling
   - Apply consistent error messages across all admin portals

## Notes for Future Development

- All error responses now follow REST standard format (400, 401, 403, 404, 409, 5xx)
- Field validation errors will be in `context` object
- Error tracking tags available via `error_code` field
- Timestamp ensures chronological logging
- Frontend can now automatically display field errors without parsing

## Questions/Issues?

If you encounter errors that don't fit the patterns:
1. Check if backend is returning proper JSON format
2. Verify error_code matches expected values (VALIDATION_ERROR, AUTHENTICATION_ERROR, etc.)
3. Ensure context object includes field names as keys if validation errors
4. File an issue with the full backend error response
