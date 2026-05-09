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
    "api.edulinkcareer.me",
    ".onrender.com",
    ".edulinkcareer.me"
]

CSRF_TRUSTED_ORIGINS = [
    "https://edulink.jhubafrica.com",
    "https://www.edulink.jhubafrica.com",
    "https://api.edulinkcareer.me",
    "https://edulink-frontend-mb63.onrender.com",
    "https://edulinkcareer.me",
    "https://www.edulinkcareer.me",
]

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

# Email (Mailtrap via AnyMail HTTP API)
EMAIL_BACKEND = "anymail.backends.mailtrap.EmailBackend"
ANYMAIL = {
    "MAILTRAP_API_TOKEN": os.environ.get("MAILTRAP_API_TOKEN", "").strip(),
}
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "Edulink <no-reply@edulinkcareer.me>")

if not ANYMAIL["MAILTRAP_API_TOKEN"]:
    raise ImproperlyConfigured("MAILTRAP_API_TOKEN must be set in production.")

# Logging
LOGGING["root"]["level"] = "WARNING"

# CORS
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "https://edulink.jhubafrica.com",
    "https://www.edulink.jhubafrica.com",
    "https://api.edulinkcareer.me",
    "https://edulink-frontend-mb63.onrender.com",
    "https://edulinkcareer.me",
    "https://www.edulinkcareer.me",
]

# Production Apps
INSTALLED_APPS += [
    "storages",
    "anymail",
]

# Media Storage (Supabase via S3)
# Env var names match exactly what is set in Render dashboard
_s3_access_key = os.environ.get('SUPABASE_S3_ACCESS_KEY', '').strip()
_s3_secret_key = os.environ.get('SUPABASE_S3_SECRET_KEY', '').strip()
_s3_endpoint = os.environ.get('SUPABASE_S3_ENDPOINT', '').strip()
_s3_bucket = os.environ.get('SUPABASE_S3_BUCKET', 'artifacts').strip()

if _s3_access_key and _s3_secret_key and _s3_endpoint:
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "access_key": _s3_access_key,
            "secret_key": _s3_secret_key,
            "bucket_name": _s3_bucket,
            "endpoint_url": _s3_endpoint,
            "region_name": "auto",
            "use_ssl": True,
            "verify": True,
            "default_acl": "private",
            "file_overwrite": False,
        }
    }
else:
    import logging as _logging
    _logging.getLogger(__name__).critical(
        f"[STORAGE] S3 not configured — falling back to local filesystem. "
        f"access_key={'SET' if _s3_access_key else 'MISSING'} "
        f"secret_key={'SET' if _s3_secret_key else 'MISSING'} "
        f"endpoint={'SET' if _s3_endpoint else 'MISSING'}"
    )
    STORAGES["default"] = {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
        "OPTIONS": {
            "location": os.path.join(BASE_DIR, "media"),
            "base_url": "/media/",
        }
    }

# Static files
STORAGES["staticfiles"] = {
    "BACKEND": "whitenoise.storage.StaticFilesStorage",
}

# Site Configuration
BACKEND_URL = os.environ.get("BACKEND_URL", os.environ.get("SITE_URL", "https://api.edulinkcareer.me/"))
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://edulinkcareer.me")
SITE_URL = FRONTEND_URL
SUPPORT_EMAIL = os.environ.get("SUPPORT_EMAIL", "synapsetechnology14@gmail.com")

# Django Q
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
    'sync': os.getenv('DJANGO_Q_SYNC', 'False').lower() == 'true',
    'retry': 120,
    'max_attempts': 3,
    'ack_failures': True,
    'scheduler': True,
    'schedule_module': 'edulink.schedule',
}