from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from django.core.exceptions import PermissionDenied
import logging

logger = logging.getLogger(__name__)


class UserServiceException(Exception):
    """
    Base exception class for user service.
    """
    default_message = "An error occurred in the user service."
    default_code = "user_service_error"
    
    def __init__(self, message=None, code=None, details=None):
        self.message = message or self.default_message
        self.code = code or self.default_code
        self.details = details or {}
        super().__init__(self.message)


class UserNotFoundError(UserServiceException):
    """
    Exception raised when a user is not found.
    """
    default_message = "User not found."
    default_code = "user_not_found"


class ProfileNotFoundError(UserServiceException):
    """
    Exception raised when a user profile is not found.
    """
    default_message = "User profile not found."
    default_code = "profile_not_found"


class RoleNotFoundError(UserServiceException):
    """
    Exception raised when a role is not found.
    """
    default_message = "Role not found."
    default_code = "role_not_found"


class InstitutionNotFoundError(UserServiceException):
    """
    Exception raised when an institution is not found.
    """
    default_message = "Institution not found."
    default_code = "institution_not_found"


class InvalidRoleError(UserServiceException):
    """
    Exception raised when an invalid role is assigned or accessed.
    """
    default_message = "Invalid role."
    default_code = "invalid_role"


class RolePermissionError(UserServiceException):
    """
    Exception raised when a user doesn't have required role permissions.
    """
    default_message = "Insufficient role permissions."
    default_code = "role_permission_denied"


class ProfileIncompleteError(UserServiceException):
    """
    Exception raised when a user profile is incomplete.
    """
    default_message = "User profile is incomplete."
    default_code = "profile_incomplete"


class DuplicateRoleError(UserServiceException):
    """
    Exception raised when trying to assign a duplicate role.
    """
    default_message = "User already has this role."
    default_code = "duplicate_role"


class ExpiredRoleError(UserServiceException):
    """
    Exception raised when trying to use an expired role.
    """
    default_message = "Role has expired."
    default_code = "expired_role"


class InactiveRoleError(UserServiceException):
    """
    Exception raised when trying to use an inactive role.
    """
    default_message = "Role is inactive."
    default_code = "inactive_role"


class InvalidInvitationError(UserServiceException):
    """
    Exception raised when an invitation is invalid or expired.
    """
    default_message = "Invalid or expired invitation."
    default_code = "invalid_invitation"


class InstitutionNotVerifiedError(UserServiceException):
    """
    Exception raised when trying to access features requiring verified institution.
    """
    default_message = "Institution is not verified."
    default_code = "institution_not_verified"


class InstitutionSuspendedError(UserServiceException):
    """
    Exception raised when trying to access a suspended institution.
    """
    default_message = "Institution is suspended."
    default_code = "institution_suspended"


class InvalidFileTypeError(UserServiceException):
    """
    Exception raised when an invalid file type is uploaded.
    """
    default_message = "Invalid file type."
    default_code = "invalid_file_type"


class FileSizeExceededError(UserServiceException):
    """
    Exception raised when uploaded file size exceeds limit.
    """
    default_message = "File size exceeds limit."
    default_code = "file_size_exceeded"


class ServiceUnavailableError(UserServiceException):
    """
    Exception raised when an external service is unavailable.
    """
    default_message = "External service is unavailable."
    default_code = "service_unavailable"


class CacheError(UserServiceException):
    """
    Exception raised when cache operations fail.
    """
    default_message = "Cache operation failed."
    default_code = "cache_error"


class NotificationError(UserServiceException):
    """
    Exception raised when notification sending fails.
    """
    default_message = "Failed to send notification."
    default_code = "notification_error"


class DataValidationError(UserServiceException):
    """
    Exception raised when data validation fails.
    """
    default_message = "Data validation failed."
    default_code = "data_validation_error"


class BusinessLogicError(UserServiceException):
    """
    Exception raised when business logic validation fails.
    """
    default_message = "Business logic validation failed."
    default_code = "business_logic_error"


class ConcurrencyError(UserServiceException):
    """
    Exception raised when concurrent operations conflict.
    """
    default_message = "Concurrent operation conflict."
    default_code = "concurrency_error"


class QuotaExceededError(UserServiceException):
    """
    Exception raised when a quota or limit is exceeded.
    """
    default_message = "Quota or limit exceeded."
    default_code = "quota_exceeded"


class ConfigurationError(UserServiceException):
    """
    Exception raised when there's a configuration error.
    """
    default_message = "Configuration error."
    default_code = "configuration_error"


