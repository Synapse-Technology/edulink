from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import requests
import logging
from django.conf import settings
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger(__name__)

class ServiceError(Exception):
    """Base exception for service-related errors"""
    def __init__(self, message: str, status_code: int = 500, details: Dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class ServiceUnavailableError(ServiceError):
    """Raised when a service is unavailable"""
    def __init__(self, service_name: str, details: Dict = None):
        message = f"Service {service_name} is unavailable"
        super().__init__(message, status.HTTP_503_SERVICE_UNAVAILABLE, details)

class BaseService(ABC):
    """Base class for all microservices"""
    
    def __init__(self, service_name: str, base_url: str = None):
        self.service_name = service_name
        self.base_url = base_url or self._get_service_url()
        self.timeout = getattr(settings, 'SERVICE_TIMEOUT', 30)
        self.retry_count = getattr(settings, 'SERVICE_RETRY_COUNT', 3)
    
    def _get_service_url(self) -> str:
        """Get service URL from settings"""
        service_urls = getattr(settings, 'MICROSERVICE_URLS', {})
        return service_urls.get(self.service_name, f'http://localhost:8000/{self.service_name}')
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None, 
                     params: Dict = None, headers: Dict = None) -> Dict:
        """Make HTTP request to service with retry logic"""
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        
        # Add authentication headers if available
        if not headers:
            headers = {}
        
        # Add service authentication token
        service_token = getattr(settings, 'SERVICE_AUTH_TOKEN', None)
        if service_token:
            headers['Authorization'] = f'Bearer {service_token}'
        
        headers['Content-Type'] = 'application/json'
        
        for attempt in range(self.retry_count):
            try:
                response = requests.request(
                    method=method,
                    url=url,
                    json=data,
                    params=params,
                    headers=headers,
                    timeout=self.timeout
                )
                
                if response.status_code >= 500 and attempt < self.retry_count - 1:
                    logger.warning(f"Service {self.service_name} returned {response.status_code}, retrying...")
                    continue
                
                if response.status_code >= 400:
                    error_data = response.json() if response.content else {}
                    raise ServiceError(
                        f"Service {self.service_name} error: {response.status_code}",
                        response.status_code,
                        error_data
                    )
                
                return response.json() if response.content else {}
                
            except requests.exceptions.RequestException as e:
                if attempt == self.retry_count - 1:
                    logger.error(f"Failed to connect to {self.service_name}: {str(e)}")
                    raise ServiceUnavailableError(self.service_name, {'error': str(e)})
                logger.warning(f"Connection to {self.service_name} failed, retrying...")
        
        raise ServiceUnavailableError(self.service_name)
    
    def get(self, endpoint: str, params: Dict = None) -> Dict:
        """Make GET request"""
        return self._make_request('GET', endpoint, params=params)
    
    def post(self, endpoint: str, data: Dict = None) -> Dict:
        """Make POST request"""
        return self._make_request('POST', endpoint, data=data)
    
    def put(self, endpoint: str, data: Dict = None) -> Dict:
        """Make PUT request"""
        return self._make_request('PUT', endpoint, data=data)
    
    def patch(self, endpoint: str, data: Dict = None) -> Dict:
        """Make PATCH request"""
        return self._make_request('PATCH', endpoint, data=data)
    
    def delete(self, endpoint: str) -> Dict:
        """Make DELETE request"""
        return self._make_request('DELETE', endpoint)
    
    @abstractmethod
    def health_check(self) -> bool:
        """Check if service is healthy"""
        pass

class ServiceRegistry:
    """Registry for managing service instances"""
    
    _services: Dict[str, BaseService] = {}
    
    @classmethod
    def register(cls, service_name: str, service_instance: BaseService):
        """Register a service instance"""
        cls._services[service_name] = service_instance
        logger.info(f"Registered service: {service_name}")
    
    @classmethod
    def get_service(cls, service_name: str) -> Optional[BaseService]:
        """Get a service instance"""
        return cls._services.get(service_name)
    
    @classmethod
    def get_all_services(cls) -> Dict[str, BaseService]:
        """Get all registered services"""
        return cls._services.copy()
    
    @classmethod
    def health_check_all(cls) -> Dict[str, bool]:
        """Check health of all services"""
        health_status = {}
        for name, service in cls._services.items():
            try:
                health_status[name] = service.health_check()
            except Exception as e:
                logger.error(f"Health check failed for {name}: {str(e)}")
                health_status[name] = False
        return health_status

def service_error_handler(func):
    """Decorator to handle service errors gracefully"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ServiceError as e:
            logger.error(f"Service error in {func.__name__}: {e.message}")
            return Response(
                {'error': e.message, 'details': e.details},
                status=e.status_code
            )
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    return wrapper