from .base import *
import os
from decouple import config

# Development-specific overrides
DEBUG = True

ALLOWED_HOSTS = ["*"]  # For local testing

# Static files configuration for development
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Development email configuration - using Gmail with App Password
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', cast=int, default=587)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', cast=bool, default=True)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', cast=bool, default=False)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='your_gmail_address@gmail.com')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='your_google_app_password')
EMAIL_SSL_CERTFILE = config('EMAIL_SSL_CERTFILE', default=None)
EMAIL_SSL_KEYFILE = config('EMAIL_SSL_KEYFILE', default=None)
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='your_gmail_address@gmail.com')
SERVER_EMAIL = config('SERVER_EMAIL', default='bokwaro@edulink.jhubafrica.com')

# For development - bypass SSL verification issues
import ssl
ssl._create_default_https_context = ssl._create_unverified_context

# Additional SSL bypass for email
import smtplib
original_starttls = smtplib.SMTP.starttls
def patched_starttls(self, keyfile=None, certfile=None, context=None):
    if context is None:
        context = ssl._create_unverified_context()
    return original_starttls(self, keyfile, certfile, context)
smtplib.SMTP.starttls = patched_starttls

# Development CORS settings - allow all origins for testing
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Development security settings - less restrictive for testing
SESSION_COOKIE_SECURE = False  # HTTP allowed in development
CSRF_COOKIE_SECURE = False     # HTTP allowed in development
DEVELOPMENT_MODE = True
SKIP_SECURITY_FOR_LOCALHOST = True

# Development CSRF trusted origins
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
]

# Development rate limiting - more permissive
API_RATE_LIMIT = 1000
AUTH_RATE_LIMIT = 100

# Optional: log SQL queries for debugging
LOGGING = {
    "version": 1,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "loggers": {
        "django.db.backends": {
            "handlers": ["console"],
            "level": "DEBUG",
        },
    },
}
