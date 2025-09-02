import logging
import requests
from django.conf import settings
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """Custom exception handler for DRF."""
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'error': True,
            'message': 'An error occurred',
            'details': response.data
        }
        
        if hasattr(exc, 'detail'):
            if isinstance(exc.detail, dict):
                custom_response_data['message'] = 'Validation error'
            else:
                custom_response_data['message'] = str(exc.detail)
        
        response.data = custom_response_data
    
    return response

class ServiceClient:
    """Base client for inter-service communication."""
    
    def __init__(self, service_url, service_token=None, timeout=None):
        self.service_url = service_url.rstrip('/')
        self.service_token = service_token
        self.timeout = timeout or settings.SERVICE_TIMEOUT
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
    
    def put(self, endpoint, data=None):
        """Make PUT request to service."""
        url = f"{self.service_url}/{endpoint.lstrip('/')}"
        try:
            response = self.session.put(url, json=data, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Service request failed: {url} - {str(e)}")
            raise
    
    def delete(self, endpoint):
        """Make DELETE request to service."""
        url = f"{self.service_url}/{endpoint.lstrip('/')}"
        try:
            response = self.session.delete(url, timeout=self.timeout)
            response.raise_for_status()
            return response.status_code == 204
        except requests.exceptions.RequestException as e:
            logger.error(f"Service request failed: {url} - {str(e)}")
            raise

# Service clients
auth_service = ServiceClient(
    settings.AUTH_SERVICE_URL,
    settings.AUTH_SERVICE_TOKEN
)

notification_service = ServiceClient(
    settings.NOTIFICATION_SERVICE_URL,
    settings.NOTIFICATION_SERVICE_TOKEN
)

internship_service = ServiceClient(
    settings.INTERNSHIP_SERVICE_URL,
    settings.INTERNSHIP_SERVICE_TOKEN
)

application_service = ServiceClient(
    settings.APPLICATION_SERVICE_URL,
    settings.APPLICATION_SERVICE_TOKEN
)

def validate_file_size(file, max_size):
    """Validate file size."""
    if file.size > max_size:
        raise ValueError(f"File size exceeds maximum allowed size of {max_size} bytes")

def validate_file_type(file, allowed_types):
    """Validate file type."""
    file_extension = file.name.split('.')[-1].lower()
    if file_extension not in allowed_types:
        raise ValueError(f"File type '{file_extension}' not allowed. Allowed types: {', '.join(allowed_types)}")

def calculate_profile_completion(profile_data, required_fields):
    """Calculate profile completion percentage."""
    total_fields = len(required_fields)
    filled_fields = 0
    
    for field in required_fields:
        value = profile_data.get(field)
        if value is not None and value != '' and value != []:
            filled_fields += 1
    
    return int((filled_fields / total_fields) * 100) if total_fields > 0 else 0

def send_profile_update_notification(user_id, profile_type, changes):
    """Send notification about profile updates."""
    try:
        notification_service.post('api/v1/notifications/', {
            'user_id': user_id,
            'type': 'profile_update',
            'title': f'{profile_type.title()} Profile Updated',
            'message': f'Your {profile_type} profile has been updated.',
            'metadata': {
                'profile_type': profile_type,
                'changes': changes
            }
        })
    except Exception as e:
        logger.error(f"Failed to send profile update notification: {str(e)}")

def verify_user_exists(user_id):
    """Verify that a user exists in the auth service."""
    try:
        response = auth_service.get(f'api/v1/users/{user_id}/')
        return response.get('id') == user_id
    except Exception as e:
        logger.error(f"Failed to verify user existence: {str(e)}")
        return False