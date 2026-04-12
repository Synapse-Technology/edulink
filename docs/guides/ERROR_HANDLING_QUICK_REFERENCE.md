# Error Handling Quick Reference Guide

A fast lookup guide for implementing error handling in new components.

---

## 1. Quick Start: Using Error Handling in a Component

### Basic Pattern (Copy & Paste)

```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';

export const MyComponent = () => {
  const { handleError, parsedError, clearError } = useErrorHandler({
    onValidationError: (err) => console.warn('Validation:', err.fieldErrors),
    onAuthError: (err) => redirectToLogin(),
    onConflict: async (err) => {
      // Refresh data and let user retry
      await refreshData();
      showDialog('Data changed. Reloaded latest version.');
    },
    onUnexpected: (err) => showErrorAlert(err.userMessage),
  });

  const fetchData = async () => {
    try {
      const response = await api.get('/endpoint');
      setData(response.data);
    } catch (error) {
      await handleError(error);
    }
  };

  return (
    <div>
      {parsedError && <ErrorAlert message={parsedError.userMessage} />}
      <button onClick={fetchData}>Load</button>
    </div>
  );
};
```

---

## 2. HTTP Status Codes at a Glance

| Code | Name | Hook to Use | User Message | Action |
|------|------|-------------|--------------|--------|
| **400** | Bad Request | `onValidationError` | "Please correct: [field names]" | Show field errors |
| **401** | Unauthorized | `onAuthError` | "Session expired. Log in again." | Redirect to login |
| **403** | Forbidden | `onAuthError` | "You don't have permission." | Show message, disable action |
| **404** | Not Found | `onUnexpected` | "Resource no longer exists." | Redirect to list |
| **409** | Conflict | `onConflict` | "Data changed. Reloaded." | Refresh and retry |
| **429** | Rate Limited | `onUnexpected` | "Too many requests. Wait..." | Show wait time |
| **5xx** | Server Error | `onUnexpected` | "Server error. Try again." | Show retry button |

---

## 3. Form Error Handling

### For Forms with Field-Level Errors

```typescript
import { useFormErrorHandler } from '../hooks/useErrorHandler';

export const MyForm = () => {
  const { getFieldError, hasFieldErrors, clearFieldError } = 
    useFormErrorHandler();

  const handleSubmit = async (formData) => {
    try {
      await api.post('/submit', formData);
      showSuccess('Saved!');
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" />
      {getFieldError('email') && (
        <span className="error">{getFieldError('email')}</span>
      )}
      
      <input type="password" />
      {getFieldError('password') && (
        <span className="error">{getFieldError('password')}</span>
      )}
      
      <button type="submit">Submit</button>
    </form>
  );
};
```

### Backend Response Format (for 400 Validation)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "status_code": 400,
  "context": {
    "email": ["Email is required.", "Email must be valid."],
    "password": ["At least 8 characters."]
  }
}
```

---

## 4. Login/Register Specific

### For Authentication Pages

```typescript
import { useLoginErrorHandler } from '../hooks/useAuthErrorHandler';

