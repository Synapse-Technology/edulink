import os
# Service identification
os.environ.setdefault('SERVICE_NAME', 'user')

from pathlib import Path
import environ

# Add shared modules to path
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Import shared database configuration
from shared.database.django_settings import (
    get_databases_config,
    get_database_routers,
)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Environment variables
env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, 'your-secret-key-here'),
    DATABASE_URL=(str, 'postgresql://user:password@localhost:5432/user_service_db'),
    REDIS_URL=(str, 'redis://localhost:6379/0'),
    ALLOWED_HOSTS=(list, ['localhost', '127.0.0.1']),
)

# Read .env file
environ.Env.read_env(BASE_DIR / '.env')

# Service configuration
SERVICE_NAME = env('SERVICE_NAME')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env('DEBUG')

ALLOWED_HOSTS = env('ALLOWED_HOSTS')

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'django_celery_beat',
    'django_celery_results',
    'health_check',
    'health_check.db',
    'health_check.cache',
    'health_check.storage',
]

LOCAL_APPS = [
    'user_service.apps.UserServiceConfig',
    'profiles',
    'roles',
    'institutions',
    'companies',  # Will be added after creating the app
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'shared.logging.middleware.RequestLoggingMiddleware',
    'shared.logging.middleware.SecurityLoggingMiddleware',
    'shared.monitoring.middleware.MetricsMiddleware',
    'shared.monitoring.middleware.HealthCheckMetricsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'user_service.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'user_service.wsgi.application'
ASGI_APPLICATION = 'user_service.asgi.application'

# Database configuration
# Use schema-aware database configuration

# Enhanced Schema Router
DATABASE_ROUTERS = ['shared.database.enhanced_router.EnhancedSchemaRouter']

DATABASES = get_databases_config('user')

# Set search path for this service schema
for db_config in DATABASES.values():
    if 'OPTIONS' not in db_config:
        db_config['OPTIONS'] = {}
    db_config['OPTIONS']['options'] = f'-c search_path=user_schema,public'

# Set search path for this service
for db_config in DATABASES.values():
    if 'OPTIONS' not in db_config:
        db_config['OPTIONS'] = {}
    db_config['OPTIONS']['options'] = f'-c search_path=user_schema,public'

# Database routers for schema support
DATABASE_ROUTERS = get_database_routers()

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'KEY_PREFIX': 'user_service',
        },
        'KEY_PREFIX': 'user_service',
        'VERSION': 1,
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = env('TIME_ZONE', default='UTC')
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'user_service.utils.custom_exception_handler',
}

# API Documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'User Service API',
    'DESCRIPTION': 'API for managing user profiles, roles, and institutions',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])
CORS_ALLOW_CREDENTIALS = True

# Celery Configuration
CELERY_BROKER_URL = env('CELERY_BROKER_URL')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Service Discovery Configuration
SERVICE_NAME = 'user-service'
SERVICE_HOST = env('SERVICE_HOST', default=None)
SERVICE_PORT = env('SERVICE_PORT', default=8002)

SERVICE_DISCOVERY = {
    'enabled': True,
    'backend': 'redis',
    'redis_url': env('REDIS_URL'),
    'health_check_interval': 30,
    'heartbeat_interval': 30,
    'auto_register': True,
    'health_check_path': '/health/',
    'metadata': {
        'version': '1.0.0',
        'environment': 'development' if DEBUG else 'production',
        'capabilities': ['user-profiles', 'institutions', 'roles', 'user-management']
    }
}

# Microservice URLs for service discovery
MICROSERVICE_URLS = {
    'auth-service': env('AUTH_SERVICE_URL', default='http://localhost:8001'),
    'internship-service': env('INTERNSHIP_SERVICE_URL', default='http://localhost:8003'),
    'application-service': env('APPLICATION_SERVICE_URL', default='http://localhost:8004'),
    'api-gateway': env('API_GATEWAY_URL', default='http://localhost:8000'),
}

