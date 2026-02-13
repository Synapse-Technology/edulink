"""
Production settings for Edulink project.
"""
from .base import *

DEBUG = False

ALLOWED_HOSTS = [
    "edulink.jhubafrica.com",
    "www.edulink.jhubafrica.com",
    ".onrender.com",  # Allow all Render subdomains
]

CSRF_TRUSTED_ORIGINS = [
    "https://edulink.jhubafrica.com",
    "https://www.edulink.jhubafrica.com",
    "https://edulink-frontend-mb63.onrender.com",
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
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")

# Logging
LOGGING["root"]["level"] = "WARNING"

# CORS
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "https://edulink.jhubafrica.com",
    "https://www.edulink.jhubafrica.com",
    "https://edulink-frontend-mb63.onrender.com",
]

# Media Storage (Cloudinary)
# Render Free tier has an ephemeral file system. We use Cloudinary for persistent media storage.
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.environ.get('CLOUDINARY_CLOUD_NAME'),
    'API_KEY': os.environ.get('CLOUDINARY_API_KEY'),
    'API_SECRET': os.environ.get('CLOUDINARY_API_SECRET'),
}

if CLOUDINARY_STORAGE['CLOUD_NAME']:
    STORAGES["default"] = {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    }

# WhiteNoise Configuration
# Use StaticFilesStorage to avoid build failures due to missing files or compression errors.
# This is a safer option for environments where some third-party static files might be missing.
STORAGES["staticfiles"] = {
    "BACKEND": "whitenoise.storage.StaticFilesStorage",
}
