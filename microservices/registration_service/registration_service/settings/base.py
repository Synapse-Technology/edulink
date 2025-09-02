"""Base settings for registration service."""

import os
import sys
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Add project root to Python path for shared modules
PROJECT_ROOT = BASE_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass


def get_env_variable(var_name, default=None):
    """Get the environment variable or return exception."""
    try:
        return os.environ[var_name]
    except KeyError:
        if default is not None:
            return default
        error_msg = f"Set the {var_name} environment variable"
        raise ImproperlyConfigured(error_msg)


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = get_env_variable('SECRET_KEY', 'django-insecure-change-me-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = get_env_variable('DEBUG', 'False').lower() == 'true'

ALLOWED_HOSTS = get_env_variable('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'drf_spectacular',
    'corsheaders',
    'django_filters',
    'django_extensions',
    'phonenumber_field',
    'django_ratelimit',
    'axes',
    'health_check',
    'health_check.db',
    'health_check.cache',
    'health_check.storage',
    'channels',
    'django_fsm',
    'cachalot',
    'admin_interface',
    'colorfield',
    'import_export',
    'crispy_forms',
    'crispy_bootstrap5',
    'auditlog',
    'reversion',
    'guardian',
    'django_countries',
    'django_crontab',
    'model_utils',
]

LOCAL_APPS = [
    'registration_requests',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django_ratelimit.middleware.RatelimitMiddleware',
    'axes.middleware.AxesMiddleware',
    'auditlog.middleware.AuditlogMiddleware',
]

ROOT_URLCONF = 'registration_service.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
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
ASGI_APPLICATION = 'registration_service.asgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': get_env_variable('DB_NAME', 'registration_service'),
        'USER': get_env_variable('DB_USER', 'postgres'),
        'PASSWORD': get_env_variable('DB_PASSWORD', 'postgres'),
        'HOST': get_env_variable('DB_HOST', 'localhost'),
        'PORT': get_env_variable('DB_PORT', '5432'),
        'OPTIONS': {},
    }
}

# Cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': get_env_variable('REDIS_URL', 'redis://localhost:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'KEY_PREFIX': 'registration_service',
        },
        'KEY_PREFIX': 'registration_service',
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
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Site ID
SITE_ID = 1

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
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# JWT Configuration
from datetime import timedelta

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
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

# DRF Spectacular settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'Registration Service API',
    'DESCRIPTION': 'API for managing self-service registration requests',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/v1/',
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
CELERY_BROKER_URL = get_env_variable('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = get_env_variable('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True

# Celery Beat Schedule
CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-requests': {
        'task': 'registration_requests.tasks.bulk_cleanup_expired_requests',
        'schedule': 3600.0,  # Every hour
    },
    'send-daily-admin-summary': {
        'task': 'registration_requests.tasks.send_daily_admin_summary',
        'schedule': 86400.0,  # Daily
    },
    'update-risk-scores': {
        'task': 'registration_requests.tasks.update_risk_scores',
        'schedule': 604800.0,  # Weekly
    },
}

# Email Configuration
EMAIL_BACKEND = 'anymail.backends.sendgrid.EmailBackend'
ANYMAIL = {
    'SENDGRID_API_KEY': get_env_variable('SENDGRID_API_KEY', ''),
}

DEFAULT_FROM_EMAIL = get_env_variable('DEFAULT_FROM_EMAIL', 'noreply@edulink.co.ke')
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Phone number field configuration
PHONENUMBER_DEFAULT_REGION = 'KE'
PHONENUMBER_DEFAULT_FORMAT = 'INTERNATIONAL'

# Django Guardian
ANONYMOUS_USER_NAME = None
GUARDIAN_RAISE_403 = True

# Django Axes (Security)
AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = 1  # 1 hour
AXES_LOCK_OUT_BY_COMBINATION_USER_AND_IP = True
AXES_RESET_ON_SUCCESS = True

# Rate limiting
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'default'

# Crispy Forms
CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
CRISPY_TEMPLATE_PACK = "bootstrap5"

# Admin Interface
X_FRAME_OPTIONS = 'SAMEORIGIN'
SILKY_PYTHON_PROFILER = True

