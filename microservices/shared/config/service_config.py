"""Configuration settings for microservices."""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class ServiceType(Enum):
    """Enumeration of service types."""
    AUTH = "auth"
    USER = "user"
    INSTITUTION = "institution"
    APPLICATION = "application"
    NOTIFICATION = "notification"
    INTERNSHIP = "internship"


class Environment(Enum):
    """Enumeration of deployment environments."""
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class DatabaseConfig:
    """Database configuration."""
    host: str
    port: int
    name: str
    user: str
    password: str
    schema: Optional[str] = None
    ssl_mode: str = "require"
    max_connections: int = 20
    connection_timeout: int = 30
    
    @property
    def url(self) -> str:
        """Get database URL."""
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"


@dataclass
class RedisConfig:
    """Redis configuration."""
    host: str
    port: int
    password: Optional[str] = None
    db: int = 0
    ssl: bool = False
    max_connections: int = 50
    connection_timeout: int = 10
    
    @property
    def url(self) -> str:
        """Get Redis URL."""
        protocol = "rediss" if self.ssl else "redis"
        auth = f":{self.password}@" if self.password else ""
        return f"{protocol}://{auth}{self.host}:{self.port}/{self.db}"


@dataclass
class ServiceConfig:
    """Service configuration."""
    name: str
    type: ServiceType
    host: str
    port: int
    debug: bool = False
    environment: Environment = Environment.DEVELOPMENT
    secret_key: str = "default-secret-key"
    allowed_hosts: list = None
    cors_origins: list = None
    
    def __post_init__(self):
        if self.allowed_hosts is None:
            self.allowed_hosts = ["localhost", "127.0.0.1"]
        if self.cors_origins is None:
            self.cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    @property
    def base_url(self) -> str:
        """Get service base URL."""
        return f"http://{self.host}:{self.port}"


class ConfigManager:
    """Configuration manager for microservices."""
    
    def __init__(self, service_type: ServiceType):
        self.service_type = service_type
        self._config_cache = {}
    
    def get_service_config(self) -> ServiceConfig:
        """Get service configuration."""
        if 'service' not in self._config_cache:
            self._config_cache['service'] = self._load_service_config()
        return self._config_cache['service']
    
    def get_database_config(self) -> DatabaseConfig:
        """Get database configuration."""
        if 'database' not in self._config_cache:
            self._config_cache['database'] = self._load_database_config()
        return self._config_cache['database']
    
    def get_redis_config(self) -> RedisConfig:
        """Get Redis configuration."""
        if 'redis' not in self._config_cache:
            self._config_cache['redis'] = self._load_redis_config()
        return self._config_cache['redis']
    
    def get_service_urls(self) -> Dict[str, str]:
        """Get URLs for all services."""
        if 'service_urls' not in self._config_cache:
            self._config_cache['service_urls'] = self._load_service_urls()
        return self._config_cache['service_urls']
    
    def get_jwt_config(self) -> Dict[str, Any]:
        """Get JWT configuration."""
        if 'jwt' not in self._config_cache:
            self._config_cache['jwt'] = self._load_jwt_config()
        return self._config_cache['jwt']
    
    def _load_service_config(self) -> ServiceConfig:
        """Load service configuration from environment."""
        service_name = f"{self.service_type.value}_service"
        
        # Default ports for each service
        default_ports = {
            ServiceType.AUTH: 8001,
            ServiceType.USER: 8002,
            ServiceType.INSTITUTION: 8003,
            ServiceType.APPLICATION: 8004,
            ServiceType.NOTIFICATION: 8005,
            ServiceType.INTERNSHIP: 8006
        }
        
        return ServiceConfig(
            name=service_name,
            type=self.service_type,
            host=os.getenv('SERVICE_HOST', 'localhost'),
            port=int(os.getenv('SERVICE_PORT', default_ports[self.service_type])),
            debug=os.getenv('DEBUG', 'False').lower() == 'true',
            environment=Environment(os.getenv('ENVIRONMENT', 'development')),
            secret_key=os.getenv('SECRET_KEY', 'default-secret-key'),
            allowed_hosts=os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(','),
            cors_origins=os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')
        )
    
    def _load_database_config(self) -> DatabaseConfig:
        """Load database configuration from environment."""
        # Schema mapping for each service
        schema_mapping = {
            ServiceType.AUTH: 'auth_schema',
            ServiceType.USER: 'user_schema',
            ServiceType.INSTITUTION: 'institution_schema',
            ServiceType.APPLICATION: 'application_schema',
            ServiceType.NOTIFICATION: 'notification_schema',
            ServiceType.INTERNSHIP: 'internship_schema'
        }
        
        return DatabaseConfig(
            host=os.getenv('DB_HOST', 'aws-0-us-east-1.pooler.supabase.com'),
            port=int(os.getenv('DB_PORT', '6543')),
            name=os.getenv('DB_NAME', 'postgres'),
            user=os.getenv('DB_USER', 'postgres.ixqjqjqjqjqjqjqj'),
            password=os.getenv('DB_PASSWORD', ''),
            schema=schema_mapping.get(self.service_type),
            ssl_mode=os.getenv('DB_SSL_MODE', 'require'),
            max_connections=int(os.getenv('DB_MAX_CONNECTIONS', '20')),
            connection_timeout=int(os.getenv('DB_CONNECTION_TIMEOUT', '30'))
        )
    
    def _load_redis_config(self) -> RedisConfig:
        """Load Redis configuration from environment."""
        return RedisConfig(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', '6379')),
            password=os.getenv('REDIS_PASSWORD'),
            db=int(os.getenv('REDIS_DB', '0')),
            ssl=os.getenv('REDIS_SSL', 'False').lower() == 'true',
            max_connections=int(os.getenv('REDIS_MAX_CONNECTIONS', '50')),
            connection_timeout=int(os.getenv('REDIS_CONNECTION_TIMEOUT', '10'))
        )
    
    def _load_service_urls(self) -> Dict[str, str]:
        """Load service URLs from environment."""
        base_url = os.getenv('SERVICES_BASE_URL', 'http://localhost')
        
        return {
            'auth': os.getenv('AUTH_SERVICE_URL', f'{base_url}:8001'),
            'user': os.getenv('USER_SERVICE_URL', f'{base_url}:8002'),
            'institution': os.getenv('INSTITUTION_SERVICE_URL', f'{base_url}:8003'),
            'application': os.getenv('APPLICATION_SERVICE_URL', f'{base_url}:8004'),
            'notification': os.getenv('NOTIFICATION_SERVICE_URL', f'{base_url}:8005'),
            'internship': os.getenv('INTERNSHIP_SERVICE_URL', f'{base_url}:8006')
        }
    
    def _load_jwt_config(self) -> Dict[str, Any]:
        """Load JWT configuration from environment."""
        return {
            'secret_key': os.getenv('JWT_SECRET_KEY', 'default-jwt-secret'),
            'service_secret_key': os.getenv('SERVICE_JWT_SECRET', 'default-service-secret'),
            'algorithm': os.getenv('JWT_ALGORITHM', 'HS256'),
            'access_token_expire_minutes': int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '30')),
            'refresh_token_expire_days': int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', '7')),
            'service_token_expire_minutes': int(os.getenv('SERVICE_TOKEN_EXPIRE_MINUTES', '60'))
        }
    
    def reload_config(self):
        """Reload configuration from environment."""
        self._config_cache.clear()
    
    def get_environment_info(self) -> Dict[str, Any]:
        """Get environment information."""
        service_config = self.get_service_config()
        
        return {
            'service_name': service_config.name,
            'service_type': service_config.type.value,
            'environment': service_config.environment.value,
            'debug': service_config.debug,
            'host': service_config.host,
            'port': service_config.port,
            'base_url': service_config.base_url
        }


