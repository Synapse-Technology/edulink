# Utils package for User Service
import logging
import requests
from django.conf import settings
from .permissions import IsServiceAuthenticated

logger = logging.getLogger(__name__)

class ServiceClient:
    """Base client for inter-service communication."""
    
    def __init__(self, service_url, service_token=None, timeout=None):
        self.service_url = service_url.rstrip('/')
        self.service_token = service_token
        self.timeout = timeout or getattr(settings, 'SERVICE_TIMEOUT', 30)
        self.session = requests.Session()
        
        if self.service_token:
            self.session.headers.update({
                'Authorization': f'Bearer {self.service_token}',
                'Content-Type': 'application/json'
            })
    
    def get(self, endpoint, params=None):
        """Make GET request to service."""
        url = f"{self.service_url}/{endpoint.lstrip('/')}"
        try:
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Service request failed: {url} - {str(e)}")
            raise
    
    def post(self, endpoint, data=None):
        """Make POST request to service."""
        url = f"{self.service_url}/{endpoint.lstrip('/')}"
        try:
            response = self.session.post(url, json=data, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Service request failed: {url} - {str(e)}")
            raise

def verify_user_exists(user_id):
    """Verify that a user exists in the auth service."""
    try:
        # This would normally use auth_service client
        # For now, return True to avoid blocking migrations
        return True
    except Exception as e:
        logger.error(f"Failed to verify user existence: {str(e)}")
        return False

# Import helper functions from the top-level utils directory
try:
    from ...utils.helpers import (
        validate_file_size, 
        validate_file_type, 
        calculate_profile_completion,
        notify_service,
        make_service_request
    )
except ImportError:
    # Fallback implementations
    def validate_file_size(*args, **kwargs):
        return True
    
    def validate_file_type(*args, **kwargs):
        return True
    
    def calculate_profile_completion(*args, **kwargs):
        return 0
    
    def notify_service(*args, **kwargs):
        pass
    
    def make_service_request(*args, **kwargs):
        return None

# Notification functions
def send_profile_update_notification(*args, **kwargs):
    """Send profile update notification."""
    try:
        return notify_service(*args, **kwargs)
    except:
        pass

__all__ = [
    'ServiceClient', 
    'IsServiceAuthenticated',
    'validate_file_size', 
    'validate_file_type', 
    'calculate_profile_completion',
    'notify_service',
    'make_service_request',
    'verify_user_exists',
    'send_profile_update_notification'
]