from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]  # For local testing

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

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
