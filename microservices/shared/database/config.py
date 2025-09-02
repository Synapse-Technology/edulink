"""Centralized database configuration for Edulink microservices with Supabase."""

import os
import environ
from typing import Dict, Any
from urllib.parse import urlparse

# Initialize environment
env = environ.Env(
    DATABASE_URL=(str, ''),
    SUPABASE_URL=(str, ''),
    SUPABASE_ANON_KEY=(str, ''),
    SUPABASE_SERVICE_ROLE_KEY=(str, ''),
    DATABASE_PASSWORD=(str, ''),
    DATABASE_HOST=(str, 'localhost'),
    DATABASE_PORT=(int, 5432),
    DATABASE_NAME=(str, 'postgres'),
    DATABASE_USER=(str, 'postgres'),
    DATABASE_POOL_SIZE=(int, 20),
    DATABASE_MAX_OVERFLOW=(int, 30),
    DATABASE_POOL_TIMEOUT=(int, 30),
    DATABASE_POOL_RECYCLE=(int, 3600),
)

# Try to read .env file from current working directory
env_file_path = os.path.join(os.getcwd(), '.env')
if os.path.exists(env_file_path):
    environ.Env.read_env(env_file_path)

class DatabaseConfig:
    """Centralized database configuration for all microservices."""
    
    def __init__(self):
        self.supabase_url = env('SUPABASE_URL')
        self.supabase_anon_key = env('SUPABASE_ANON_KEY')
        self.supabase_service_role_key = env('SUPABASE_SERVICE_ROLE_KEY')
        
        # Check if DATABASE_URL is provided, parse it if available
        database_url = env('DATABASE_URL')
        if database_url:
            from urllib.parse import unquote
            parsed_url = urlparse(database_url)
            self.host = parsed_url.hostname
            self.port = parsed_url.port or 5432
            self.database_name = parsed_url.path.lstrip('/')
            self.database_user = parsed_url.username
            self.database_password = unquote(parsed_url.password) if parsed_url.password else None
        else:
            # Fallback to individual environment variables
            self.host = env('DATABASE_HOST')
            self.port = env('DATABASE_PORT')
            self.database_name = env('DATABASE_NAME')
            self.database_user = env('DATABASE_USER')
            self.database_password = env('DATABASE_PASSWORD')
        
        # Extract project ID from Supabase URL if available
        if self.supabase_url:
            parsed_url = urlparse(self.supabase_url)
            self.project_id = parsed_url.hostname.split('.')[0] if parsed_url.hostname else 'local'
        else:
            self.project_id = 'local'
    
    def get_database_config(self, service_name: str, schema_name: str) -> Dict[str, Any]:
        """Get database configuration for a specific service.
        
        Args:
            service_name: Name of the microservice (auth, user, institution, etc.)
            schema_name: Database schema name for the service
            
        Returns:
            Dictionary containing database configuration
        """
        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': self.database_name,
            'USER': self.database_user,
            'PASSWORD': self.database_password,
            'HOST': self.host,
            'PORT': self.port,
            'OPTIONS': {
                'sslmode': 'require' if 'supabase.co' in self.host else 'prefer',
                'application_name': f'edulink_{service_name}_service',
                'options': f'-c search_path={schema_name},public'
            },
            'CONN_MAX_AGE': 600,  # Connection pooling
            'CONN_HEALTH_CHECKS': True,
        }
    
    def get_connection_pool_config(self) -> Dict[str, Any]:
        """Get connection pool configuration."""
        return {
            'POOL_SIZE': env('DATABASE_POOL_SIZE'),
            'MAX_OVERFLOW': env('DATABASE_MAX_OVERFLOW'),
            'POOL_TIMEOUT': env('DATABASE_POOL_TIMEOUT'),
            'POOL_RECYCLE': env('DATABASE_POOL_RECYCLE'),
        }
    
    def get_supabase_client_config(self) -> Dict[str, str]:
        """Get Supabase client configuration for direct API access."""
        return {
            'url': self.supabase_url,
            'anon_key': self.supabase_anon_key,
            'service_role_key': self.supabase_service_role_key,
        }

