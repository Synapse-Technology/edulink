"""
Development settings for Edulink project.
"""
from .base import *

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "*"]

# Email backend for development - use SMTP for actual email sending
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

# Logging
LOGGING["root"]["level"] = "DEBUG"

# CORS
CORS_ALLOW_ALL_ORIGINS = True

# Static files
STATICFILES_DIRS = [BASE_DIR / "static"]

# Media files
MEDIA_ROOT = BASE_DIR / "media"

# Frontend URL for email verification links
FRONTEND_URL = "http://localhost:5173"