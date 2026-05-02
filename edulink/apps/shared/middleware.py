"""
Django Middleware for Exception Handling

Catches unhandled exceptions at the view layer and converts them to proper
error responses following the EduLink error format. Works alongside the
DRF exception handler for a complete safety net.

Applied globally to ensure no bare exceptions escape to the client.
"""

import logging
import json
from datetime import UTC, datetime
from typing import Callable

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.core.exceptions import PermissionDenied, ObjectDoesNotExist, ValidationError as DjangoValidationError
from django.db import DatabaseError, IntegrityError, OperationalError

from .error_handling import (
    EduLinkError,
    NotFoundError,
    ValidationError,
    ConflictError,
    AuthorizationError,
    ErrorContext,
    TransientError,
)

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware:
    """
    Middleware that converts unhandled exceptions into proper API error responses.
    
    Handles common exception types:
    - EduLink domain errors: Pass through properly serialized
    - Django PermissionDenied: Convert to 403 AuthorizationError
    - ObjectDoesNotExist: Convert to 404 NotFoundError
    - IntegrityError: Convert to 409 ConflictError
    - ValidationError: Convert to 400 ValidationError
    - All others: Convert to 500 INTERNAL_ERROR
    
    This middleware should be placed HIGH in the middleware stack to catch
    exceptions from all subsequent layers.
    """

    def __init__(self, get_response: Callable):
        """Initialize middleware with the WSGI application."""
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        """Process request and handle any exceptions."""
        try:
            response = self.get_response(request)
            return response
        except EduLinkError as exc:
            # Domain errors: convert to proper response
            return self._handle_domain_error(exc, request)
        except PermissionDenied as exc:
            return self._handle_permission_denied(exc, request)
        except ObjectDoesNotExist as exc:
            return self._handle_not_found(exc, request)
        except IntegrityError as exc:
            return self._handle_integrity_error(exc, request)
        except (OperationalError, DatabaseError) as exc:
            return self._handle_database_unavailable(exc, request)
        except DjangoValidationError as exc:
            return self._handle_validation_error(exc, request)
        except Exception as exc:
            # Catch-all for any unhandled exceptions
            return self._handle_unhandled_exception(exc, request)

    def _handle_domain_error(self, exc: EduLinkError, request: HttpRequest) -> JsonResponse:
        """Convert EduLink domain error to JSON response."""
        data = {
            "error_code": exc.error_code,
            "message": exc.user_message,
            "status_code": exc.http_status,
            "timestamp": exc.timestamp.isoformat(),
        }
        
        if exc.context:
            data["context"] = exc.context
        
        # Safely get user_id (may not exist in test requests)
        user_id = None
        if hasattr(request, 'user') and hasattr(request.user, 'id'):
            user_id = request.user.id if request.user.is_authenticated else None
        
        logger.info(
            f"API error: {exc.error_code}",
            extra={
                "path": request.path,
                "method": request.method,
                "user_id": user_id,
                "error_code": exc.error_code,
            }
        )
        
        return JsonResponse(data, status=exc.http_status)

    def _handle_permission_denied(self, exc: PermissionDenied, request: HttpRequest) -> JsonResponse:
        """Convert Django PermissionDenied to 403 AuthorizationError response."""
        # Safely get user_id
        user_id = None
        if hasattr(request, 'user') and hasattr(request.user, 'id'):
            user_id = request.user.id if request.user.is_authenticated else None
        
        error = AuthorizationError(
            user_message="You do not have permission to perform this action.",
            developer_message=str(exc),
            context=ErrorContext()
                .with_user_id(user_id)
                .build() if user_id else ErrorContext().build(),
        )
        
        logger.warning(
            f"Permission denied: {str(exc)}",
            extra={
                "path": request.path,
                "method": request.method,
                "user_id": user_id,
            }
        )
        
        return self._error_to_response(error)

    def _handle_not_found(self, exc: ObjectDoesNotExist, request: HttpRequest) -> JsonResponse:
        """Convert Django ObjectDoesNotExist to 404 NotFoundError response."""
        error = NotFoundError(
            user_message="The requested resource does not exist.",
            developer_message=f"{exc.__class__.__name__}: {str(exc)}",
            context=ErrorContext().build(),
        )
        
        logger.info(
            f"Resource not found: {str(exc)}",
            extra={
                "path": request.path,
                "method": request.method,
            }
        )
        
        return self._error_to_response(error)

    def _handle_integrity_error(self, exc: IntegrityError, request: HttpRequest) -> JsonResponse:
        """Convert Django IntegrityError to 409 ConflictError response."""
        # Extract useful info from database error
        error_msg = str(exc)
        if "UNIQUE constraint failed" in error_msg:
            user_msg = "A record with this information already exists."
        elif "FOREIGN KEY constraint failed" in error_msg:
            user_msg = "Cannot delete or modify this record due to related data."
        else:
            user_msg = "This action conflicts with current system state."
        
        # Safely get user_id
        user_id = None
        if hasattr(request, 'user') and hasattr(request.user, 'id'):
            user_id = request.user.id if request.user.is_authenticated else None
        
        error = ConflictError(
            user_message=user_msg,
            developer_message=f"IntegrityError: {error_msg}",
            context=ErrorContext().build(),
        )
        
        logger.warning(
            f"Database integrity error: {error_msg}",
            extra={
                "path": request.path,
                "method": request.method,
                "user_id": user_id,
            }
        )
        
        return self._error_to_response(error)

    def _handle_database_unavailable(self, exc: Exception, request: HttpRequest) -> JsonResponse:
        """Convert database connectivity failures to a retryable 503 response."""
        logger.warning(
            "Database temporarily unavailable",
            extra={
                "path": request.path,
                "method": request.method,
            },
            exc_info=True,
        )

        error = TransientError(
            user_message="The service is temporarily unavailable. Please try again shortly.",
            developer_message=f"{exc.__class__.__name__}: {exc}",
            error_code="DATABASE_UNAVAILABLE",
        )
        return self._error_to_response(error)

    def _handle_validation_error(self, exc: DjangoValidationError, request: HttpRequest) -> JsonResponse:
        """Convert Django ValidationError to 400 ValidationError response."""
        # Extract error details
        if hasattr(exc, 'message'):
            detail = exc.message
        elif hasattr(exc, 'messages'):
            detail = "; ".join(exc.messages)
        else:
            detail = str(exc)
        
        error = ValidationError(
            user_message="The data you provided is invalid.",
            developer_message=f"ValidationError: {detail}",
            context=ErrorContext().build(),
        )
        
        logger.info(
            f"Validation error: {detail}",
            extra={
                "path": request.path,
                "method": request.method,
            }
        )
        
        return self._error_to_response(error)

    def _handle_unhandled_exception(self, exc: Exception, request: HttpRequest) -> JsonResponse:
        """Safely handle completely unhandled exceptions."""
        # Safely get user_id
        user_id = None
        if hasattr(request, 'user') and hasattr(request.user, 'id'):
            user_id = request.user.id if request.user.is_authenticated else None
        
        # NEVER expose internal error details to clients
        logger.exception(
            f"Unhandled exception: {exc.__class__.__name__}",
            extra={
                "path": request.path,
                "method": request.method,
                "user_id": user_id,
            }
        )
        
        data = {
            "error_code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Please contact support.",
            "status_code": 500,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        
        return JsonResponse(data, status=500)

    def _error_to_response(self, error: EduLinkError) -> JsonResponse:
        """Convert EduLink error to JSON response."""
        data = {
            "error_code": error.error_code,
            "message": error.user_message,
            "status_code": error.http_status,
            "timestamp": error.timestamp.isoformat(),
        }
        
        if error.context:
            data["context"] = error.context
        
        return JsonResponse(data, status=error.http_status)