# Global configuration instances for each service type
_config_managers = {}


def get_config_manager(service_type: ServiceType) -> ConfigManager:
    """Get configuration manager for a service type."""
    if service_type not in _config_managers:
        _config_managers[service_type] = ConfigManager(service_type)
    return _config_managers[service_type]


def get_current_service_config() -> ServiceConfig:
    """Get configuration for the current service."""
    service_name = os.getenv('SERVICE_NAME', 'auth_service')
    
    # Extract service type from service name
    service_type_map = {
        'auth_service': ServiceType.AUTH,
        'user_service': ServiceType.USER,
        'institution_service': ServiceType.INSTITUTION,
        'application_service': ServiceType.APPLICATION,
        'notification_service': ServiceType.NOTIFICATION,
        'internship_service': ServiceType.INTERNSHIP
    }
    
    service_type = service_type_map.get(service_name, ServiceType.AUTH)
    config_manager = get_config_manager(service_type)
    
    return config_manager.get_service_config()


def get_database_settings() -> Dict[str, Any]:
    """Get Django database settings."""
    service_name = os.getenv('SERVICE_NAME', 'auth_service')
    service_type_map = {
        'auth_service': ServiceType.AUTH,
        'user_service': ServiceType.USER,
        'institution_service': ServiceType.INSTITUTION,
        'application_service': ServiceType.APPLICATION,
        'notification_service': ServiceType.NOTIFICATION,
        'internship_service': ServiceType.INTERNSHIP
    }
    
    service_type = service_type_map.get(service_name, ServiceType.AUTH)
    config_manager = get_config_manager(service_type)
    db_config = config_manager.get_database_config()
    
    return {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': db_config.name,
            'USER': db_config.user,
            'PASSWORD': db_config.password,
            'HOST': db_config.host,
            'PORT': db_config.port,
            'OPTIONS': {
                'sslmode': db_config.ssl_mode,
                'options': f'-c search_path={db_config.schema}' if db_config.schema else ''
            },
            'CONN_MAX_AGE': 600,
            'CONN_HEALTH_CHECKS': True,
        }
    }


def get_redis_settings() -> Dict[str, Any]:
    """Get Redis cache settings."""
    service_name = os.getenv('SERVICE_NAME', 'auth_service')
    service_type_map = {
        'auth_service': ServiceType.AUTH,
        'user_service': ServiceType.USER,
        'institution_service': ServiceType.INSTITUTION,
        'application_service': ServiceType.APPLICATION,
        'notification_service': ServiceType.NOTIFICATION,
        'internship_service': ServiceType.INTERNSHIP
    }
    
    service_type = service_type_map.get(service_name, ServiceType.AUTH)
    config_manager = get_config_manager(service_type)
    redis_config = config_manager.get_redis_config()
    
    return {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': redis_config.url,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': redis_config.max_connections,
                    'socket_timeout': redis_config.connection_timeout,
                    'socket_connect_timeout': redis_config.connection_timeout,
                }
            },
            'KEY_PREFIX': f'{service_name}:',
            'TIMEOUT': 300,  # 5 minutes default
        }
    }