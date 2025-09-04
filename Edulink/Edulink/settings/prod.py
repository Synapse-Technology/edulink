from .base import *
import os
from decouple import config

# SECURITY WARNING: Override insecure development settings
SECRET_KEY = config('SECRET_KEY', default=None)
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable must be set in production")

DEBUG = False

# Production domain configuration
ALLOWED_HOSTS = [
    config('DOMAIN_NAME', default='edulink.com'),
    config('API_DOMAIN', default='api.edulink.com'),
    config('WWW_DOMAIN', default='www.edulink.com'),
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
    config('FRONTEND_URL', default='https://edulink.com'),
    config('ADMIN_URL', default='https://admin.edulink.com'),
]
CORS_ALLOW_CREDENTIALS = True

# Production CSRF Configuration
CSRF_TRUSTED_ORIGINS = [
    config('FRONTEND_URL', default='https://edulink.com'),
    config('API_URL', default='https://api.edulink.com'),
]

# Production Database Configuration
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

# Production Logging Configuration
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
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
            'maxBytes': 1024*1024*10,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'security_file': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'security.log'),
            'maxBytes': 1024*1024*10,  # 10MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'console': {
            'level': 'ERROR',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['security_file', 'console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['security_file'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# Production Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'edulink_prod',
        'TIMEOUT': 300,
    }
}

# Production Session Configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 1800  # 30 minutes
SESSION_SAVE_EVERY_REQUEST = True

# Production Password Reset URL
PASSWORD_RESET_URL_TEMPLATE = config(
    'PASSWORD_RESET_URL_TEMPLATE',
    default='https://edulink.com/reset-password/{uid}/{token}/'
)

# Disable development-only settings
DEVELOPMENT_MODE = False
SKIP_SECURITY_FOR_LOCALHOST = False
