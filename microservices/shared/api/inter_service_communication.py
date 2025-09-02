"""Inter-service communication patterns and utilities for the restructured microservices architecture."""

import logging
import requests
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum
import uuid


logger = logging.getLogger(__name__)


class ServiceType(Enum):
    """Enumeration of available microservices."""
    AUTH = "auth_service"
    USER = "user_service"
    INSTITUTION = "institution_service"
    APPLICATION = "application_service"
    NOTIFICATION = "notification_service"
    INTERNSHIP = "internship_service"


class CommunicationMethod(Enum):
    """Enumeration of communication methods."""
    SYNCHRONOUS_HTTP = "sync_http"
    ASYNCHRONOUS_EVENT = "async_event"
    WEBHOOK = "webhook"


@dataclass
class ServiceEndpoint:
    """Configuration for a service endpoint."""
    service: ServiceType
    base_url: str
    api_version: str = "v1"
    timeout: int = 30
    retry_attempts: int = 3
    auth_required: bool = True


@dataclass
class APIRequest:
    """Standard API request structure."""
    endpoint: str
    method: str = "GET"
    data: Optional[Dict[str, Any]] = None
    headers: Optional[Dict[str, str]] = None
    params: Optional[Dict[str, Any]] = None
    correlation_id: Optional[str] = None


@dataclass
class APIResponse:
    """Standard API response structure."""
    status_code: int
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    correlation_id: Optional[str] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


class ServiceRegistry:
    """Registry for managing service endpoints and configurations."""
    
    def __init__(self):
        self._endpoints: Dict[ServiceType, ServiceEndpoint] = {}
        self._load_default_endpoints()
    
    def _load_default_endpoints(self):
        """Load default service endpoint configurations."""
        import os
        
        # Default configurations (can be overridden by environment variables)
        defaults = {
            ServiceType.AUTH: ServiceEndpoint(
                service=ServiceType.AUTH,
                base_url=os.getenv('AUTH_SERVICE_URL', 'http://localhost:8001'),
                api_version="v1",
                timeout=30
            ),
            ServiceType.USER: ServiceEndpoint(
                service=ServiceType.USER,
                base_url=os.getenv('USER_SERVICE_URL', 'http://localhost:8002'),
                api_version="v1",
                timeout=30
            ),
            ServiceType.INSTITUTION: ServiceEndpoint(
                service=ServiceType.INSTITUTION,
                base_url=os.getenv('INSTITUTION_SERVICE_URL', 'http://localhost:8003'),
                api_version="v1",
                timeout=30
            ),
            ServiceType.APPLICATION: ServiceEndpoint(
                service=ServiceType.APPLICATION,
                base_url=os.getenv('APPLICATION_SERVICE_URL', 'http://localhost:8004'),
                api_version="v1",
                timeout=30
            ),
            ServiceType.NOTIFICATION: ServiceEndpoint(
                service=ServiceType.NOTIFICATION,
                base_url=os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:8005'),
                api_version="v1",
                timeout=30
            ),
            ServiceType.INTERNSHIP: ServiceEndpoint(
                service=ServiceType.INTERNSHIP,
                base_url=os.getenv('INTERNSHIP_SERVICE_URL', 'http://localhost:8006'),
                api_version="v1",
                timeout=30
            )
        }
        
        self._endpoints.update(defaults)
    
    def register_service(self, endpoint: ServiceEndpoint):
        """Register a service endpoint."""
        self._endpoints[endpoint.service] = endpoint
        logger.info(f"Registered service endpoint: {endpoint.service.value} -> {endpoint.base_url}")
    
    def get_endpoint(self, service: ServiceType) -> Optional[ServiceEndpoint]:
        """Get endpoint configuration for a service."""
        return self._endpoints.get(service)
    
    def list_services(self) -> List[ServiceType]:
        """List all registered services."""
        return list(self._endpoints.keys())


class InterServiceClient:
    """Client for making inter-service HTTP requests."""
    
    def __init__(self, service_registry: ServiceRegistry):
        self.registry = service_registry
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Edulink-InterService/1.0'
        })
    
    def make_request(
        self,
        target_service: ServiceType,
        request: APIRequest,
        auth_token: Optional[str] = None
    ) -> APIResponse:
        """Make a request to another service."""
        endpoint_config = self.registry.get_endpoint(target_service)
        if not endpoint_config:
            return APIResponse(
                status_code=500,
                error=f"Service {target_service.value} not registered"
            )
        
        # Build full URL
        url = f"{endpoint_config.base_url}/api/{endpoint_config.api_version}{request.endpoint}"
        
        # Prepare headers
        headers = request.headers or {}
        if auth_token and endpoint_config.auth_required:
            headers['Authorization'] = f'Bearer {auth_token}'
        
        # Add correlation ID
        correlation_id = request.correlation_id or str(uuid.uuid4())
        headers['X-Correlation-ID'] = correlation_id
        
        try:
            # Make the request
            response = self.session.request(
                method=request.method,
                url=url,
                json=request.data,
                headers=headers,
                params=request.params,
                timeout=endpoint_config.timeout
            )
            
            # Parse response
            try:
                response_data = response.json() if response.content else None
            except json.JSONDecodeError:
                response_data = {'raw_content': response.text}
            
            return APIResponse(
                status_code=response.status_code,
                data=response_data,
                error=None if response.ok else f"HTTP {response.status_code}: {response.reason}",
                correlation_id=correlation_id
            )
            
        except requests.exceptions.Timeout:
            logger.error(f"Timeout calling {target_service.value}: {url}")
            return APIResponse(
                status_code=408,
                error="Request timeout",
                correlation_id=correlation_id
            )
        
        except requests.exceptions.ConnectionError:
            logger.error(f"Connection error calling {target_service.value}: {url}")
            return APIResponse(
                status_code=503,
                error="Service unavailable",
                correlation_id=correlation_id
            )
        
        except Exception as e:
            logger.error(f"Unexpected error calling {target_service.value}: {str(e)}")
            return APIResponse(
                status_code=500,
                error=f"Internal error: {str(e)}",
                correlation_id=correlation_id
            )


