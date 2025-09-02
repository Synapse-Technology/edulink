"""Docker configuration for microservices deployment."""

import os
from typing import Dict, List, Any
from dataclasses import dataclass
from enum import Enum


class DeploymentEnvironment(Enum):
    """Deployment environments."""
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class ServiceDockerConfig:
    """Docker configuration for a service."""
    name: str
    image: str
    port: int
    environment: Dict[str, str]
    volumes: List[str] = None
    depends_on: List[str] = None
    health_check: Dict[str, Any] = None
    restart_policy: str = "unless-stopped"
    
    def __post_init__(self):
        if self.volumes is None:
            self.volumes = []
        if self.depends_on is None:
            self.depends_on = []


class DockerComposeGenerator:
    """Generator for Docker Compose configurations."""
    
    def __init__(self, environment: DeploymentEnvironment):
        self.environment = environment
        self.services = {}
        self.networks = {}
        self.volumes = {}
    
    def add_service(self, config: ServiceDockerConfig):
        """Add a service configuration."""
        self.services[config.name] = config
    
    def generate_compose_file(self) -> Dict[str, Any]:
        """Generate Docker Compose file content."""
        compose_config = {
            'version': '3.8',
            'services': {},
            'networks': {
                'edulink-network': {
                    'driver': 'bridge'
                }
            },
            'volumes': {
                'postgres_data': {},
                'redis_data': {}
            }
        }
        
        # Add database services
        compose_config['services'].update(self._get_database_services())
        
        # Add application services
        for service_name, service_config in self.services.items():
            compose_config['services'][service_name] = self._generate_service_config(service_config)
        
        return compose_config
    
    def _get_database_services(self) -> Dict[str, Any]:
        """Get database service configurations."""
        services = {}
        
        # PostgreSQL service
        services['postgres'] = {
            'image': 'postgres:15-alpine',
            'container_name': 'edulink-postgres',
            'environment': {
                'POSTGRES_DB': 'postgres',
                'POSTGRES_USER': 'postgres',
                'POSTGRES_PASSWORD': '${DB_PASSWORD}',
                'POSTGRES_MULTIPLE_DATABASES': 'auth_db,user_db,institution_db,application_db,notification_db,internship_db'
            },
            'ports': ['5432:5432'],
            'volumes': [
                'postgres_data:/var/lib/postgresql/data',
                './scripts/init-databases.sh:/docker-entrypoint-initdb.d/init-databases.sh'
            ],
            'networks': ['edulink-network'],
            'restart': 'unless-stopped',
            'healthcheck': {
                'test': ['CMD-SHELL', 'pg_isready -U postgres'],
                'interval': '30s',
                'timeout': '10s',
                'retries': 3
            }
        }
        
        # Redis service
        services['redis'] = {
            'image': 'redis:7-alpine',
            'container_name': 'edulink-redis',
            'ports': ['6379:6379'],
            'volumes': ['redis_data:/data'],
            'networks': ['edulink-network'],
            'restart': 'unless-stopped',
            'command': 'redis-server --appendonly yes',
            'healthcheck': {
                'test': ['CMD', 'redis-cli', 'ping'],
                'interval': '30s',
                'timeout': '10s',
                'retries': 3
            }
        }
        
        # Nginx reverse proxy (for production)
        if self.environment == DeploymentEnvironment.PRODUCTION:
            services['nginx'] = {
                'image': 'nginx:alpine',
                'container_name': 'edulink-nginx',
                'ports': ['80:80', '443:443'],
                'volumes': [
                    './nginx/nginx.conf:/etc/nginx/nginx.conf',
                    './nginx/ssl:/etc/nginx/ssl'
                ],
                'networks': ['edulink-network'],
                'depends_on': [
                    'auth-service',
                    'user-service',
                    'institution-service',
                    'application-service',
                    'notification-service',
                    'internship-service'
                ],
                'restart': 'unless-stopped'
            }
        
        return services
    
    def _generate_service_config(self, config: ServiceDockerConfig) -> Dict[str, Any]:
        """Generate Docker Compose service configuration."""
        service_config = {
            'build': {
                'context': f'./microservices/{config.name}',
                'dockerfile': 'Dockerfile'
            },
            'container_name': f'edulink-{config.name}',
            'environment': config.environment,
            'ports': [f'{config.port}:{config.port}'],
            'networks': ['edulink-network'],
            'restart': config.restart_policy,
            'depends_on': ['postgres', 'redis'] + config.depends_on
        }
        
        if config.volumes:
            service_config['volumes'] = config.volumes
        
        if config.health_check:
            service_config['healthcheck'] = config.health_check
        
        return service_config


