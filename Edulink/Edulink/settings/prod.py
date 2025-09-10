from .base import *
import os
from decouple import config

# Optional Sentry integration
try:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False

# SECURITY WARNING: Override insecure development settings
SECRET_KEY = config('SECRET_KEY', default=None)
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable must be set in production")

DEBUG = False

# Production domain configuration
ALLOWED_HOSTS = [
    config('DOMAIN_NAME', default='edulink.jhubafrica.com'),
    config('API_DOMAIN', default='api.edulink.jhubafrica.com'),
    config('WWW_DOMAIN', default='www.edulink.jhubafrica.com'),
    'edulink.jhubafrica.com',
    'www.edulink.jhubafrica.com',
    'api.edulink.jhubafrica.com',
    # Render.com domains
    '.onrender.com',
    'localhost',
    '127.0.0.1',
]

# Production email configuration
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT', cast=int, default=587)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', cast=bool, default=True)
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@edulink.com')

# Enhanced Production Security
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Production CORS Configuration
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    config('FRONTEND_URL', default='https://edulink.jhubafrica.com'),
    config('ADMIN_URL', default='https://admin.edulink.jhubafrica.com'),
    'https://edulink.jhubafrica.com',
    'https://www.edulink.jhubafrica.com',
    # Render.com domains
    'https://*.onrender.com',
]
CORS_ALLOW_CREDENTIALS = True

# Production CSRF Configuration
CSRF_TRUSTED_ORIGINS = [
    config('FRONTEND_URL', default='https://edulink.jhubafrica.com'),
    config('API_URL', default='https://api.edulink.jhubafrica.com'),
    'https://edulink.jhubafrica.com',
    'https://www.edulink.jhubafrica.com',
    'https://api.edulink.jhubafrica.com',
    # Render.com domains
    'https://*.onrender.com',
]

# Production Content Security Policy Override
CONTENT_SECURITY_POLICY = {
    'default-src': "'self'",
    'script-src': "'self' 'unsafe-inline'",
    'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    'font-src': "'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
    'img-src': "'self' data: https:",
    'connect-src': "'self' https://edulink.jhubafrica.com https://api.edulink.jhubafrica.com",
}

# Production Database Configuration
import dj_database_url

# Use DATABASE_URL if available (for Render), otherwise use individual config vars
DATABASE_URL = config('DATABASE_URL', default=None)
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME'),
            'USER': config('DB_USER'),
            'PASSWORD': config('DB_PASSWORD'),
            'HOST': config('DB_HOST'),
            'PORT': config('DB_PORT', default='5432'),
            'OPTIONS': {
                'sslmode': 'require',
            },
            'CONN_MAX_AGE': 600,
        }
    }

# Production Static Files Configuration
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Production Media Files Configuration
MEDIA_ROOT = config('MEDIA_ROOT', default=os.path.join(BASE_DIR, 'media'))

# Production Security Settings Override
SECURITY_SETTINGS = {
    'MAX_LOGIN_ATTEMPTS': 3,
    'LOGIN_ATTEMPT_TIMEOUT': 900,  # 15 minutes
    'SESSION_TIMEOUT': 1800,  # 30 minutes
    'PASSWORD_RESET_TIMEOUT': 1800,  # 30 minutes
    'BRUTE_FORCE_THRESHOLD': 5,
    'RATE_LIMIT_REQUESTS': 60,
    'RATE_LIMIT_WINDOW': 3600,
    'ENABLE_THREAT_DETECTION': True,
    'ENABLE_SESSION_SECURITY': True,
    'ENABLE_AUDIT_LOGGING': True,
    'ANONYMIZE_IP_ADDRESSES': True,
    'MINIMAL_LOGGING': True,
    'DATA_RETENTION_DAYS': 90,
    'GDPR_COMPLIANT': True,
}

# Production Rate Limiting
API_RATE_LIMIT = 100
API_RATE_WINDOW = 3600
AUTH_RATE_LIMIT = 10
AUTH_RATE_WINDOW = 900

# Production Admin Security
ADMIN_ALLOWED_IPS = config('ADMIN_ALLOWED_IPS', default='', cast=lambda v: [s.strip() for s in v.split(',') if s.strip()])

# Production Logging Configuration (Console-based for Render)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {name} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {asctime} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'security_console': {
            'level': 'WARNING',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'error_console': {
            'level': 'ERROR',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['security_console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['security_console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# Production Cache Configuration (Redis)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://redis:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'IGNORE_EXCEPTIONS': True,
        },
        'KEY_PREFIX': 'edulink_prod',
        'TIMEOUT': 300,
        'VERSION': 1,
    }
}

# Session backend using Redis
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Production Session Configuration Override
SESSION_COOKIE_AGE = 1800  # 30 minutes
SESSION_SAVE_EVERY_REQUEST = True

# Production Password Reset URL
PASSWORD_RESET_URL_TEMPLATE = config(
    'PASSWORD_RESET_URL_TEMPLATE',
    default='https://edulink.jhubafrica.com/reset-password/{uid}/{token}/'
)

# Celery Configuration for Production
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://redis:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_ENABLE_UTC = True
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = False
CELERY_WORKER_HIJACK_ROOT_LOGGER = False
CELERY_WORKER_PREFETCH_MULTIPLIER = 4
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000

# AWS S3 Configuration for Production
if config('USE_S3', default=False, cast=bool):
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    AWS_LOCATION = 'static'
    AWS_MEDIA_LOCATION = 'media'
    
    # Static files
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/{AWS_LOCATION}/'
    
    # Media files
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/{AWS_MEDIA_LOCATION}/'

# Sentry Configuration for Error Tracking
if SENTRY_AVAILABLE and config('SENTRY_DSN', default=None):
    sentry_sdk.init(
        dsn=config('SENTRY_DSN'),
        integrations=[
            DjangoIntegration(transaction_style='url'),
            CeleryIntegration(monitor_beat_tasks=True),
        ],
        traces_sample_rate=config('SENTRY_TRACES_SAMPLE_RATE', default=0.1, cast=float),
        send_default_pii=False,
        environment=config('ENVIRONMENT', default='production'),
        release=config('APP_VERSION', default='1.0.0'),
    )

# Feature Flags for Production
FEATURE_FLAGS = {
    'ENABLE_ANALYTICS': config('ENABLE_ANALYTICS', default=True, cast=bool),
    'ENABLE_CHATBOT': config('ENABLE_CHATBOT', default=True, cast=bool),
    'ENABLE_NOTIFICATIONS': config('ENABLE_NOTIFICATIONS', default=True, cast=bool),
    'ENABLE_MONITORING': config('ENABLE_MONITORING', default=True, cast=bool),
    'ENABLE_RATE_LIMITING': config('ENABLE_RATE_LIMITING', default=True, cast=bool),
    'ENABLE_AUDIT_LOGGING': config('ENABLE_AUDIT_LOGGING', default=True, cast=bool),
}

# Performance Settings
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000

# Database Connection Pooling
DATABASES['default']['CONN_MAX_AGE'] = 600
if 'OPTIONS' not in DATABASES['default']:
    DATABASES['default']['OPTIONS'] = {}
DATABASES['default']['OPTIONS'].update({
    'sslmode': 'require',
    'connect_timeout': 10,
})

# Disable development-only settings
DEVELOPMENT_MODE = False
SKIP_SECURITY_FOR_LOCALHOST = False
