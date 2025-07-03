from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]  # For local testing

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'noreply@edulink.com'

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

REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'Edulink.utils.custom_exception_handler',
    'DEFAULT_AUTHENTICATION_CLASSES': (
          'rest_framework_simplejwt.authentication.JWTAuthentication',
      )
}