def get_service_docker_configs(environment: DeploymentEnvironment) -> List[ServiceDockerConfig]:
    """Get Docker configurations for all services."""
    base_env = {
        'ENVIRONMENT': environment.value,
        'DB_HOST': 'postgres',
        'DB_PORT': '5432',
        'DB_USER': 'postgres',
        'DB_PASSWORD': '${DB_PASSWORD}',
        'REDIS_HOST': 'redis',
        'REDIS_PORT': '6379',
        'JWT_SECRET_KEY': '${JWT_SECRET_KEY}',
        'SERVICE_JWT_SECRET': '${SERVICE_JWT_SECRET}'
    }
    
    configs = []
    
    # Auth Service
    auth_env = base_env.copy()
    auth_env.update({
        'SERVICE_NAME': 'auth_service',
        'SERVICE_PORT': '8001',
        'DB_NAME': 'auth_db'
    })
    
    configs.append(ServiceDockerConfig(
        name='auth-service',
        image='edulink/auth-service',
        port=8001,
        environment=auth_env,
        health_check={
            'test': ['CMD', 'curl', '-f', 'http://localhost:8001/health/'],
            'interval': '30s',
            'timeout': '10s',
            'retries': 3
        }
    ))
    
    # User Service
    user_env = base_env.copy()
    user_env.update({
        'SERVICE_NAME': 'user_service',
        'SERVICE_PORT': '8002',
        'DB_NAME': 'user_db',
        'AUTH_SERVICE_URL': 'http://auth-service:8001'
    })
    
    configs.append(ServiceDockerConfig(
        name='user-service',
        image='edulink/user-service',
        port=8002,
        environment=user_env,
        depends_on=['auth-service'],
        health_check={
            'test': ['CMD', 'curl', '-f', 'http://localhost:8002/health/'],
            'interval': '30s',
            'timeout': '10s',
            'retries': 3
        }
    ))
    
    # Institution Service
    institution_env = base_env.copy()
    institution_env.update({
        'SERVICE_NAME': 'institution_service',
        'SERVICE_PORT': '8003',
        'DB_NAME': 'institution_db',
        'AUTH_SERVICE_URL': 'http://auth-service:8001',
        'USER_SERVICE_URL': 'http://user-service:8002'
    })
    
    configs.append(ServiceDockerConfig(
        name='institution-service',
        image='edulink/institution-service',
        port=8003,
        environment=institution_env,
        depends_on=['auth-service', 'user-service'],
        health_check={
            'test': ['CMD', 'curl', '-f', 'http://localhost:8003/health/'],
            'interval': '30s',
            'timeout': '10s',
            'retries': 3
        }
    ))
    
    # Application Service
    application_env = base_env.copy()
    application_env.update({
        'SERVICE_NAME': 'application_service',
        'SERVICE_PORT': '8004',
        'DB_NAME': 'application_db',
        'AUTH_SERVICE_URL': 'http://auth-service:8001',
        'USER_SERVICE_URL': 'http://user-service:8002',
        'INSTITUTION_SERVICE_URL': 'http://institution-service:8003'
    })
    
    configs.append(ServiceDockerConfig(
        name='application-service',
        image='edulink/application-service',
        port=8004,
        environment=application_env,
        depends_on=['auth-service', 'user-service', 'institution-service'],
        health_check={
            'test': ['CMD', 'curl', '-f', 'http://localhost:8004/health/'],
            'interval': '30s',
            'timeout': '10s',
            'retries': 3
        }
    ))
    
    # Notification Service
    notification_env = base_env.copy()
    notification_env.update({
        'SERVICE_NAME': 'notification_service',
        'SERVICE_PORT': '8005',
        'DB_NAME': 'notification_db',
        'AUTH_SERVICE_URL': 'http://auth-service:8001',
        'USER_SERVICE_URL': 'http://user-service:8002',
        'EMAIL_HOST': '${EMAIL_HOST}',
        'EMAIL_PORT': '${EMAIL_PORT}',
        'EMAIL_USER': '${EMAIL_USER}',
        'EMAIL_PASSWORD': '${EMAIL_PASSWORD}'
    })
    
    configs.append(ServiceDockerConfig(
        name='notification-service',
        image='edulink/notification-service',
        port=8005,
        environment=notification_env,
        depends_on=['auth-service', 'user-service'],
        health_check={
            'test': ['CMD', 'curl', '-f', 'http://localhost:8005/health/'],
            'interval': '30s',
            'timeout': '10s',
            'retries': 3
        }
    ))
    
    # Internship Service
    internship_env = base_env.copy()
    internship_env.update({
        'SERVICE_NAME': 'internship_service',
        'SERVICE_PORT': '8006',
        'DB_NAME': 'internship_db',
        'AUTH_SERVICE_URL': 'http://auth-service:8001',
        'USER_SERVICE_URL': 'http://user-service:8002',
        'INSTITUTION_SERVICE_URL': 'http://institution-service:8003'
    })
    
    configs.append(ServiceDockerConfig(
        name='internship-service',
        image='edulink/internship-service',
        port=8006,
        environment=internship_env,
        depends_on=['auth-service', 'user-service', 'institution-service'],
        health_check={
            'test': ['CMD', 'curl', '-f', 'http://localhost:8006/health/'],
            'interval': '30s',
            'timeout': '10s',
            'retries': 3
        }
    ))
    
    return configs


