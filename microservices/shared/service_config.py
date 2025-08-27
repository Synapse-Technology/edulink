from typing import Dict, Any
from django.conf import settings
import os

class ServiceConfig:
    """Configuration management for microservices"""
    
    # Service URLs
    INTERNSHIP_SERVICE_URL = os.getenv('INTERNSHIP_SERVICE_URL', 'http://localhost:8001')
    APPLICATION_SERVICE_URL = os.getenv('APPLICATION_SERVICE_URL', 'http://localhost:8002')
    API_GATEWAY_URL = os.getenv('API_GATEWAY_URL', 'http://localhost:8000')
    
    # Database configurations
    INTERNSHIP_DB_CONFIG = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('INTERNSHIP_DB_NAME', 'edulink_internship'),
        'USER': os.getenv('INTERNSHIP_DB_USER', 'postgres'),
        'PASSWORD': os.getenv('INTERNSHIP_DB_PASSWORD', 'password'),
        'HOST': os.getenv('INTERNSHIP_DB_HOST', 'localhost'),
        'PORT': os.getenv('INTERNSHIP_DB_PORT', '5432'),
    }
    
    APPLICATION_DB_CONFIG = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('APPLICATION_DB_NAME', 'edulink_application'),
        'USER': os.getenv('APPLICATION_DB_USER', 'postgres'),
        'PASSWORD': os.getenv('APPLICATION_DB_PASSWORD', 'password'),
        'HOST': os.getenv('APPLICATION_DB_HOST', 'localhost'),
        'PORT': os.getenv('APPLICATION_DB_PORT', '5432'),
    }
    
    # Service authentication
    SERVICE_AUTH_TOKEN = os.getenv('SERVICE_AUTH_TOKEN', 'your-service-auth-token')
    
    # Service timeouts and retries
    SERVICE_TIMEOUT = int(os.getenv('SERVICE_TIMEOUT', '30'))
    SERVICE_RETRY_COUNT = int(os.getenv('SERVICE_RETRY_COUNT', '3'))
    
    # Message queue configuration
    RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672/')
    
    # Redis configuration for caching
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    @classmethod
    def get_service_urls(cls) -> Dict[str, str]:
        """Get all service URLs"""
        return {
            'internship': cls.INTERNSHIP_SERVICE_URL,
            'application': cls.APPLICATION_SERVICE_URL,
            'api_gateway': cls.API_GATEWAY_URL,
        }
    
    @classmethod
    def get_database_config(cls, service_name: str) -> Dict[str, Any]:
        """Get database configuration for a service"""
        configs = {
            'internship': cls.INTERNSHIP_DB_CONFIG,
            'application': cls.APPLICATION_DB_CONFIG,
        }
        return configs.get(service_name, {})
    
    @classmethod
    def update_django_settings(cls):
        """Update Django settings with microservice configurations"""
        # Add microservice URLs to settings
        if not hasattr(settings, 'MICROSERVICE_URLS'):
            settings.MICROSERVICE_URLS = cls.get_service_urls()
        
        # Add service authentication token
        if not hasattr(settings, 'SERVICE_AUTH_TOKEN'):
            settings.SERVICE_AUTH_TOKEN = cls.SERVICE_AUTH_TOKEN
        
        # Add service timeout and retry settings
        if not hasattr(settings, 'SERVICE_TIMEOUT'):
            settings.SERVICE_TIMEOUT = cls.SERVICE_TIMEOUT
        
        if not hasattr(settings, 'SERVICE_RETRY_COUNT'):
            settings.SERVICE_RETRY_COUNT = cls.SERVICE_RETRY_COUNT

# Environment-specific configurations
class DevelopmentConfig(ServiceConfig):
    """Development environment configuration"""
    DEBUG = True
    INTERNSHIP_SERVICE_URL = 'http://localhost:8001'
    APPLICATION_SERVICE_URL = 'http://localhost:8002'
    API_GATEWAY_URL = 'http://localhost:8000'

class ProductionConfig(ServiceConfig):
    """Production environment configuration"""
    DEBUG = False
    INTERNSHIP_SERVICE_URL = os.getenv('INTERNSHIP_SERVICE_URL', 'https://internship-service.edulink.com')
    APPLICATION_SERVICE_URL = os.getenv('APPLICATION_SERVICE_URL', 'https://application-service.edulink.com')
    API_GATEWAY_URL = os.getenv('API_GATEWAY_URL', 'https://api.edulink.com')

class TestingConfig(ServiceConfig):
    """Testing environment configuration"""
    DEBUG = True
    INTERNSHIP_SERVICE_URL = 'http://localhost:8001'
    APPLICATION_SERVICE_URL = 'http://localhost:8002'
    API_GATEWAY_URL = 'http://localhost:8000'
    
    # Use in-memory databases for testing
    INTERNSHIP_DB_CONFIG = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
    
    APPLICATION_DB_CONFIG = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }

def get_config():
    """Get configuration based on environment"""
    env = os.getenv('DJANGO_ENV', 'development').lower()
    
    if env == 'production':
        return ProductionConfig()
    elif env == 'testing':
        return TestingConfig()
    else:
        return DevelopmentConfig()