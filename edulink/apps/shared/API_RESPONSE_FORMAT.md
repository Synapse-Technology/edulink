"""
API Response Format - Standardized for all endpoints

All API responses follow this unified format:

SUCCESS RESPONSE:
{
    "success": true,
    "data": {...},                    // Response data (list/object/scalar)
    "pagination": {                   // Optional, for list endpoints
        "count": 100,
        "page": 1,
        "page_size": 20,
        "total_pages": 5
    },
    "timestamp": "2026-04-12T10:00:00Z"
}

ERROR RESPONSE (from exception handler):
{
    "error_code": "NOT_FOUND",         // Machine-readable error code
    "message": "Resource not found",   // User-friendly message
    "status_code": 404,
    "timestamp": "2026-04-12T10:00:00Z",
    "context": {...}                  // Optional, for debugging
}

RATE LIMIT ERROR:
{
    "error_code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "status_code": 429,
    "retry_after": 300,               // Seconds to wait
    "timestamp": "2026-04-12T10:00:00Z"
}

VALIDATION ERROR:
{
    "error_code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "status_code": 400,
    "timestamp": "2026-04-12T10:00:00Z",
    "field_errors": {                 // Field-level validation errors
        "email": ["Invalid email format"],
        "password": ["Must be at least 8 characters"]
    }
}

AUTHORIZATION ERROR:
{
    "error_code": "UNAUTHORIZED",
    "message": "You do not have permission to access this resource",
    "status_code": 403,
    "timestamp": "2026-04-12T10:00:00Z"
}

---

ERROR CODES (Enum-like constants):

Client Errors (4xx):
- VALIDATION_ERROR (400): Input validation failed
- UNAUTHORIZED (401): Authentication required
- PERMISSION_DENIED (403): Not authorized for this action
- NOT_FOUND (404): Resource does not exist
- CONFLICT (409): Request conflicts with current state
- RATE_LIMIT_EXCEEDED (429): Too many requests

Server Errors (5xx):
- INTERNAL_ERROR (500): Unexpected server error
- SERVICE_UNAVAILABLE (503): Service temporarily unavailable

---

HOW TO USE IN CODE:

1. Services should raise EduLinkError exceptions:
   ```python
   from edulink.apps.shared.error_handling import NotFoundError, ValidationError
   
   if not student:
       raise NotFoundError(
           user_message="Student not found",
           developer_message=f"No student with ID {student_id}",
           context=ErrorContext().with_user_id(request.user.id).build()
       )
   ```

2. Views should let exceptions propagate (DON'T catch and re-wrap):
   ```python
   # GOOD:
   def get_object(self):
       return super().get_object()  # Raises Http404, automatically handled
   
   # BAD (avoid):
   def get_object(self):
       try:
           return super().get_object()
       except Http404:
           return Response({'error': 'Not found'}, status=400)  # Wrong!
   ```

3. Middleware + Exception Handler will catch and format errors automatically

4. For custom validation, use serializer.is_valid(raise_exception=True)
   DRF automatically converts to ValidationError

---

STATUS CODES MAPPING:

200 OK - Successful GET/PUT/PATCH
201 Created - Successful POST creating resource
204 No Content - Successful DELETE
400 Bad Request - Validation error
401 Unauthorized - Authentication failed
403 Forbidden - Authorization failed (insufficient permissions)
404 Not Found - Resource doesn't exist
409 Conflict - State conflict (e.g., unique constraint, already approved)
429 Too Many Requests - Rate limit exceeded
500 Internal Server Error - Unexpected server error
503 Service Unavailable - Dependency down (database, external service)
