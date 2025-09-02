"""Production settings for registration service."""

from .base import *
import os

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = get_env_variable('ALLOWED_HOSTS', 'edulink.co.ke,api.edulink.co.ke').split(',')

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'

# Database with connection pooling
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': get_env_variable('DB_NAME'),
        'USER': get_env_variable('DB_USER'),
        'PASSWORD': get_env_variable('DB_PASSWORD'),
        'HOST': get_env_variable('DB_HOST'),
        'PORT': get_env_variable('DB_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'require',
        },
        'CONN_MAX_AGE': 600,
    }
}

# Cache configuration with Redis
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': get_env_variable('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'IGNORE_EXCEPTIONS': True,
        },
        'KEY_PREFIX': 'registration_service',
        'TIMEOUT': 300,
    }
}

# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_NAME = 'registration_sessionid'
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_SAVE_EVERY_REQUEST = True

# CSRF configuration
CSRF_COOKIE_AGE = 3600
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_NAME = 'registration_csrftoken'
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_TRUSTED_ORIGINS = [
    'https://edulink.co.ke',
    'https://api.edulink.co.ke',
    'https://admin.edulink.co.ke',
]

# CORS settings for production
CORS_ALLOWED_ORIGINS = [
    'https://edulink.co.ke',
    'https://admin.edulink.co.ke',
    'https://app.edulink.co.ke',
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

# Static and media files for production
STATIC_URL = '/static/'
STATIC_ROOT = '/var/www/registration_service/static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = '/var/www/registration_service/media/'

# Use WhiteNoise for static files
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Email configuration for production
EMAIL_BACKEND = 'anymail.backends.sendgrid.EmailBackend'
ANYMAIL = {
    'SENDGRID_API_KEY': get_env_variable('SENDGRID_API_KEY'),
    'SENDGRID_GENERATE_MESSAGE_ID': True,
    'SENDGRID_MERGE_FIELD_FORMAT': '-{}-',
    'SENDGRID_API_URL': 'https://api.sendgrid.com/v3/',
}

DEFAULT_FROM_EMAIL = get_env_variable('DEFAULT_FROM_EMAIL')
SERVER_EMAIL = get_env_variable('SERVER_EMAIL', DEFAULT_FROM_EMAIL)
EMAIL_SUBJECT_PREFIX = '[Registration Service] '

# Celery Configuration for production
CELERY_BROKER_URL = get_env_variable('CELERY_BROKER_URL')
CELERY_RESULT_BACKEND = get_env_variable('CELERY_RESULT_BACKEND')
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = False
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000

# Channels for production
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [get_env_variable('REDIS_URL')],
            'capacity': 1500,
            'expiry': 10,
        },
    },
}

# Enhanced security middleware
MIDDLEWARE += [
    'django.middleware.security.SecurityMiddleware',
]

# Django Axes configuration for production
AXES_FAILURE_LIMIT = 3
AXES_COOLOFF_TIME = 24  # 24 hours
AXES_LOCK_OUT_BY_COMBINATION_USER_AND_IP = True
AXES_RESET_ON_SUCCESS = True
AXES_ENABLE_ADMIN = True
AXES_VERBOSE = False

# Rate limiting for production
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'default'

# Logging for production
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json': {
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
            'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/registration_service/registration_service.log',
            'maxBytes': 1024*1024*15,  # 15MB
            'backupCount': 10,
            'formatter': 'json',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/registration_service/error.log',
            'maxBytes': 1024*1024*15,  # 15MB
            'backupCount': 10,
            'formatter': 'json',
        },
        'syslog': {
            'level': 'INFO',
            'class': 'logging.handlers.SysLogHandler',
            'address': '/dev/log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['file', 'syslog'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['error_file', 'syslog'],
            'level': 'WARNING',
            'propagate': False,
        },
        'registration_requests': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': False,
        },
        'celery': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Monitoring and health checks
INSTALLED_APPS += [
    'django_prometheus',
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
] + MIDDLEWARE + [
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

# Health check configuration
HEALTH_CHECK = {
    'DISK_USAGE_MAX': 90,  # percent
    'MEMORY_MIN': 100,    # in MB
}

# Production-specific registration settings
REGISTRATION_SETTINGS.update({
    'EMAIL_VERIFICATION_EXPIRY_HOURS': 24,
    'REQUEST_EXPIRY_DAYS': 30,
    'ADMIN_REVIEW_TIMEOUT_DAYS': 7,
    'REMINDER_DAYS_BEFORE_EXPIRY': 3,
    'MAX_ATTACHMENTS_PER_REQUEST': 3,
    'MAX_ATTACHMENT_SIZE_MB': 5,
    'AUTO_APPROVAL': {
        'ENABLED': True,
        'MAX_RISK_SCORE': 15,  # Stricter in production
        'REQUIRED_VERIFICATIONS': ['email', 'domain', 'institution'],
        'EXCLUDED_ROLES': ['super_admin', 'system_admin'],
    },
    'RISK_ASSESSMENT': {
        'LOW_THRESHOLD': 25,
        'MEDIUM_THRESHOLD': 50,
        'HIGH_THRESHOLD': 75,
        'FACTORS': {
            'SUSPICIOUS_EMAIL_DOMAIN': 25,
            'NEW_DOMAIN': 15,
            'SUSPICIOUS_WEBSITE': 20,
            'UNKNOWN_INSTITUTION': 30,
            'HIGH_RISK_ROLE': 20,
            'MULTIPLE_REQUESTS_SAME_IP': 15,
            'SUSPICIOUS_LOCATION': 10,
        }
    }
})

# Kenya API settings for production
KENYA_SETTINGS.update({
    'CUE_API_URL': get_env_variable('CUE_API_URL'),
    'CUE_API_KEY': get_env_variable('CUE_API_KEY'),
    'TVETA_API_URL': get_env_variable('TVETA_API_URL'),
    'TVETA_API_KEY': get_env_variable('TVETA_API_KEY'),
})

# Data retention policies
DATA_RETENTION = {
    'APPROVED_REQUESTS': 365,  # days
    'REJECTED_REQUESTS': 180,  # days
    'EXPIRED_REQUESTS': 90,    # days
    'LOG_FILES': 30,           # days
    'AUDIT_LOGS': 2555,        # days (7 years)
}

# Backup configuration
DBBACKUP_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
DBBACKUP_STORAGE_OPTIONS = {
    'access_key': get_env_variable('AWS_ACCESS_KEY_ID'),
    'secret_key': get_env_variable('AWS_SECRET_ACCESS_KEY'),
    'bucket_name': get_env_variable('AWS_BACKUP_BUCKET'),
    'default_acl': 'private',
}

# Performance optimizations
DATABASE_ROUTERS = ['registration_service.routers.DatabaseRouter']

# Content Security Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "'unsafe-eval'")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_FONT_SRC = ("'self'", "https:")
CSP_CONNECT_SRC = ("'self'", "https:")
CSP_FRAME_ANCESTORS = ("'none'",)
CSP_BASE_URI = ("'self'",)
CSP_FORM_ACTION = ("'self'",)