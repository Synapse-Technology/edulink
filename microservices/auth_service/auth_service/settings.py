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
    SERVICE_NAME=(str, 'auth'),
    SERVICE_SCHEMA=(str, 'auth_schema'),
)

# Read .env file FIRST
environ.Env.read_env(BASE_DIR / '.env')

# Add shared modules to path AFTER loading environment
sys.path.append(str(Path(__file__).parent.parent.parent))

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

# Service configuration
SERVICE_NAME = env('SERVICE_NAME')
SERVICE_SCHEMA = env('SERVICE_SCHEMA')

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
    'auth_service.apps.AuthServiceConfig',
    'authentication',
    'security',
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
    'authentication.middleware.SecurityEventMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'auth_service.urls'

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

WSGI_APPLICATION = 'auth_service.wsgi.application'
ASGI_APPLICATION = 'auth_service.asgi.application'

# Database
# Use schema-aware database configuration
DATABASES = get_databases_config(SERVICE_NAME)

# Database routers for schema support
DATABASE_ROUTERS = get_database_routers()

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

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
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '5/minute',
    },
    'EXCEPTION_HANDLER': 'authentication.exceptions.custom_exception_handler',
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
    'ISSUER': 'edulink-auth-service',
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

CORS_ALLOW_CREDENTIALS = True

# Celery Configuration
CELERY_BROKER_URL = env('REDIS_URL')
CELERY_RESULT_BACKEND = env('REDIS_URL')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'

# Service Discovery Configuration
SERVICE_NAME = 'auth-service'
SERVICE_HOST = env('SERVICE_HOST', default=None)
SERVICE_PORT = env('SERVICE_PORT', default=8001)

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
        'capabilities': ['authentication', 'authorization', 'jwt', 'user-management']
    }
}

# Microservice URLs for service discovery
MICROSERVICE_URLS = {
    'user-service': env('USER_SERVICE_URL', default='http://localhost:8002'),
    'internship-service': env('INTERNSHIP_SERVICE_URL', default='http://localhost:8003'),
    'application-service': env('APPLICATION_SERVICE_URL', default='http://localhost:8004'),
    'api-gateway': env('API_GATEWAY_URL', default='http://localhost:8000'),
}

# Service authentication token
SERVICE_AUTH_TOKEN = env('SERVICE_AUTH_TOKEN', default='your-service-auth-token')
SERVICE_TIMEOUT = int(env('SERVICE_TIMEOUT', default='30'))
SERVICE_RETRY_COUNT = int(env('SERVICE_RETRY_COUNT', default='3'))

# Logging Configuration
LOGGING_CONFIG = None  # Disable Django's default logging config
import sys
sys.path.append(os.path.join(BASE_DIR, '../../shared'))
try:
    from logging.config import setup_logging
    setup_logging('auth-service', env('LOG_LEVEL', default='INFO'))
except ImportError:
    # Fallback to basic logging if shared module is not available
    import logging
    logging.basicConfig(level=env('LOG_LEVEL', default='INFO'))
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Celery Beat Schedule
CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-tokens': {
        'task': 'authentication.tasks.cleanup_expired_tokens',
        'schedule': timedelta(hours=1),
    },
    'unlock-accounts': {
        'task': 'authentication.tasks.unlock_accounts',
        'schedule': timedelta(minutes=30),
    },
    'cleanup-security-events': {
        'task': 'security.tasks.cleanup_old_security_events',
        'schedule': timedelta(days=1),
    },
    'cleanup-audit-logs': {
        'task': 'security.tasks.cleanup_old_audit_logs',
        'schedule': timedelta(days=1),
    },
    'cleanup-expired-sessions': {
        'task': 'security.tasks.cleanup_expired_sessions',
        'schedule': timedelta(hours=6),
    },
    'cleanup-failed-attempts': {
        'task': 'security.tasks.cleanup_old_failed_attempts',
        'schedule': timedelta(days=1),
    },
    'detect-suspicious-activity': {
        'task': 'security.tasks.detect_suspicious_activity',
        'schedule': timedelta(hours=1),
    },
    'generate-security-report': {
        'task': 'security.tasks.generate_security_report',
        'schedule': timedelta(days=1),
    },
    'update-risk-scores': {
        'task': 'security.tasks.update_risk_scores',
        'schedule': timedelta(hours=6),
    },
    'monitor-system-health': {
        'task': 'security.tasks.monitor_system_health',
        'schedule': timedelta(minutes=30),
    },
}

# Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Session Configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_SAVE_EVERY_REQUEST = True

# CSRF Configuration
CSRF_COOKIE_SECURE = not DEBUG
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
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'auth_service.log',
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
        'authentication': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'security': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Service Discovery Configuration
SERVICE_DISCOVERY = {
    'ENABLED': env.bool('SERVICE_DISCOVERY_ENABLED', default=True),
    'CONSUL_HOST': env('CONSUL_HOST', default='localhost'),
    'CONSUL_PORT': env.int('CONSUL_PORT', default=8500),
    'SERVICE_NAME': 'auth-service',
    'SERVICE_PORT': env.int('SERVICE_PORT', default=8000),
    'HEALTH_CHECK_INTERVAL': '10s',
}

# Microservice Communication
MICROSERVICES = {
    'USER_SERVICE': {
        'URL': env('USER_SERVICE_URL', default='http://localhost:8001'),
        'TIMEOUT': 30,
    },
    'API_GATEWAY': {
        'URL': env('API_GATEWAY_URL', default='http://localhost:8080'),
        'TIMEOUT': 30,
    },
}

# Rate Limiting
RATE_LIMITING = {
    'LOGIN_ATTEMPTS': {
        'MAX_ATTEMPTS': 5,
        'WINDOW_MINUTES': 15,
        'LOCKOUT_MINUTES': 30,
    },
    'PASSWORD_RESET': {
        'MAX_ATTEMPTS': 3,
        'WINDOW_MINUTES': 60,
    },
    'REGISTRATION': {
        'MAX_ATTEMPTS': 3,
        'WINDOW_MINUTES': 60,
    },
}

# Email Configuration (for password reset, etc.)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = env('EMAIL_HOST', default='localhost')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@edulink.com')

# Monitoring and Metrics
MONITORING = {
    'PROMETHEUS_ENABLED': env.bool('PROMETHEUS_ENABLED', default=True),
    'METRICS_PORT': env.int('METRICS_PORT', default=9090),
}