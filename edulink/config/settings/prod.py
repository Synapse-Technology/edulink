"""
Production settings for Edulink project.
"""
from .base import *
from django.core.exceptions import ImproperlyConfigured

DEBUG = False

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY or SECRET_KEY must be set in production.")

REQUIRE_EMAIL_VERIFICATION_FOR_APPLICATIONS = os.environ.get(
    "REQUIRE_EMAIL_VERIFICATION_FOR_APPLICATIONS", "True"
).lower() in {"1", "true", "yes"}
REQUIRE_CV_FOR_APPLICATIONS = os.environ.get(
    "REQUIRE_CV_FOR_APPLICATIONS", "True"
).lower() in {"1", "true", "yes"}

ALLOWED_HOSTS = [
    "edulink.jhubafrica.com",
    "www.edulink.jhubafrica.com",
    ".onrender.com",  # Allow all Render subdomains
    ".edulinkcareer.me"
]

CSRF_TRUSTED_ORIGINS = [
    "https://edulink.jhubafrica.com",
    "https://www.edulink.jhubafrica.com",
    "https://edulink-frontend-mb63.onrender.com",
    "https://edulinkcareer.me",
    "https://www.edulinkcareer.me",
]

# Add Render host to trusted origins if present
RENDER_EXTERNAL_URL = os.environ.get("RENDER_EXTERNAL_URL")
if RENDER_EXTERNAL_URL:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_URL.replace("https://", ""))
    CSRF_TRUSTED_ORIGINS.append(RENDER_EXTERNAL_URL)

# Security
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_HSTS_SECONDS = 31536000
SECURE_REDIRECT_EXEMPT = []
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Database
DATABASES = {
    "default": dj_database_url.config(
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Email backend for production
EMAIL_BACKEND = os.environ.get("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
# Default to the base settings EMAIL_HOST when no env var is provided to avoid
# attempting to connect to an empty hostname which causes blocking socket errors.
EMAIL_HOST = os.environ.get("EMAIL_HOST", EMAIL_HOST if 'EMAIL_HOST' in globals() else "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
# Allow overriding TLS usage from env (defaults to True in prod)
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True").lower() in {"1", "true", "yes"}
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "Edulink <no-reply@edulinkcareer.me>")

# Socket connect timeout (seconds) used by the notification email sender to avoid
# blocking background workers when SMTP is unreachable. Configure in Render
# environment as `EMAIL_CONNECT_TIMEOUT`. Defaults to 5 seconds.
EMAIL_CONNECT_TIMEOUT = int(os.environ.get("EMAIL_CONNECT_TIMEOUT", "5"))

# Logging
LOGGING["root"]["level"] = "WARNING"

# CORS
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "https://edulink.jhubafrica.com",
    "https://www.edulink.jhubafrica.com",
    "https://edulink-frontend-mb63.onrender.com",
    "https://edulinkcareer.me",
    "https://www.edulinkcareer.me",
]

# Production Apps
INSTALLED_APPS += [
    "storages",
]

# Media Storage (Supabase via S3)
# Use S3-compatible Supabase Storage for persistent media storage
if all([
    os.environ.get('SUPABASE_S3_ACCESS_KEY'),
    os.environ.get('SUPABASE_S3_SECRET_KEY'),
    os.environ.get('SUPABASE_S3_ENDPOINT'),
]):
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "access_key": os.environ.get('SUPABASE_S3_ACCESS_KEY'),
            "secret_key": os.environ.get('SUPABASE_S3_SECRET_KEY'),
            "bucket_name": os.environ.get('SUPABASE_S3_BUCKET', 'artifacts'),
            "endpoint_url": os.environ.get('SUPABASE_S3_ENDPOINT'),
            "region_name": "auto",
            "use_ssl": True,
            "verify": True,
            "default_acl": "private",  # All files private by default; RLS policies grant access
            "file_overwrite": False,
        }
    }
else:
    # Fallback to local storage if Supabase not configured
    STORAGES["default"] = {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
        "OPTIONS": {
            "location": os.path.join(BASE_DIR, "media"),
            "base_url": "/media/",
        }
    }

# Site Configuration
BACKEND_URL = os.environ.get("BACKEND_URL", os.environ.get("SITE_URL", "https://api.edulinkcareer.me/"))
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://edulinkcareer.me")
SITE_URL = FRONTEND_URL
# Admin/support email for production. Can be overridden via env var SUPPORT_EMAIL.
SUPPORT_EMAIL = os.environ.get("SUPPORT_EMAIL", "synapsetechnology14@gmail.com")

# WhiteNoise Configuration
# Use StaticFilesStorage to avoid build failures due to missing files or compression errors.
# This is a safer option for environments where some third-party static files might be missing.
STORAGES["staticfiles"] = {
    "BACKEND": "whitenoise.storage.StaticFilesStorage",
}

# Django Q Configuration for Production
Q_CLUSTER = {
    'name': 'edulink_q_prod',
    'workers': os.cpu_count() * 2 if os.cpu_count() else 4,
    'recycle': 500,
    'timeout': 60,
    'compress': True,
    'save_limit': 1000,
    'queue_limit': 500,
    'label': 'Django Q',
    'orm': 'default',
    # In production prefer asynchronous background workers. Set DJANGO_Q_SYNC=true
    # only for debugging. Default is False to avoid running tasks inline during
    # web requests which can block when external services (SMTP) are unreachable.
    'sync': os.getenv('DJANGO_Q_SYNC', 'False').lower() == 'true',
    'retry': 120,      # Consider task failed if not finished in 120s
    'max_attempts': 3,  # Automatically retry tasks up to 3 times on failure
    'ack_failures': True,
    'scheduler': True,
    'schedule_module': 'edulink.schedule',  # Load schedule definitions from this module
}