export const LoginForm = ({ portal = 'student' }) => {
  const { handleError, parsedError } = useLoginErrorHandler(portal);

  const handleLogin = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      setAuthToken(response.token);
      redirectToDashboard();
    } catch (error) {
      await handleError(error);
    }
  };

  return (
    <div>
      {parsedError && <ErrorBox message={parsedError.userMessage} />}
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};
```

### Portal-Specific Messages Automatically Used

The `useLoginErrorHandler` hook automatically shows different messages:
- **Student**: "Incorrect email or password"
- **Employer**: "Invalid employer email or password"  
- **Institution**: "Invalid institution email or password"
- **Admin**: "Invalid admin email or password"

---

## 5. API Call Patterns

### Simple GET Request

```typescript
const getData = async () => {
  try {
    const response = await api.get('/api/resource');
    setData(response.data);
  } catch (error) {
    await handleError(error);
  }
};
```

### POST Request (Creation)

```typescript
const createItem = async (itemData) => {
  try {
    const response = await api.post('/api/items', itemData);
    showToast.success('Created successfully');
    return response.data;
  } catch (error) {
    await handleError(error);
    throw error; // Re-throw if needed by caller
  }
};
```

### PUT Request (Update)

```typescript
const updateItem = async (id, updates) => {
  try {
    const response = await api.put(`/api/items/${id}`, updates);
    showToast.success('Updated successfully');
    return response.data;
  } catch (error) {
    // Check for conflict
    if (error.response?.status === 409) {
      // Handle conflict: refresh and notify
      const fresh = await api.get(`/api/items/${id}`);
      setData(fresh.data);
    }
    await handleError(error);
  }
};
```

### DELETE Request

```typescript
const deleteItem = async (id) => {
  try {
    await api.delete(`/api/items/${id}`);
    showToast.success('Deleted successfully');
    refetchList();
  } catch (error) {
    if (error.response?.status === 404) {
      // Already deleted, just remove from UI
      removeFromList(id);
    }
    await handleError(error);
  }
};
```

---

## 6. Common Error Scenarios & Solutions

### Scenario 1: Delete Already-Deleted Resource (404)

```typescript
const handleDelete = async (id) => {
  try {
    await api.delete(`/api/resource/${id}`);
  } catch (error) {
    if (error.response?.status === 404) {
      // Already gone, remove from UI without alerting user
      removeFromList(id);
      return;
    }
    await handleError(error);
  }
};
```

### Scenario 2: Edit Stale Data (409)

```typescript
const handleUpdate = async (id, updates) => {
  try {
    await api.put(`/api/resource/${id}`, updates);
  } catch (error) {
    if (error.response?.status === 409) {
      // Show what changed, let user merge
      const latest = await api.get(`/api/resource/${id}`);
      showMergeDialog({
        current: updates,
        latest: latest.data,
      });
      return;
    }
    await handleError(error);
  }
};
```

### Scenario 3: Validation Error on Create (400)

```typescript
const handleCreate = async (formData) => {
  try {
    await api.post('/api/resource', formData);
  } catch (error) {
    const { fieldErrors } = parseErrorResponse(error.response?.data);
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      // Show field errors inline
      updateFormErrors(fieldErrors);
      return;
    }
    await handleError(error);
  }
};
```

---

## 7. useErrorHandler Hook Reference

### Hook Signature

```typescript
interface ErrorHandlerOptions {
  onValidationError?: (error: ParsedErrorResponse) => void | Promise<void>;
  onAuthError?: (error: ParsedErrorResponse) => void | Promise<void>;
  onConflict?: (error: ParsedErrorResponse) => void | Promise<void>;
  onNotFound?: (error: ParsedErrorResponse) => void | Promise<void>;
  onUnexpected?: (error: ParsedErrorResponse) => void | Promise<void>;
}

const {
  handleError,           // Call this with error/response
  parsedError,          // Current error state
  clearError,           // Clear current error
  isLoading,            // Loading state
  retry,                // Retry last failed operation
} = useErrorHandler(options);
```

### ParsedErrorResponse Structure

```typescript
interface ParsedErrorResponse {
  errorCode: string;              // e.g., "VALIDATION_ERROR"
  userMessage: string;            // User-friendly message
  statusCode: number;             // 400, 401, 404, etc.
  fieldErrors: Record<string, string>; // { email: "Invalid" }
  isRetryable: boolean;           // true for 5xx, false for 4xx
  originalResponse?: any;         // Full backend response
}
```

---

## 8. Component File Template

Use this template for new data-fetching components:

```typescript
import React, { useEffect, useState } from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { api } from '../services/api/client';

interface Props {
  id?: string;
  onSuccess?: () => void;
}