# Service-specific schema mappings
SERVICE_SCHEMAS = {
    'auth': 'auth_schema',
    'user': 'user_schema',
    'institution': 'institution_schema',
    'registration': 'auth_schema',  # Registration service uses auth schema (auth tables)
    'notification': 'notification_schema',
    'application': 'application_schema',
    'internship': 'internship_schema',
}

# Global database configuration instance
db_config = DatabaseConfig()

def get_service_database_config(service_name: str) -> Dict[str, Any]:
    """Get database configuration for a specific service.
    
    Args:
        service_name: Name of the microservice
        
    Returns:
        Database configuration dictionary
    """
    schema_name = SERVICE_SCHEMAS.get(service_name)
    if not schema_name:
        raise ValueError(f"Unknown service: {service_name}")
    
    return db_config.get_database_config(service_name, schema_name)

def get_cross_service_database_config() -> Dict[str, Any]:
    """Get database configuration for cross-service operations.
    
    This configuration allows access to all schemas for operations
    that need to query across services.
    """
    all_schemas = ','.join(SERVICE_SCHEMAS.values())
    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': db_config.database_name,
        'USER': db_config.database_user,
        'PASSWORD': db_config.database_password,
        'HOST': db_config.host,
        'PORT': db_config.port,
        'OPTIONS': {
            'sslmode': 'require' if 'supabase.co' in db_config.host else 'prefer',
            'application_name': 'edulink_cross_service',
            'options': f'-c search_path={all_schemas},public'
        },
        'CONN_MAX_AGE': 600,
        'CONN_HEALTH_CHECKS': True,
    }

# Database router for schema-based routing
class SchemaRouter:
    """Database router for directing queries to appropriate schemas."""
    
    def db_for_read(self, model, **hints):
        """Suggest the database to read from."""
        app_label = model._meta.app_label
        
        # For registration service, allow Django built-in apps to use default database
        # since auth tables exist in auth_schema
        service_name = os.environ.get('SERVICE_NAME', '')
        if service_name == 'registration':
            # Registration service uses auth_schema which has auth tables
            django_builtin_apps = ['auth', 'contenttypes', 'sessions', 'admin']
            if app_label in django_builtin_apps:
                return None  # Use default database
            # For other apps, continue with normal routing
        
        # Map app labels to database aliases for other services
        app_to_db = {
            # Django built-in apps for auth service
            'auth': 'auth_db',
            'contenttypes': 'auth_db',
            'sessions': 'auth_db',
            'admin': 'auth_db',
            # Custom auth service apps
            'authentication': 'auth_db',
            'security': 'auth_db',
            # User service apps
            'users': 'user_db',
            'profiles': 'user_db',
            'roles': 'user_db',
            'institutions': 'user_db',
            'companies': 'user_db',
            # Other service apps
            'notifications': 'notification_db',
            'applications': 'application_db',
            'internships': 'internship_db',
        }
        
        return app_to_db.get(app_label)
    
    def db_for_write(self, model, **hints):
        """Suggest the database to write to."""
        return self.db_for_read(model, **hints)
    
    def allow_relation(self, obj1, obj2, **hints):
        """Allow relations between objects in the same schema or cross-schema if explicitly allowed."""
        # Allow all relations for now - can be restricted later if needed
        return True
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure that certain apps' models get created on the right database."""
        # For registration service, allow all migrations on default database
        service_name = os.environ.get('SERVICE_NAME', '')
        if service_name == 'registration':
            return db == 'default'
        
        app_to_db = {
            # Django built-in apps for auth service
            'auth': 'auth_db',
            'contenttypes': 'auth_db',
            'sessions': 'auth_db',
            'admin': 'auth_db',
            # Custom auth service apps
            'authentication': 'auth_db',
            'security': 'auth_db',
            # User service apps
            'users': 'user_db',
            'profiles': 'user_db',
            'roles': 'user_db',
            'institutions': 'user_db',
            'companies': 'user_db',
            # Other service apps
            'notifications': 'notification_db',
            'applications': 'application_db',
            'internships': 'internship_db',
        }
        
        expected_db = app_to_db.get(app_label)
        if expected_db:
            return db == expected_db
        
        # Default apps can migrate to any database
        return db == 'default'