def custom_exception_handler(exc, context):
    """
    Custom exception handler for the user service.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Log the exception
    logger.error(f"Exception in {context.get('view', 'Unknown view')}: {exc}", exc_info=True)
    
    # Handle custom user service exceptions
    if isinstance(exc, UserServiceException):
        custom_response_data = {
            'error': {
                'code': exc.code,
                'message': exc.message,
                'details': exc.details
            },
            'success': False,
            'timestamp': context['request'].META.get('HTTP_X_REQUEST_ID', '')
        }
        
        # Determine status code based on exception type
        if isinstance(exc, (UserNotFoundError, ProfileNotFoundError, 
                          RoleNotFoundError, InstitutionNotFoundError)):
            status_code = status.HTTP_404_NOT_FOUND
        elif isinstance(exc, (RolePermissionError, InactiveRoleError, 
                            InstitutionNotVerifiedError, InstitutionSuspendedError)):
            status_code = status.HTTP_403_FORBIDDEN
        elif isinstance(exc, (InvalidRoleError, ProfileIncompleteError, 
                            DuplicateRoleError, ExpiredRoleError, 
                            InvalidInvitationError, InvalidFileTypeError, 
                            FileSizeExceededError, DataValidationError, 
                            BusinessLogicError)):
            status_code = status.HTTP_400_BAD_REQUEST
        elif isinstance(exc, (ServiceUnavailableError, CacheError, 
                            NotificationError)):
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        elif isinstance(exc, ConcurrencyError):
            status_code = status.HTTP_409_CONFLICT
        elif isinstance(exc, QuotaExceededError):
            status_code = status.HTTP_429_TOO_MANY_REQUESTS
        elif isinstance(exc, ConfigurationError):
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        else:
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        
        return Response(custom_response_data, status=status_code)
    
    # Handle Django validation errors
    elif isinstance(exc, DjangoValidationError):
        custom_response_data = {
            'error': {
                'code': 'validation_error',
                'message': 'Validation failed.',
                'details': {
                    'validation_errors': exc.message_dict if hasattr(exc, 'message_dict') else [str(exc)]
                }
            },
            'success': False,
            'timestamp': context['request'].META.get('HTTP_X_REQUEST_ID', '')
        }
        return Response(custom_response_data, status=status.HTTP_400_BAD_REQUEST)
    
    # Handle Django Http404
    elif isinstance(exc, Http404):
        custom_response_data = {
            'error': {
                'code': 'not_found',
                'message': 'Resource not found.',
                'details': {}
            },
            'success': False,
            'timestamp': context['request'].META.get('HTTP_X_REQUEST_ID', '')
        }
        return Response(custom_response_data, status=status.HTTP_404_NOT_FOUND)
    
    # Handle Django PermissionDenied
    elif isinstance(exc, PermissionDenied):
        custom_response_data = {
            'error': {
                'code': 'permission_denied',
                'message': 'Permission denied.',
                'details': {}
            },
            'success': False,
            'timestamp': context['request'].META.get('HTTP_X_REQUEST_ID', '')
        }
        return Response(custom_response_data, status=status.HTTP_403_FORBIDDEN)
    
    # If response is None, it means the exception wasn't handled by DRF
    if response is None:
        custom_response_data = {
            'error': {
                'code': 'internal_server_error',
                'message': 'An unexpected error occurred.',
                'details': {}
            },
            'success': False,
            'timestamp': context['request'].META.get('HTTP_X_REQUEST_ID', '')
        }
        return Response(custom_response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Customize the response format for DRF exceptions
    if response is not None:
        custom_response_data = {
            'error': {
                'code': getattr(exc, 'default_code', 'error'),
                'message': response.data.get('detail', str(exc)) if isinstance(response.data, dict) else str(response.data),
                'details': response.data if isinstance(response.data, dict) and 'detail' not in response.data else {}
            },
            'success': False,
            'timestamp': context['request'].META.get('HTTP_X_REQUEST_ID', '')
        }
        response.data = custom_response_data
    
    return response


def handle_service_error(func):
    """
    Decorator to handle service errors and convert them to appropriate exceptions.
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Service error in {func.__name__}: {e}", exc_info=True)
            if isinstance(e, UserServiceException):
                raise
            else:
                raise ServiceUnavailableError(
                    message=f"Service operation failed: {str(e)}",
                    details={'original_error': str(e)}
                )
    return wrapper


def validate_business_rules(func):
    """
    Decorator to validate business rules before executing a function.
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if isinstance(e, UserServiceException):
                raise
            else:
                raise BusinessLogicError(
                    message=f"Business rule validation failed: {str(e)}",
                    details={'original_error': str(e)}
                )
    return wrapper