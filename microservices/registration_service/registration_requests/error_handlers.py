"""Error handlers for registration requests."""

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import logging

logger = logging.getLogger(__name__)


def bad_request(request, exception=None):
    """Handle 400 Bad Request errors."""
    logger.warning(f"Bad request: {request.path} - {exception}")
    
    if request.content_type == 'application/json' or request.path.startswith('/api/'):
        return JsonResponse({
            'error': 'Bad Request',
            'message': 'The request could not be understood by the server.',
            'status_code': 400
        }, status=400)
    
    return render(request, 'registration/errors/400.html', {
        'error_message': 'Bad Request',
        'error_description': 'The request could not be understood by the server.'
    }, status=400)


def permission_denied(request, exception=None):
    """Handle 403 Permission Denied errors."""
    logger.warning(f"Permission denied: {request.path} - {exception}")
    
    if request.content_type == 'application/json' or request.path.startswith('/api/'):
        return JsonResponse({
            'error': 'Permission Denied',
            'message': 'You do not have permission to access this resource.',
            'status_code': 403
        }, status=403)
    
    return render(request, 'registration/errors/403.html', {
        'error_message': 'Permission Denied',
        'error_description': 'You do not have permission to access this resource.'
    }, status=403)


def page_not_found(request, exception=None):
    """Handle 404 Page Not Found errors."""
    logger.warning(f"Page not found: {request.path} - {exception}")
    
    if request.content_type == 'application/json' or request.path.startswith('/api/'):
        return JsonResponse({
            'error': 'Not Found',
            'message': 'The requested resource was not found.',
            'status_code': 404
        }, status=404)
    
    return render(request, 'registration/errors/404.html', {
        'error_message': 'Page Not Found',
        'error_description': 'The requested page was not found.'
    }, status=404)


def server_error(request):
    """Handle 500 Internal Server Error."""
    logger.error(f"Server error: {request.path}")
    
    if request.content_type == 'application/json' or request.path.startswith('/api/'):
        return JsonResponse({
            'error': 'Internal Server Error',
            'message': 'An internal server error occurred.',
            'status_code': 500
        }, status=500)
    
    return render(request, 'registration/errors/500.html', {
        'error_message': 'Internal Server Error',
        'error_description': 'An internal server error occurred. Please try again later.'
    }, status=500)