class AuthServiceClient:
    """Specialized client for authentication service operations."""
    
    def __init__(self, inter_service_client: InterServiceClient):
        self.client = inter_service_client
        self.service = ServiceType.AUTH
    
    def validate_token(self, token: str) -> APIResponse:
        """Validate an authentication token."""
        request = APIRequest(
            endpoint="/auth/validate",
            method="POST",
            data={"token": token}
        )
        return self.client.make_request(self.service, request)
    
    def get_user_info(self, user_id: str, auth_token: str) -> APIResponse:
        """Get user information from auth service."""
        request = APIRequest(
            endpoint=f"/users/{user_id}",
            method="GET"
        )
        return self.client.make_request(self.service, request, auth_token)
    
    def update_user_role(self, user_id: str, new_role: str, auth_token: str) -> APIResponse:
        """Update user role in auth service."""
        request = APIRequest(
            endpoint=f"/users/{user_id}/role",
            method="PATCH",
            data={"role": new_role}
        )
        return self.client.make_request(self.service, request, auth_token)
    
    def verify_email(self, user_id: str, auth_token: str) -> APIResponse:
        """Mark user email as verified."""
        request = APIRequest(
            endpoint=f"/users/{user_id}/verify-email",
            method="POST"
        )
        return self.client.make_request(self.service, request, auth_token)


class UserServiceClient:
    """Specialized client for user service operations."""
    
    def __init__(self, inter_service_client: InterServiceClient):
        self.client = inter_service_client
        self.service = ServiceType.USER
    
    def get_user_profile(self, user_id: str, auth_token: str) -> APIResponse:
        """Get user profile information."""
        request = APIRequest(
            endpoint=f"/profiles/{user_id}",
            method="GET"
        )
        return self.client.make_request(self.service, request, auth_token)
    
    def update_user_profile(self, user_id: str, profile_data: Dict[str, Any], auth_token: str) -> APIResponse:
        """Update user profile information."""
        request = APIRequest(
            endpoint=f"/profiles/{user_id}",
            method="PATCH",
            data=profile_data
        )
        return self.client.make_request(self.service, request, auth_token)
    
    def get_user_institutions(self, user_id: str, auth_token: str) -> APIResponse:
        """Get user's institution memberships."""
        request = APIRequest(
            endpoint=f"/profiles/{user_id}/institutions",
            method="GET"
        )
        return self.client.make_request(self.service, request, auth_token)
    
    def create_institution_membership(self, membership_data: Dict[str, Any], auth_token: str) -> APIResponse:
        """Create a new institution membership."""
        request = APIRequest(
            endpoint="/memberships",
            method="POST",
            data=membership_data
        )
        return self.client.make_request(self.service, request, auth_token)


class InstitutionServiceClient:
    """Specialized client for institution service operations."""
    
    def __init__(self, inter_service_client: InterServiceClient):
        self.client = inter_service_client
        self.service = ServiceType.INSTITUTION
    
    def get_institution(self, institution_id: str, auth_token: str) -> APIResponse:
        """Get institution information."""
        request = APIRequest(
            endpoint=f"/institutions/{institution_id}",
            method="GET"
        )
        return self.client.make_request(self.service, request, auth_token)
    
    def search_institutions(self, query: str, auth_token: str) -> APIResponse:
        """Search for institutions."""
        request = APIRequest(
            endpoint="/institutions/search",
            method="GET",
            params={"q": query}
        )
        return self.client.make_request(self.service, request, auth_token)
    
    def get_institution_members(self, institution_id: str, auth_token: str) -> APIResponse:
        """Get institution members."""
        request = APIRequest(
            endpoint=f"/institutions/{institution_id}/members",
            method="GET"
        )
        return self.client.make_request(self.service, request, auth_token)


