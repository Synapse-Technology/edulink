import os
import sys
import environ
from datetime import timedelta
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Environment variables
env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, 'your-secret-key-here'),
    DATABASE_URL=(str, 'postgresql://user:password@localhost:5432/edulink'),
    REDIS_URL=(str, 'redis://localhost:6379/0'),
    ALLOWED_HOSTS=(list, ['localhost', '127.0.0.1']),
    SERVICE_NAME=(str, 'registration'),
    SERVICE_SCHEMA=(str, 'registration_schema'),
)

# Read .env file FIRST
environ.Env.read_env(BASE_DIR / '.env')

# Service configuration - MUST be defined before imports
SERVICE_NAME = env('SERVICE_NAME')
SERVICE_SCHEMA = env('SERVICE_SCHEMA')

# Debug: Print values at import time
print(f"DEBUG: At settings import time - SERVICE_NAME: {SERVICE_NAME}, SERVICE_SCHEMA: {SERVICE_SCHEMA}")

# Add shared modules to path AFTER loading environment
sys.path.append(str(Path(__file__).parent.parent.parent))
# Add user_service to path for institutions app
sys.path.append(str(Path(__file__).parent.parent.parent / 'user_service'))

# Import shared database configuration AFTER environment is loaded
from shared.database.django_settings import (
    get_databases_config,
    get_database_routers,
)

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
    'rest_framework_simplejwt',
    'corsheaders',
    'django_extensions',
    'django_celery_beat',
    'django_celery_results',
    'health_check',
    'health_check.db',
    'health_check.cache',
    'health_check.storage',
]

LOCAL_APPS = [
    'registration_service.apps.RegistrationServiceConfig',
    'registration_requests',
    'verification',
    'approval_workflows',
    'institutions',  # From user_service
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

ROOT_URLCONF = 'registration_service.urls'

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

WSGI_APPLICATION = 'registration_service.wsgi.application'

# Database configuration using shared settings
DATABASES = get_databases_config(SERVICE_NAME)
DATABASE_ROUTERS = get_database_routers()

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
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=60),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

CORS_ALLOW_CREDENTIALS = True

# Celery Configuration
CELERY_BROKER_URL = env('CELERY_BROKER_URL')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'KEY_PREFIX': 'registration_service',
        },
        'KEY_PREFIX': 'registration_service',
        'VERSION': 1,
    }
}

# Logging configuration
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
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'registration_service.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'registration_service': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Kenya-specific configuration for institutional verification
KENYA_VERIFICATION_CONFIG = {
    'CUE_API_URL': 'https://imis.cue.or.ke/api',  # Hypothetical API endpoint
    'TVETA_API_URL': 'https://www.tveta.go.ke/api',  # Hypothetical API endpoint
    'VERIFICATION_TIMEOUT': 30,
    'CACHE_VERIFICATION_RESULTS': True,
    'CACHE_DURATION': 3600,  # 1 hour
    'SUPPORTED_DOMAINS': [
        '.ac.ke',  # Academic institutions
        '.edu',    # International education domains
        '.edu.ke', # Kenyan education domains
    ],
    'MANUAL_REVIEW_THRESHOLD': 0.7,  # Risk score threshold for manual review
}

# Registration workflow configuration
REGISTRATION_WORKFLOW_CONFIG = {
    'AUTO_APPROVE_THRESHOLD': 0.9,  # Risk score for auto-approval
    'FAST_TRACK_THRESHOLD': 0.8,   # Risk score for fast-track review
    'ADMIN_REVIEW_TIMEOUT_HOURS': 72,  # Hours before escalation
    'EMAIL_VERIFICATION_TIMEOUT_HOURS': 24,
    'DOMAIN_VERIFICATION_REQUIRED': True,
    'DOCUMENT_VERIFICATION_REQUIRED': False,  # For MVP
    'NOTIFICATION_CHANNELS': ['email', 'in_app'],
}

# Service URLs for inter-service communication
MICROSERVICE_URLS = {
    'auth': 'http://localhost:8001',
    'user': 'http://localhost:8002',
    'notification': 'http://localhost:8003',
    'registration': 'http://localhost:8004',
}

# Service authentication token
SERVICE_AUTH_TOKEN = env('SERVICE_AUTH_TOKEN', default='dev-service-token')