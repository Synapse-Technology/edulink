from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.http import Http404
from django.db import IntegrityError
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import requires_csrf_token
from django.views.decorators.http import require_http_methods

logger = logging.getLogger('edulink.api')


class APIErrorHandler:
    """Standardized error handling for API views"""
    
    @staticmethod
    def handle_validation_error(error, context="Validation failed"):
        """Handle validation errors consistently"""
        logger.warning(f"Validation error: {context} - {str(error)}")
        
        if isinstance(error, DjangoValidationError):
            if hasattr(error, 'message_dict'):
                return Response(
                    {'errors': error.message_dict, 'message': context},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                return Response(
                    {'errors': {'non_field_errors': error.messages}, 'message': context},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif isinstance(error, DRFValidationError):
            return Response(
                {'errors': error.detail, 'message': context},
                status=status.HTTP_400_BAD_REQUEST
            )
        else:
            return Response(
                {'errors': {'non_field_errors': [str(error)]}, 'message': context},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @staticmethod
    def handle_not_found(resource_name="Resource"):
        """Handle 404 errors consistently"""
        logger.info(f"Resource not found: {resource_name}")
        return Response(
            {'error': f'{resource_name} not found', 'message': 'The requested resource does not exist'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @staticmethod
    def handle_permission_denied(message="Permission denied"):
        """Handle permission errors consistently"""
        logger.warning(f"Permission denied: {message}")
        return Response(
            {'error': 'Permission denied', 'message': message},
            status=status.HTTP_403_FORBIDDEN
        )
    
    @staticmethod
    def handle_integrity_error(error, context="Database constraint violation"):
        """Handle database integrity errors"""
        logger.error(f"Integrity error: {context} - {str(error)}")
        return Response(
            {'error': 'Data integrity error', 'message': 'The operation violates database constraints'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @staticmethod
    def handle_server_error(error, context="Internal server error"):
        """Handle unexpected server errors"""
        logger.error(f"Server error: {context} - {str(error)}", exc_info=True)
        return Response(
            {'error': 'Internal server error', 'message': 'An unexpected error occurred'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    @staticmethod
    def handle_bad_request(message="Bad request", errors=None):
        """Handle bad request errors"""
        logger.warning(f"Bad request: {message}")
        response_data = {'error': 'Bad request', 'message': message}
        if errors:
            response_data['errors'] = errors
        return Response(response_data, status=status.HTTP_400_BAD_REQUEST)


def custom_exception_handler(exc, context):
    """Custom exception handler for consistent API error responses"""
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Standardize the error response format
        custom_response_data = {
            'error': exc.__class__.__name__,
            'message': 'An error occurred',
            'details': response.data
        }
        
        # Add more specific messages for common exceptions
        if isinstance(exc, DRFValidationError):
            custom_response_data['message'] = 'Validation failed'
        elif isinstance(exc, Http404):
            custom_response_data['message'] = 'Resource not found'
        elif hasattr(exc, 'detail'):
            if isinstance(exc.detail, str):
                custom_response_data['message'] = exc.detail
            elif isinstance(exc.detail, dict) and 'detail' in exc.detail:
                custom_response_data['message'] = exc.detail['detail']
        
        response.data = custom_response_data
    
    return response


class APIResponseMixin:
    """Mixin to provide standardized API responses"""
    
    def success_response(self, data=None, message="Success", status_code=status.HTTP_200_OK):
        """Return a standardized success response"""
        response_data = {'success': True, 'message': message}
        if data is not None:
            response_data['data'] = data
        return Response(response_data, status=status_code)
    
    def error_response(self, message="An error occurred", errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """Return a standardized error response"""
        response_data = {'success': False, 'message': message}
        if errors:
            response_data['errors'] = errors
        return Response(response_data, status=status_code)
    
    def paginated_response(self, queryset, serializer_class, request, message="Data retrieved successfully"):
        """Return a standardized paginated response"""
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = serializer_class(page, many=True, context={'request': request})
            return self.get_paginated_response({
                'success': True,
                'message': message,
                'data': serializer.data
            })


@requires_csrf_token
def csrf_failure_view(request, reason=""):
    """Enhanced CSRF failure view with detailed error information"""
    logger.warning(f"CSRF failure: {reason} for {request.path} from {request.META.get('REMOTE_ADDR')}")
    
    return JsonResponse({
        'error': 'CSRF verification failed',
        'message': 'Cross-Site Request Forgery protection triggered. Please refresh the page and try again.',
        'code': 'CSRF_FAILURE',
        'details': {
            'reason': reason,
            'path': request.path,
            'method': request.method
        }
    }, status=403)