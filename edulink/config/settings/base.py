"""
Base settings for Edulink project.
"""
from pathlib import Path
import os
import dj_database_url
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "django-insecure-n%6^@49(@dn^2!77l)hq6r4u4!$6!!)mbujn*5fy9y-!dw_th1"

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []

# Application definition
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "django_q",
]

LOCAL_APPS = [
    "edulink.shared.db.apps.DbConfig",
    "edulink.apps.accounts.apps.AccountsConfig",
    "edulink.apps.platform_admin.apps.AdminConfig",
    "edulink.apps.ledger.apps.LedgerConfig",
    "edulink.apps.students.apps.StudentsConfig",
    "edulink.apps.institutions.apps.InstitutionsConfig",
    "edulink.apps.employers.apps.EmployersConfig",
    "edulink.apps.internships.apps.InternshipsConfig",
    "edulink.apps.notifications.apps.NotificationsConfig",
    "edulink.apps.reports.apps.ReportsConfig",
    "edulink.apps.trust.apps.TrustConfig",
    "edulink.apps.support.apps.SupportConfig",
    "edulink.apps.contact.apps.ContactConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "edulink.apps.shared.middleware.ErrorHandlingMiddleware",  # Global exception handler
    "edulink.config.middleware.session_debug.SessionDebugMiddleware",  # DEBUG: Session logging
]

ROOT_URLCONF = "edulink.config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "edulink.config.wsgi.application"

# Database
DATABASES = {
    "default": dj_database_url.config(
        default=f"postgresql://{os.getenv('DB_USER', 'postgres')}:{os.getenv('DB_PASSWORD', '')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME', 'edulink')}",
        conn_max_age=600,
    )
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Media files
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom User Model
AUTH_USER_MODEL = "accounts.User"

# REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",  # Django native HttpOnly cookies
        "rest_framework_simplejwt.authentication.JWTAuthentication",  # Fallback for API/mobile clients
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
    "DEFAULT_PAGINATION_CLASS": "edulink.apps.shared.pagination.StandardResultsSetPagination",
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day",
        "application_submissions": "10/hour",
    },
    "EXCEPTION_HANDLER": "edulink.apps.shared.exceptions.edulink_exception_handler",
}

# Django Q2 Configuration (Background Tasks)
Q_CLUSTER = {
    'name': 'edulink_q',
    'workers': 4,
    'recycle': 500,
    'timeout': 60,
    'compress': True,
    'save_limit': 250,
    'queue_limit': 500,
    'label': 'Django Q',
    'orm': 'default',  # Use the default database as a broker
    'sync': os.getenv('DJANGO_Q_SYNC', str(DEBUG)).lower() == 'true',
    'scheduler': True,  # Enable periodic task scheduling
    'schedule_module': 'edulink.schedule',  # Load schedule definitions from this module
}

# Pusher Configuration (Managed Real-time)
PUSHER_APP_ID = os.getenv("PUSHER_APP_ID", "2112435")
PUSHER_KEY = os.getenv("PUSHER_KEY", "f43311e71172349f71a2")
PUSHER_SECRET = os.getenv("PUSHER_SECRET", "f68dffd5647b45eb1134")
PUSHER_CLUSTER = os.getenv("PUSHER_CLUSTER", "mt1")
PUSHER_SSL = True

# JWT Configuration
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUDIENCE": None,
    "ISSUER": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
}

# CORS Configuration - Enable credentials for HttpOnly cookies
CORS_ALLOWED_ORIGINS = [
    "https://edulink-frontend.com",
    "https://edulink-frontend-mb63.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
]

CORS_ALLOW_CREDENTIALS = True  # CRITICAL: Allow credentials (cookies) in CORS

CORS_EXPOSE_HEADERS = [
    "X-CSRFToken",
    "Content-Length",
    "X-Request-ID",
]

# Email Configuration
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "Edulink <noreply@edulink.com>")
EMAIL_HOST = os.getenv("EMAIL_HOST", "sandbox.smtp.mailtrap.io")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "91ab20b75900d4")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "e21d4d58c66dfe")
EMAIL_PORT = os.getenv("EMAIL_PORT", "2525")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "False").lower() == "true"
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "False").lower() == "true"
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "30"))

# Site Configuration
SITE_NAME = "Edulink"
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://edulink-frontend-mb63.onrender.com/")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
SITE_URL = FRONTEND_URL
SUPPORT_EMAIL = "support@edulink.com"

# Security Settings
PASSWORD_RESET_TOKEN_EXPIRE_HOURS = 1  # Token expires in 1 hour
EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS = 24  # Token expires in 24 hours

#CSRF & Session Cookie Security
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "False").lower() == "true"  # True in production
CSRF_COOKIE_SAMESITE = "None"  # Changed from Lax to None for cross-site requests between subdomains
CSRF_COOKIE_DOMAIN = os.getenv("CSRF_COOKIE_DOMAIN", None)  # Set to .onrender.com in production
CSRF_TRUSTED_ORIGINS = [
    "https://edulink-frontend.com",
    "https://edulink-frontend-mb63.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
]

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "False").lower() == "true"
SESSION_COOKIE_SAMESITE = "None"  # Changed from Lax to None for cross-site requests between subdomains
SESSION_COOKIE_DOMAIN = os.getenv("SESSION_COOKIE_DOMAIN", None)  # Set to .onrender.com or None for localhost
SESSION_COOKIE_PATH = "/"

#JWT Cookie Security
JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "False").lower() == "true"
JWT_COOKIE_HTTP_ONLY = True
JWT_COOKIE_SAMESITE = "Lax"
JWT_COOKIE_DOMAIN = os.getenv("JWT_COOKIE_DOMAIN", None)
JWT_COOKIE_PATH = "/"

# Logging Configuration
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "edulink": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "django.contrib.sessions": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}

# Debug: Log cookie configuration at startup
import sys
if "runserver" in sys.argv or "gunicorn" in sys.argv[0]:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"🔍 SESSION_COOKIE_DOMAIN={SESSION_COOKIE_DOMAIN}")
    logger.warning(f"🔍 SESSION_COOKIE_SECURE={SESSION_COOKIE_SECURE}")
    logger.warning(f"🔍 CSRF_COOKIE_DOMAIN={CSRF_COOKIE_DOMAIN}")
    logger.warning(f"🔍 CSRF_COOKIE_SECURE={CSRF_COOKIE_SECURE}")
    logger.warning(f"🔍 CORS_ALLOWED_ORIGINS={CORS_ALLOWED_ORIGINS}")
    logger.warning(f"🔍 CORS_ALLOW_CREDENTIALS={CORS_ALLOW_CREDENTIALS}")