class NotificationServiceClient:
    """Specialized client for notification service operations."""
    
    def __init__(self, inter_service_client: InterServiceClient):
        self.client = inter_service_client
        self.service = ServiceType.NOTIFICATION
    
    def send_notification(self, notification_data: Dict[str, Any], auth_token: str) -> APIResponse:
        """Send a notification."""
        request = APIRequest(
            endpoint="/notifications",
            method="POST",
            data=notification_data
        )
        return self.client.make_request(self.service, request, auth_token)
    
    def send_email(self, email_data: Dict[str, Any], auth_token: str) -> APIResponse:
        """Send an email notification."""
        request = APIRequest(
            endpoint="/notifications/email",
            method="POST",
            data=email_data
        )
        return self.client.make_request(self.service, request, auth_token)
    
    def get_user_notifications(self, user_id: str, auth_token: str) -> APIResponse:
        """Get notifications for a user."""
        request = APIRequest(
            endpoint=f"/users/{user_id}/notifications",
            method="GET"
        )
        return self.client.make_request(self.service, request, auth_token)


class ServiceClientFactory:
    """Factory for creating service clients."""
    
    def __init__(self):
        self.registry = ServiceRegistry()
        self.inter_service_client = InterServiceClient(self.registry)
    
    def get_auth_client(self) -> AuthServiceClient:
        """Get authentication service client."""
        return AuthServiceClient(self.inter_service_client)
    
    def get_user_client(self) -> UserServiceClient:
        """Get user service client."""
        return UserServiceClient(self.inter_service_client)
    
    def get_institution_client(self) -> InstitutionServiceClient:
        """Get institution service client."""
        return InstitutionServiceClient(self.inter_service_client)
    
    def get_notification_client(self) -> NotificationServiceClient:
        """Get notification service client."""
        return NotificationServiceClient(self.inter_service_client)
    
    def register_service(self, endpoint: ServiceEndpoint):
        """Register a custom service endpoint."""
        self.registry.register_service(endpoint)


# Global factory instance
service_client_factory = ServiceClientFactory()


# Convenience functions
def get_auth_client() -> AuthServiceClient:
    """Get authentication service client."""
    return service_client_factory.get_auth_client()


def get_user_client() -> UserServiceClient:
    """Get user service client."""
    return service_client_factory.get_user_client()


def get_institution_client() -> InstitutionServiceClient:
    """Get institution service client."""
    return service_client_factory.get_institution_client()


def get_notification_client() -> NotificationServiceClient:
    """Get notification service client."""
    return service_client_factory.get_notification_client()


# Circuit breaker pattern for resilient communication
class CircuitBreaker:
    """Circuit breaker pattern implementation for service resilience."""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
    
    def call(self, func, *args, **kwargs):
        """Execute a function with circuit breaker protection."""
        if self.state == 'OPEN':
            if self._should_attempt_reset():
                self.state = 'HALF_OPEN'
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if we should attempt to reset the circuit breaker."""
        if self.last_failure_time is None:
            return True
        
        return (datetime.utcnow() - self.last_failure_time).seconds >= self.recovery_timeout
    
    def _on_success(self):
        """Handle successful call."""
        self.failure_count = 0
        self.state = 'CLOSED'
    
    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.failure_count >= self.failure_threshold:
            self.state = 'OPEN'


# Example usage patterns
class CommunicationPatterns:
    """Examples of common inter-service communication patterns."""
    
    @staticmethod
    def sync_user_data_on_auth_change(auth_user_id: str, updated_data: Dict[str, Any]):
        """Synchronously update user data when auth information changes."""
        user_client = get_user_client()
        
        # Get current auth token (this would come from the request context)
        auth_token = "system_token"  # In practice, this would be a service token
        
        # Update user profile
        response = user_client.update_user_profile(
            user_id=auth_user_id,
            profile_data=updated_data,
            auth_token=auth_token
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to sync user data: {response.error}")
            raise Exception(f"User sync failed: {response.error}")
        
        return response.data
    
    @staticmethod
    def notify_user_on_application_status_change(user_id: str, application_data: Dict[str, Any]):
        """Send notification when application status changes."""
        notification_client = get_notification_client()
        
        notification_data = {
            'user_id': user_id,
            'type': 'application_status_change',
            'title': f"Application Status Updated",
            'message': f"Your application status has been updated to: {application_data.get('status')}",
            'data': application_data
        }
        
        auth_token = "system_token"
        response = notification_client.send_notification(notification_data, auth_token)
        
        if response.status_code != 200:
            logger.warning(f"Failed to send notification: {response.error}")
        
        return response
    
    @staticmethod
    def validate_user_institution_access(user_id: str, institution_id: str) -> bool:
        """Validate if user has access to an institution."""
        user_client = get_user_client()
        auth_token = "system_token"
        
        # Get user's institutions
        response = user_client.get_user_institutions(user_id, auth_token)
        
        if response.status_code != 200:
            logger.error(f"Failed to get user institutions: {response.error}")
            return False
        
        user_institutions = response.data.get('institutions', [])
        return any(inst['id'] == institution_id for inst in user_institutions)