"""Development settings for registration service."""

from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Database - Using environment variables
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': get_env_variable('DATABASE_NAME', 'postgres'),
        'USER': get_env_variable('DATABASE_USER'),
        'PASSWORD': get_env_variable('DATABASE_PASSWORD'),
        'HOST': get_env_variable('DATABASE_HOST'),
        'PORT': get_env_variable('DATABASE_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'require',
            'application_name': 'edulink_registration_service',
            'options': f"-c search_path={get_env_variable('SERVICE_SCHEMA', 'institution_schema')},auth_schema,public"
        },
    }
}

# Cache configuration for development
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': get_env_variable('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'KEY_PREFIX': 'registration_service',
        },
        'KEY_PREFIX': 'registration_service',
        'VERSION': 1,
    }
}

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# CORS settings for development
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Disable CSRF for development API testing
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
]

# Django Extensions
# INSTALLED_APPS += [
#     'debug_toolbar',
# ]

# MIDDLEWARE += [
#     'debug_toolbar.middleware.DebugToolbarMiddleware',
# ]

# Debug Toolbar
# INTERNAL_IPS = [
#     '127.0.0.1',
#     'localhost',
# ]

# DEBUG_TOOLBAR_CONFIG = {
#     'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG,
# }

# Celery Configuration for development
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Logging for development
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
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'registration_requests': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Development-specific registration settings
REGISTRATION_SETTINGS.update({
    'EMAIL_VERIFICATION_EXPIRY_HOURS': 1,  # Shorter for testing
    'REQUEST_EXPIRY_DAYS': 7,  # Shorter for testing
    'ADMIN_REVIEW_TIMEOUT_DAYS': 1,  # Shorter for testing
    'REMINDER_DAYS_BEFORE_EXPIRY': 1,  # Shorter for testing
    'AUTO_APPROVAL': {
        'ENABLED': False,  # Disable auto-approval in development
        'MAX_RISK_SCORE': 20,
        'REQUIRED_VERIFICATIONS': ['email'],
        'EXCLUDED_ROLES': ['super_admin', 'system_admin'],
    }
})

# Kenya API settings for development (use mock/test endpoints)
KENYA_SETTINGS.update({
    'CUE_API_URL': 'https://api-test.cue.or.ke',
    'TVETA_API_URL': 'https://api-test.tveta.go.ke',
})