def generate_dockerfile_content(service_name: str, python_version: str = "3.11") -> str:
    """Generate Dockerfile content for a service."""
    return f"""# Dockerfile for {service_name}
FROM python:{python_version}-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
        netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Copy shared modules
COPY ../shared /app/shared

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Run the application
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
"""


def generate_nginx_config() -> str:
    """Generate Nginx configuration for reverse proxy."""
    return """events {
    worker_connections 1024;
}

http {
    upstream auth_service {
        server auth-service:8001;
    }
    
    upstream user_service {
        server user-service:8002;
    }
    
    upstream institution_service {
        server institution-service:8003;
    }
    
    upstream application_service {
        server application-service:8004;
    }
    
    upstream notification_service {
        server notification-service:8005;
    }
    
    upstream internship_service {
        server internship-service:8006;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        # Auth service
        location /api/v1/auth/ {
            proxy_pass http://auth_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # User service
        location /api/v1/users/ {
            proxy_pass http://user_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Institution service
        location /api/v1/institutions/ {
            proxy_pass http://institution_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Application service
        location /api/v1/applications/ {
            proxy_pass http://application_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Notification service
        location /api/v1/notifications/ {
            proxy_pass http://notification_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Internship service
        location /api/v1/internships/ {
            proxy_pass http://internship_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Health checks
        location /health/ {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
"""


def generate_init_db_script() -> str:
    """Generate database initialization script."""
    return """#!/bin/bash
set -e

# Create databases for each service
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE auth_db;
    CREATE DATABASE user_db;
    CREATE DATABASE institution_db;
    CREATE DATABASE application_db;
    CREATE DATABASE notification_db;
    CREATE DATABASE internship_db;
    
    -- Create schemas
    \c auth_db;
    CREATE SCHEMA IF NOT EXISTS auth_schema;
    
    \c user_db;
    CREATE SCHEMA IF NOT EXISTS user_schema;
    
    \c institution_db;
    CREATE SCHEMA IF NOT EXISTS institution_schema;
    
    \c application_db;
    CREATE SCHEMA IF NOT EXISTS application_schema;
    
    \c notification_db;
    CREATE SCHEMA IF NOT EXISTS notification_schema;
    
    \c internship_db;
    CREATE SCHEMA IF NOT EXISTS internship_schema;
EOSQL
"""


def generate_env_template() -> str:
    """Generate environment variables template."""
    return """# Database Configuration
DB_PASSWORD=your_secure_password_here

# JWT Configuration
JWT_SECRET_KEY=your_jwt_secret_key_here
SERVICE_JWT_SECRET=your_service_jwt_secret_here

# Email Configuration (for notification service)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password

# Environment
ENVIRONMENT=development
DEBUG=true

# External Services
# Add any external service configurations here
"""