export const MyDataComponent: React.FC<Props> = ({ id, onSuccess }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { handleError, parsedError, clearError } = useErrorHandler({
    onUnexpected: (err) => console.error(err),
  });

  // Load data on mount or when id changes
  useEffect(() => {
    if (!id) return;
    
    const loadData = async () => {
      setIsLoading(true);
      clearError();
      try {
        const response = await api.get(`/api/resource/${id}`);
        setData(response.data);
      } catch (error) {
        await handleError(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Loading state
  if (isLoading) return <Skeleton />;
  
  // Error state
  if (parsedError) {
    return (
      <ErrorCard 
        error={parsedError.userMessage}
        onRetry={() => loadData()}
      />
    );
  }
  
  // Empty state
  if (!data) return <EmptyState />;
  
  // Success state
  return (
    <div>
      {/* Render data */}
    </div>
  );
};
```

---

## 9. Testing Error Handling

### Unit Test Pattern

```typescript
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';

describe('useErrorHandler', () => {
  it('should handle validation errors', async () => {
    const onValidationError = vi.fn();
    const { result } = renderHook(() =>
      useErrorHandler({ onValidationError })
    );

    await act(async () => {
      const error = {
        response: {
          status: 400,
          data: {
            error_code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            context: { email: ['Email required'] },
          },
        },
      };
      await result.current.handleError(error);
    });

    expect(onValidationError).toHaveBeenCalled();
    expect(result.current.parsedError?.fieldErrors.email).toBe('Email required');
  });
});
```

### Integration Test Pattern

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('LoginForm', () => {
  it('should show field errors for validation failures', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginForm />);

    fireEvent.click(getByText('Login'));

    await waitFor(() => {
      expect(getByText('Email is required.')).toBeInTheDocument();
    });
  });
});
```

---

## 10. DO's and DON'Ts

### DO ✅

- [x] Use `useErrorHandler()` hook for all API calls
- [x] Show field-level errors from context
- [x] Use portal-specific messages where applicable
- [x] Call `clearError()` when retrying
- [x] Test error paths in components
- [x] Handle 409 conflicts specially (refresh data)
- [x] Show loading skeletons while fetching
- [x] Preserve form state on validation errors
- [x] Log errors to console in development

### DON'T ❌

- [ ] Don't throw errors without handling
- [ ] Don't show stack traces to users
- [ ] Don't use generic "Error" messages
- [ ] Don't ignore field validation errors
- [ ] Don't clear form data on error
- [ ] Don't make API calls in useEffect without cleanup
- [ ] Don't hide errors in try/catch
- [ ] Don't forget to test error scenarios
- [ ] Don't assume API responses have all fields

---

## 11. Error Message Examples

### For Users

✅ Good:
```
"Email is required."
"Password must be at least 8 characters."
"You don't have permission to edit this internship."
"This internship is no longer accepting applications."
"The data was modified. Please review the changes."
```

❌ Bad:
```
"Error: 400"
"Internal server error"
"Something went wrong"
"Failed"
```

---

## 12. Debugging Error Handling

### Check Backend Response in Browser

1. Open DevTools → Network tab
2. Filter for XHR/Fetch
3. Find failed request
4. Click on request
5. Go to "Response" tab
6. See JSON structure

Expected format:
```json
{
  "error_code": "...",
  "message": "...",
  "status_code": 400,
  "context": { "field": ["error"] }
}
```

### Test Error Handling Locally

```typescript
// In component for testing:
const mockError = {
  response: {
    status: 400,
    data: {
      error_code: 'VALIDATION_ERROR',
      message: 'Validation error',
      context: {
        email: ['Email is invalid'],
      },
    },
  },
};

// In onClick:
handleError(mockError);
```

### Check Console

- Development: Full error details logged  
- Production: Stack traces hidden, user message shown

---

## 13. Quick Links

- Error Type Definitions: `src/types/errors.ts`
- Error Parsing: `src/services/errorHandling.ts`
- Error Hooks: `src/hooks/useErrorHandler.ts`
- Auth Hooks: `src/hooks/useAuthErrorHandler.ts`
- API Client: `src/services/api/client.ts`
- Portal Messages: `src/utils/loginErrorMessage.ts`

---

## 14. Getting Help

**For error handling questions**:
1. Check this guide
2. Review example components (Login.tsx, Register.tsx)
3. Look at integration tests
4. Check documentation in PHASE_10_*.md files

**For backend errors**:
1. Check error definition in `edulink/apps/*/errors.py`
2. Review exception handler: `config/exception_handler.py`
3. Check middleware: `config/middleware/exception_middleware.py`

---

**Version**: 1.0 (Phase 10)
**Last Updated**: Phase 10 — Documentation & Standards
**For Questions**: Refer to PHASE_10_STANDARDS_AND_ENHANCEMENT_PLAN.md
