"""Django settings integration for centralized database configuration."""

import os
from typing import Dict, Any

from .config import get_service_database_config, get_cross_service_database_config, SchemaRouter

def get_databases_config(service_name: str) -> Dict[str, Any]:
    """Get Django DATABASES configuration for a service.
    
    Args:
        service_name: Name of the microservice
        
    Returns:
        Django DATABASES configuration
    """
    # Primary database for the service
    primary_db = get_service_database_config(service_name)
    
    # Cross-service database for operations spanning multiple schemas
    cross_service_db = get_cross_service_database_config()
    
    # Create all database aliases that SchemaRouter expects
    databases = {
        'default': primary_db,
        'auth_db': get_service_database_config('auth'),
        'user_db': get_service_database_config('user'),
        'institution_db': get_service_database_config('institution'),
        'notification_db': get_service_database_config('notification'),
        'application_db': get_service_database_config('application'),
        'internship_db': get_service_database_config('internship'),
        'cross_service': cross_service_db,
    }
    
    return databases

def get_database_routers() -> list:
    """Get Django database routers configuration.
    
    Returns:
        List of database router classes
    """
    return [
        'shared.database.config.SchemaRouter',
    ]

# Service-specific settings templates (lazy loading)
def get_auth_service_databases():
    return get_databases_config('auth')

def get_user_service_databases():
    return get_databases_config('user')

def get_institution_service_databases():
    return get_databases_config('institution')

def get_notification_service_databases():
    return get_databases_config('notification')

def get_application_service_databases():
    return get_databases_config('application')

def get_internship_service_databases():
    return get_databases_config('internship')

# Common database settings
COMMON_DATABASE_SETTINGS = {
    'DATABASE_ROUTERS': get_database_routers(),
    'DEFAULT_AUTO_FIELD': 'django.db.models.BigAutoField',
}

# Environment-specific overrides
def apply_environment_overrides(databases: Dict[str, Any]) -> Dict[str, Any]:
    """Apply environment-specific database overrides.
    
    Args:
        databases: Base database configuration
        
    Returns:
        Updated database configuration
    """
    # Development overrides
    if os.getenv('DJANGO_ENV') == 'development':
        for db_config in databases.values():
            db_config['OPTIONS']['sslmode'] = 'prefer'
            db_config['CONN_MAX_AGE'] = 0  # Disable connection pooling in dev
    
    # Production overrides
    elif os.getenv('DJANGO_ENV') == 'production':
        for db_config in databases.values():
            db_config['OPTIONS']['sslmode'] = 'require'
            db_config['CONN_MAX_AGE'] = 600
            db_config['CONN_HEALTH_CHECKS'] = True
    
    # Test overrides
    elif os.getenv('DJANGO_ENV') == 'test':
        for db_config in databases.values():
            db_config['NAME'] = f"test_{db_config['NAME']}"
            db_config['OPTIONS']['sslmode'] = 'prefer'
    
    return databases

# Logging configuration for database operations
DATABASE_LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'database': {
            'format': '{levelname} {asctime} {name} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'database_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/database.log',
            'maxBytes': 1024*1024*15,  # 15MB
            'backupCount': 10,
            'formatter': 'database',
        },
        'database_console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'database',
        },
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['database_file', 'database_console'],
            'level': 'INFO',
            'propagate': False,
        },
        'shared.database': {
            'handlers': ['database_file', 'database_console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Health check configuration
HEALTH_CHECK_DATABASES = {
    'HEALTH_CHECK': {
        'APPLICATIONS': [
            'health_check.db',
            'health_check.cache',
        ],
        'DATABASE_BACKENDS': {
            'default': 'health_check.db.backends.DatabaseBackend',
        },
    }
}

# Cache configuration using Redis
CACHE_CONFIG = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
        },
        'KEY_PREFIX': 'edulink',
        'TIMEOUT': 300,
    },
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://localhost:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'edulink_sessions',
        'TIMEOUT': 86400,  # 24 hours
    },
}

# Session configuration
SESSION_CONFIG = {
    'SESSION_ENGINE': 'django.contrib.sessions.backends.cache',
    'SESSION_CACHE_ALIAS': 'sessions',
    'SESSION_COOKIE_AGE': 86400,  # 24 hours
    'SESSION_COOKIE_SECURE': True,
    'SESSION_COOKIE_HTTPONLY': True,
    'SESSION_COOKIE_SAMESITE': 'Lax',
}

# Example usage in service settings.py:
"""
# In auth_service/settings.py
from shared.database.django_settings import (
    AUTH_SERVICE_DATABASES,
    COMMON_DATABASE_SETTINGS,
    apply_environment_overrides,
    DATABASE_LOGGING,
    CACHE_CONFIG,
    SESSION_CONFIG
)

# Database configuration
DATABASES = apply_environment_overrides(AUTH_SERVICE_DATABASES)
DATABASE_ROUTERS = COMMON_DATABASE_SETTINGS['DATABASE_ROUTERS']
DEFAULT_AUTO_FIELD = COMMON_DATABASE_SETTINGS['DEFAULT_AUTO_FIELD']

# Cache configuration
CACHES = CACHE_CONFIG

# Session configuration
SESSION_ENGINE = SESSION_CONFIG['SESSION_ENGINE']
SESSION_CACHE_ALIAS = SESSION_CONFIG['SESSION_CACHE_ALIAS']
SESSION_COOKIE_AGE = SESSION_CONFIG['SESSION_COOKIE_AGE']
SESSION_COOKIE_SECURE = SESSION_CONFIG['SESSION_COOKIE_SECURE']
SESSION_COOKIE_HTTPONLY = SESSION_CONFIG['SESSION_COOKIE_HTTPONLY']
SESSION_COOKIE_SAMESITE = SESSION_CONFIG['SESSION_COOKIE_SAMESITE']

# Logging configuration
LOGGING = DATABASE_LOGGING
"""