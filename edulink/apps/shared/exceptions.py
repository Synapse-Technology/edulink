"""
DRF Exception Handler for EduLink

Provides uniform error response formatting for all API exceptions:
- Domain errors (from error_handling.py) with user_message + ErrorContext
- Django/DRF built-in exceptions with sensible defaults
- Unhandled exceptions converted to 500 with safe error messages

Registered in REST_FRAMEWORK['EXCEPTION_HANDLER'] in settings.
"""

import logging
from typing import Optional, Any

from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from .error_handling import EduLinkError

logger = logging.getLogger(__name__)


def edulink_exception_handler(exc: Exception, context: dict) -> Optional[tuple[Response, int]]:
    """
    Custom DRF exception handler that:
    1. Handles EduLinkError with proper JSON formatting
    2. Falls back to DRF default handler for APIException
    3. Catches unhandled exceptions and logs them
    
    Response format:
    {
        "error_code": "NOT_FOUND",
        "message": "The requested resource does not exist",
        "status_code": 404,
        "timestamp": "2026-04-11T13:25:00.000Z",
        "context": {...}  # Optional, only if present
    }
    
    Note: Returns (response, None) following DRF convention where:
    - response: Response(data, status)
    - None: (DRF doesn't use status_code in tuple, it's in Response object)
    """
    
    # Handle domain errors (EduLink exceptions)
    if isinstance(exc, EduLinkError):
        response = _format_domain_error(exc)
        return (response, None)
    
    # Try default DRF exception handler for APIException
    if isinstance(exc, APIException):
        response = drf_exception_handler(exc, context)
        if response is not None:
            response = _format_api_error(exc, response)
            return (response, None)
        return response
    
    # Unhandled exception - log and return 500
    logger.exception("Unhandled exception in API request", extra={"path": context.get("request").path} if context.get("request") else {})
    response = _format_unhandled_error(exc)
    return (response, None)


def _format_domain_error(exc: EduLinkError) -> Response:
    """Format EduLinkError as JSON response with proper status code."""
    data = {
        "error_code": exc.error_code,
        "message": exc.user_message,
        "status_code": exc.http_status,
        "timestamp": exc.timestamp.isoformat(),
    }
    
    # Include context if available (for debugging)
    if exc.context:
        data["context"] = exc.context
    
    # Include developer message in debug mode (can be controlled by settings)
    # Uncomment if DEBUG=True should include developer details:
    # if settings.DEBUG:
    #     data["developer_message"] = exc.developer_message
    
    return Response(data, status=exc.http_status)


def _format_api_error(exc: APIException, response: Response) -> Response:
    """
    Convert DRF APIException response to EduLink error format.
    
    DRF default response:
    {
        "detail": "Not found.",
        ...
    }
    
    Converted to:
    {
        "error_code": "...",
        "message": "...",
        "status_code": 404,
        ...
    }
    """
    # Map common DRF exception types to our error codes
    error_code_map = {
        "NotFound": "NOT_FOUND",
        "PermissionDenied": "UNAUTHORIZED",
        "ValidationError": "VALIDATION_ERROR",
        "Throttled": "RATE_LIMIT_EXCEEDED",
        "AuthenticationFailed": "UNAUTHORIZED",
    }
    
    exc_name = exc.__class__.__name__
    error_code = error_code_map.get(exc_name, "API_ERROR")
    
    # Extract detail message
    detail = response.data.get("detail") if isinstance(response.data, dict) else str(response.data)
    
    # Reconstruct response in EduLink format
    data = {
        "error_code": error_code,
        "message": str(detail),
        "status_code": response.status_code,
    }
    
    # Keep additional details if present (e.g., for validation errors)
    if isinstance(response.data, dict):
        # Copy field-level errors for validation errors
        for key, value in response.data.items():
            if key != "detail":
                data[key] = value
    
    return Response(data, status=response.status_code)


def _format_unhandled_error(exc: Exception) -> Response:
    """
    Safe error response for unhandled exceptions.
    Never expose internal error details to clients.
    """
    data = {
        "error_code": "INTERNAL_ERROR",
        "message": "An unexpected error occurred. Please contact support.",
        "status_code": 500,
    }
    
    return Response(data, status=500)
