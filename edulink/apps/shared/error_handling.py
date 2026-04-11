"""
Error Handling System for EduLink

Provides structured exception hierarchy for domain errors with:
- Error categorization (validation, authorization, conflict, transient)
- HTTP status mapping
- User-friendly error messages
- Structured logging support
"""

import logging
from abc import ABC
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

__all__ = [
    "EduLinkError",
    "ValidationError",
    "NotFoundError",
    "AuthorizationError",
    "ConflictError",
    "TransientError",
    "RateLimitError",
    "IntegrationError",
    "ErrorContext",
    "ErrorHandler",
    "format_error_response",
]

logger = logging.getLogger(__name__)


class EduLinkError(Exception, ABC):
    """
    Base exception for Edulink domain errors.
    
    Attributes:
        error_code: Machine-readable error code (enum-like)
        http_status: REST API HTTP status code
        user_message: User-friendly error message
        developer_message: Technical details for developers/logs
        context: Additional context data for debugging
        timestamp: When error occurred
    """

    error_code: str = "GENERIC_ERROR"
    http_status: int = 500
    user_message: str = "An unexpected error occurred"
    
    def __init__(
        self,
        user_message: Optional[str] = None,
        developer_message: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None,
        http_status: Optional[int] = None,
    ):
        """Initialize error with optional override of class attributes."""
        self.developer_message = developer_message or str(self.__class__.__name__)
        self.context = context or {}
        self.timestamp = datetime.utcnow()
        
        # Allow instance-level overrides
        if user_message:
            self.user_message = user_message
        if error_code:
            self.error_code = error_code
        if http_status:
            self.http_status = http_status
            
        super().__init__(self.user_message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize error for API responses or logging."""
        return {
            "error_code": self.error_code,
            "message": self.user_message,
            "timestamp": self.timestamp.isoformat(),
            **({"context": self.context} if self.context else {}),
        }
    
    def to_debug_dict(self) -> Dict[str, Any]:
        """Serialize error with developer details for logging."""
        return {
            "error_code": self.error_code,
            "message": self.user_message,
            "developer_message": self.developer_message,
            "timestamp": self.timestamp.isoformat(),
            **({"context": self.context} if self.context else {}),
        }
    
    def is_retrievable(self) -> bool:
        """Whether error is user-actionable (not server error)."""
        return 400 <= self.http_status < 500
    
    def is_transient(self) -> bool:
        """Whether error is transient and retryable."""
        return self.http_status in (429, 503)
    
    @property
    def status_code(self) -> int:
        """Alias for http_status for compatibility with API response handlers."""
        return self.http_status


class ValidationError(EduLinkError):
    """
    User provided invalid data.
    
    Examples:
    - Missing required fields
    - Invalid date format
    - Constraint violations
    - Invalid state transition
    """
    
    error_code = "VALIDATION_ERROR"
    http_status = 400
    user_message = "The data you provided is invalid"


class NotFoundError(EduLinkError):
    """
    Requested resource does not exist.
    
    Examples:
    - User not found
    - Assignment does not exist
    - Opportunity closed
    """
    
    error_code = "NOT_FOUND"
    http_status = 404
    user_message = "The requested resource does not exist"


class AuthorizationError(EduLinkError):
    """
    User lacks permission to perform action.
    
    Examples:
    - User is not the assigned supervisor
    - User role lacks permission
    - Attempt to modify another user's data
    """
    
    error_code = "UNAUTHORIZED"
    http_status = 403
    user_message = "You are not authorized to perform this action"


class ConflictError(EduLinkError):
    """
    Action conflicts with current system state.
    
    Examples:
    - Assignment already accepted
    - Incident already closed
    - Evidence already reviewed
    - Supervisor already assigned
    """
    
    error_code = "CONFLICT"
    http_status = 409
    user_message = "This action conflicts with current system state"


class TransientError(EduLinkError):
    """
    Recoverable error - should be retried.
    
    Examples:
    - Database connection timeout
    - Service temporarily unavailable
    - Rate limit exceeded
    - Network timeout
    """
    
    error_code = "TRANSIENT_ERROR"
    http_status = 503
    user_message = "Service temporarily unavailable. Please try again later"
    
    def is_transient(self) -> bool:
        """TransientError is always retryable."""
        return True


class RateLimitError(EduLinkError):
    """
    User has exceeded rate limits.
    
    Includes retry-after guidance.
    """
    
    error_code = "RATE_LIMIT_EXCEEDED"
    http_status = 429
    user_message = "Too many requests. Please try again later"
    
    def __init__(
        self,
        retry_after: Optional[int] = None,
        **kwargs
    ):
        """
        Initialize rate limit error.
        
        Args:
            retry_after: Seconds until next attempt allowed
        """
        super().__init__(**kwargs)
        self.retry_after = retry_after or 60
    
    def to_dict(self) -> Dict[str, Any]:
        """Include retry-after in response."""
        data = super().to_dict()
        data["retry_after"] = self.retry_after
        return data
    
    def is_transient(self) -> bool:
        """Rate limits are retryable."""
        return True


class IntegrationError(EduLinkError):
    """
    Error communicating with external service.
    
    Examples:
    - Email service down
    - SMS gateway timeout
    - Payment processor error
    - External API error
    """
    
    error_code = "INTEGRATION_ERROR"
    http_status = 502
    user_message = "An external service is temporarily unavailable"
    
    def __init__(
        self,
        service_name: str,
        **kwargs
    ):
        """
        Initialize integration error.
        
        Args:
            service_name: Name of failing service (email, sms, payment, etc.)
        """
        super().__init__(**kwargs)
        self.service_name = service_name
        self.context["service"] = service_name


class ErrorContext:
    """
    Builder for error context - helps pass structured debugging info.
    
    Example:
        ctx = (ErrorContext()
               .with_user_id(user_id)
               .with_resource("assignment", assignment_id)
               .with_reason("User role is COORDINATOR, needs MODERATOR"))
        raise AuthorizationError(context=ctx.build())
    """
    
    def __init__(self):
        """Initialize empty context."""
        self._context: Dict[str, Any] = {}
    
    def with_user_id(self, user_id: UUID) -> "ErrorContext":
        """Add acting user ID to context."""
        self._context["user_id"] = str(user_id)
        return self
    
    def with_resource(self, resource_type: str, resource_id: Any) -> "ErrorContext":
        """Add affected resource to context."""
        self._context["resource_type"] = resource_type
        self._context["resource_id"] = str(resource_id)
        return self
    
    def with_reason(self, reason: str) -> "ErrorContext":
        """Add explanation of why error occurred."""
        self._context["reason"] = reason
        return self
    
    def with_current_state(self, state: Any) -> "ErrorContext":
        """Add current entity state for debugging."""
        self._context["current_state"] = state
        return self
    
    def with_expected_state(self, state: Any) -> "ErrorContext":
        """Add expected/required entity state."""
        self._context["expected_state"] = state
        return self
    
    def with_data(self, **kwargs) -> "ErrorContext":
        """Add arbitrary key-value data."""
        self._context.update(kwargs)
        return self
    
    def build(self) -> Dict[str, Any]:
        """Get built context dictionary."""
        return self._context.copy()


class ErrorHandler:
    """
    Centralized error handling utilities.
    
    Provides:
    - Error logging with appropriate levels
    - Error response formatting
    - Error code to HTTP status mapping
    """
    
    @staticmethod
    def log_error(
        error: EduLinkError,
        request_id: Optional[str] = None,
        extra_context: Optional[Dict] = None,
    ) -> None:
        """
        Log error with appropriate level based on error type.
        
        Args:
            error: The EduLinkError to log
            request_id: Request ID for correlation
            extra_context: Additional context to include
        """
        log_context = {
            "error_code": error.error_code,
            "http_status": error.http_status,
        }
        
        if request_id:
            log_context["request_id"] = request_id
        
        if extra_context:
            log_context.update(extra_context)
        
        if error.context:
            log_context["error_context"] = error.context
        
        if error.is_retrievable():
            # Client error - info level
            logger.info(
                f"Client error: {error.error_code}",
                extra=log_context
            )
        else:
            # Server error - warning level
            logger.warning(
                f"Server error: {error.error_code}",
                extra=log_context,
                exc_info=True,
            )
    
    @staticmethod
    def extract_validation_errors(error: ValidationError) -> Dict[str, list]:
        """
        Extract field-level validation errors from context.
        
        Assumes context["validation_errors"] is dict of field -> [errors]
        
        Returns:
            Dict of field names to error messages
        """
        if "validation_errors" not in error.context:
            return {}
        
        return error.context["validation_errors"]


def format_error_response(error: EduLinkError) -> Dict[str, Any]:
    """
    Format error for HTTP response body.
    
    Args:
        error: The EduLinkError
    
    Returns:
        Dictionary ready for JSON response
    """
    response = {
        "error": error.error_code,
        "message": error.user_message,
    }
    
    # Add retry-after for rate limit errors
    if isinstance(error, RateLimitError):
        response["retry_after"] = error.retry_after
    
    # Add timestamp
    response["timestamp"] = error.timestamp.isoformat()
    
    return response