# Channels
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [get_env_variable('REDIS_URL', 'redis://localhost:6379/2')],
        },
    },
}

# Logging
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
            'filename': BASE_DIR / 'logs' / 'registration_service.log',
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
        'registration_requests': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Kenya-specific settings
KENYA_SETTINGS = {
    'CUE_API_URL': get_env_variable('CUE_API_URL', 'https://api.cue.or.ke'),
    'CUE_API_KEY': get_env_variable('CUE_API_KEY', ''),
    'TVETA_API_URL': get_env_variable('TVETA_API_URL', 'https://api.tveta.go.ke'),
    'TVETA_API_KEY': get_env_variable('TVETA_API_KEY', ''),
    'SUPPORTED_DOMAINS': [
        'ac.ke', 'co.ke', 'or.ke', 'go.ke', 'ne.ke', 'sc.ke',
        'edu', 'org', 'com', 'net'
    ],
    'KNOWN_INSTITUTIONS': [
        'University of Nairobi',
        'Kenyatta University',
        'Moi University',
        'Egerton University',
        'Jomo Kenyatta University of Agriculture and Technology',
        'Maseno University',
        'Masinde Muliro University of Science and Technology',
        'Dedan Kimathi University of Technology',
        'Technical University of Kenya',
        'University of Eldoret',
        'Pwani University',
        'Laikipia University',
        'Chuka University',
        'Tharaka University',
        'Embu University',
        'Karatina University',
        'Kirinyaga University',
        'Maasai Mara University',
        'Meru University of Science and Technology',
        'Multimedia University of Kenya',
        'Murang\'a University of Technology',
        'South Eastern Kenya University',
        'Taita Taveta University',
        'The Co-operative University of Kenya',
        'The Technical University of Mombasa',
        'University of Kabianga',
        'Kisii University',
        'Rongo University',
        'Jaramogi Oginga Odinga University of Science and Technology',
        'Kenya Methodist University',
        'Mount Kenya University',
        'Strathmore University',
        'United States International University',
        'Catholic University of Eastern Africa',
        'Daystar University',
        'Africa International University',
        'Kenya Highlands Evangelical University',
        'Pan Africa Christian University',
        'Presbyterian University of East Africa',
        'St. Paul\'s University',
        'University of Eastern Africa, Baraton',
        'Adventist University of Africa',
        'Great Lakes University of Kisumu',
        'Kabarak University',
        'KCA University',
        'Kenya College of Accountancy University',
        'Management University of Africa',
        'Riara University',
        'The East African University',
        'Zetech University',
    ]
}

# Registration service specific settings
REGISTRATION_SETTINGS = {
    'EMAIL_VERIFICATION_EXPIRY_HOURS': 24,
    'REQUEST_EXPIRY_DAYS': 30,
    'ADMIN_REVIEW_TIMEOUT_DAYS': 7,
    'REMINDER_DAYS_BEFORE_EXPIRY': 3,
    'MAX_ATTACHMENTS_PER_REQUEST': 5,
    'MAX_ATTACHMENT_SIZE_MB': 10,
    'ALLOWED_ATTACHMENT_TYPES': [
        'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif'
    ],
    'RISK_ASSESSMENT': {
        'LOW_THRESHOLD': 30,
        'MEDIUM_THRESHOLD': 60,
        'HIGH_THRESHOLD': 80,
        'FACTORS': {
            'SUSPICIOUS_EMAIL_DOMAIN': 20,
            'NEW_DOMAIN': 10,
            'SUSPICIOUS_WEBSITE': 15,
            'UNKNOWN_INSTITUTION': 25,
            'HIGH_RISK_ROLE': 15,
            'MULTIPLE_REQUESTS_SAME_IP': 10,
            'SUSPICIOUS_LOCATION': 5,
        }
    },
    'AUTO_APPROVAL': {
        'ENABLED': True,
        'MAX_RISK_SCORE': 20,
        'REQUIRED_VERIFICATIONS': ['email', 'domain'],
        'EXCLUDED_ROLES': ['super_admin', 'system_admin'],
    }
}