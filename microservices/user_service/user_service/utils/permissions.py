from rest_framework.permissions import BasePermission
from django.conf import settings
import jwt
import logging

logger = logging.getLogger(__name__)


class IsServiceAuthenticated(BasePermission):
    """Permission class for inter-service authentication."""
    
    def has_permission(self, request, view):
        """Check if the request is from an authenticated service."""
        try:
            # Check for service token in headers
            auth_header = request.META.get('HTTP_AUTHORIZATION')
            if not auth_header:
                return False
            
            # Extract token
            if not auth_header.startswith('Bearer '):
                return False
            
            token = auth_header.split(' ')[1]
            
            # Verify service token
            try:
                payload = jwt.decode(
                    token,
                    settings.SERVICE_SECRET_KEY,
                    algorithms=['HS256']
                )
                
                # Check if it's a service token
                if payload.get('type') != 'service':
                    return False
                
                # Check if service is allowed
                service_name = payload.get('service')
                allowed_services = getattr(settings, 'ALLOWED_SERVICES', [
                    'auth_service',
                    'institution_service',
                    'notification_service',
                    'internship_service',
                    'application_service'
                ])
                
                if service_name not in allowed_services:
                    return False
                
                # Store service info in request
                request.service_name = service_name
                request.service_payload = payload
                
                return True
                
            except jwt.InvalidTokenError as e:
                logger.warning(f"Invalid service token: {str(e)}")
                return False
            
        except Exception as e:
            logger.error(f"Service authentication error: {str(e)}")
            return False
    
    def has_object_permission(self, request, view, obj):
        """Object-level permission check for services."""
        return self.has_permission(request, view)


class IsAdminOrServiceAuthenticated(BasePermission):
    """Permission class that allows admin users or authenticated services."""
    
    def has_permission(self, request, view):
        """Check if user is admin or request is from authenticated service."""
        # Check if user is admin
        if request.user and request.user.is_authenticated and request.user.is_staff:
            return True
        
        # Check service authentication
        service_permission = IsServiceAuthenticated()
        return service_permission.has_permission(request, view)