# Service authentication token
SERVICE_AUTH_TOKEN = env('SERVICE_AUTH_TOKEN', default='your-service-auth-token')
SERVICE_TIMEOUT = int(env('SERVICE_TIMEOUT', default='30'))
SERVICE_RETRY_COUNT = int(env('SERVICE_RETRY_COUNT', default='3'))

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': env('LOG_LEVEL', default='INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': env('LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        'user_service': {
            'handlers': ['console'],
            'level': env('LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
    },
}
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Celery Beat Schedule
CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-invitations': {
        'task': 'profiles.tasks.cleanup_expired_invitations',
        'schedule': 3600.0,  # Every hour
    },
    'sync-profile-completion': {
        'task': 'profiles.tasks.sync_profile_completion_scores',
        'schedule': 1800.0,  # Every 30 minutes
    },
    'update-institution-stats': {
        'task': 'institutions.tasks.update_institution_statistics',
        'schedule': 3600.0,  # Every hour
    },
    'cleanup-inactive-profiles': {
        'task': 'profiles.tasks.cleanup_inactive_profiles',
        'schedule': 86400.0,  # Daily
    },
}

# Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# Session Configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_SAVE_EVERY_REQUEST = True

# CSRF Configuration
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'profiles': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'roles': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'institutions': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}

# Service Discovery (Consul)
CONSUL_HOST = env('CONSUL_HOST', default='localhost')
CONSUL_PORT = env.int('CONSUL_PORT', default=8500)
SERVICE_NAME = env('SERVICE_NAME', default='user-service')
SERVICE_PORT = env.int('SERVICE_PORT', default=8001)
HEALTH_CHECK_INTERVAL = env.int('HEALTH_CHECK_INTERVAL', default=10)

# Microservice Communication
AUTH_SERVICE_URL = env('AUTH_SERVICE_URL', default='http://localhost:8000')
NOTIFICATION_SERVICE_URL = env('NOTIFICATION_SERVICE_URL', default='http://localhost:8002')
INTERNSHIP_SERVICE_URL = env('INTERNSHIP_SERVICE_URL', default='http://localhost:8003')
APPLICATION_SERVICE_URL = env('APPLICATION_SERVICE_URL', default='http://localhost:8004')

# Service Authentication Tokens
AUTH_SERVICE_TOKEN = env('AUTH_SERVICE_TOKEN', default='')
NOTIFICATION_SERVICE_TOKEN = env('NOTIFICATION_SERVICE_TOKEN', default='')
INTERNSHIP_SERVICE_TOKEN = env('INTERNSHIP_SERVICE_TOKEN', default='')
APPLICATION_SERVICE_TOKEN = env('APPLICATION_SERVICE_TOKEN', default='')

# Service Timeouts
SERVICE_TIMEOUT = env.int('SERVICE_TIMEOUT', default=30)

# Profile Settings
PROFILE_PICTURE_MAX_SIZE = env.int('PROFILE_PICTURE_MAX_SIZE', default=5242880)  # 5MB
RESUME_MAX_SIZE = env.int('RESUME_MAX_SIZE', default=10485760)  # 10MB
ALLOWED_RESUME_TYPES = env.list('ALLOWED_RESUME_TYPES', default=['pdf', 'doc', 'docx'])
ALLOWED_IMAGE_TYPES = env.list('ALLOWED_IMAGE_TYPES', default=['jpg', 'jpeg', 'png', 'gif'])

# Institution Settings
INSTITUTION_VERIFICATION_REQUIRED = env.bool('INSTITUTION_VERIFICATION_REQUIRED', default=True)
AUTO_APPROVE_INSTITUTIONS = env.bool('AUTO_APPROVE_INSTITUTIONS', default=False)

# Email Configuration
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='localhost')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@edulink.com')

# Monitoring and Metrics
PROMETHEUS_ENABLED = env.bool('PROMETHEUS_ENABLED', default=False)
PROMETHEUS_METRICS_PORT = env.int('PROMETHEUS_METRICS_PORT', default=8001)