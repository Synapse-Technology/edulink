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

from django.db import DatabaseError, OperationalError
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from .error_handling import EduLinkError, TransientError

logger = logging.getLogger(__name__)


def edulink_exception_handler(exc: Exception, context: dict) -> Optional[Response]:
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
    
    Note: Returns a DRF Response object following DRF custom exception handler convention.
    """
    
    # Handle domain errors (EduLink exceptions)
    if isinstance(exc, EduLinkError):
        response = _format_domain_error(exc)
        return response
    
    # Try default DRF exception handler for APIException
    if isinstance(exc, APIException):
        response = drf_exception_handler(exc, context)
        if response is not None:
            response = _format_api_error(exc, response)
            return response
        return response

    if isinstance(exc, (OperationalError, DatabaseError)):
        request = context.get("request")
        logger.warning(
            "Database temporarily unavailable",
            extra={"path": request.path} if request else {},
            exc_info=True,
        )
        return _format_domain_error(
            TransientError(
                user_message="The service is temporarily unavailable. Please try again shortly.",
                developer_message=f"{exc.__class__.__name__}: {exc}",
                error_code="DATABASE_UNAVAILABLE",
            )
        )
    
    # Unhandled exception - log and return 500
    logger.exception("Unhandled exception in API request", extra={"path": context.get("request").path} if context.get("request") else {})
    response = _format_unhandled_error(exc)
    return response


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
        validation_errors = exc.context.get("validation_errors") if isinstance(exc.context, dict) else None
        if isinstance(validation_errors, dict) and validation_errors:
            data["field_errors"] = validation_errors
    
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
    response_data = response.data if isinstance(response.data, dict) else {}

    if exc_name == "ValidationError":
        field_errors = _extract_field_errors(response_data)
        message = _first_non_empty_message(response_data.get("detail")) or "Please correct the highlighted fields and try again."
        data = {
            "error_code": error_code,
            "message": message,
            "status_code": response.status_code,
        }
        if field_errors:
            data["field_errors"] = field_errors
        return Response(data, status=response.status_code)
    
    # Extract detail message
    detail = response_data.get("detail") if response_data else str(response.data)
    
    # Reconstruct response in EduLink format
    data = {
        "error_code": error_code,
        "message": _first_non_empty_message(detail) or "An error occurred.",
        "status_code": response.status_code,
    }
    
    # Keep additional details if present (e.g., for validation errors)
    if response_data:
        # Copy field-level errors for validation errors
        for key, value in response_data.items():
            if key != "detail":
                data[key] = value
    
    return Response(data, status=response.status_code)


def _extract_field_errors(data: dict) -> dict:
    if not isinstance(data, dict):
        return {}

    field_errors = {}
    for key, value in data.items():
        if key in {"detail", "status_code", "error_code", "message"}:
            continue

        if isinstance(value, dict) and "errors" in value:
            errors = value.get("errors")
        elif isinstance(value, list):
            errors = value
        else:
            errors = [value]

        normalized = [str(error).strip() for error in errors if str(error).strip()]
        if normalized:
            field_errors[key] = normalized

    return field_errors


def _first_non_empty_message(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.lower() in {"none", "null", "undefined"}:
            return ""
        return stripped
    return str(value).strip()


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
