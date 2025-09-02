"""Testing settings for registration service."""

from .base import *
import tempfile

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']

# Use in-memory SQLite for faster tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'OPTIONS': {
            'timeout': 20,
        },
    }
}

# Use local memory cache for testing
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-cache',
    }
}

# Use console email backend for testing
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Disable migrations for faster tests
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Password hashers for faster tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Disable logging during tests
LOGGING_CONFIG = None
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'CRITICAL',
    },
}

# Celery configuration for testing
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = 'memory://'
CELERY_RESULT_BACKEND = 'cache+memory://'

# Disable rate limiting during tests
RATELIMIT_ENABLE = False

# Disable security features for testing
AXES_ENABLED = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False

# CORS settings for testing
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Media files for testing
MEDIA_ROOT = tempfile.mkdtemp()

# Static files for testing
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Channels configuration for testing
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# Testing-specific registration settings
REGISTRATION_SETTINGS.update({
    'EMAIL_VERIFICATION_EXPIRY_HOURS': 1,
    'REQUEST_EXPIRY_DAYS': 1,
    'ADMIN_REVIEW_TIMEOUT_DAYS': 1,
    'REMINDER_DAYS_BEFORE_EXPIRY': 1,
    'MAX_ATTACHMENTS_PER_REQUEST': 2,
    'MAX_ATTACHMENT_SIZE_MB': 1,
    'AUTO_APPROVAL': {
        'ENABLED': False,  # Disable for predictable testing
        'MAX_RISK_SCORE': 10,
        'REQUIRED_VERIFICATIONS': ['email'],
        'EXCLUDED_ROLES': ['super_admin'],
    },
    'RISK_ASSESSMENT': {
        'LOW_THRESHOLD': 20,
        'MEDIUM_THRESHOLD': 40,
        'HIGH_THRESHOLD': 60,
        'FACTORS': {
            'SUSPICIOUS_EMAIL_DOMAIN': 10,
            'NEW_DOMAIN': 5,
            'SUSPICIOUS_WEBSITE': 10,
            'UNKNOWN_INSTITUTION': 15,
            'HIGH_RISK_ROLE': 10,
            'MULTIPLE_REQUESTS_SAME_IP': 5,
            'SUSPICIOUS_LOCATION': 5,
        }
    }
})

# Kenya API settings for testing (use mock endpoints)
KENYA_SETTINGS.update({
    'CUE_API_URL': 'http://mock-cue-api.test',
    'CUE_API_KEY': 'test-key',
    'TVETA_API_URL': 'http://mock-tveta-api.test',
    'TVETA_API_KEY': 'test-key',
})

# Test-specific apps
INSTALLED_APPS += [
    'django_nose',
]

# Use nose test runner for better test discovery
TEST_RUNNER = 'django_nose.NoseTestSuiteRunner'

# Nose test configuration
NOSE_ARGS = [
    '--with-coverage',
    '--cover-package=registration_requests',
    '--cover-html',
    '--cover-html-dir=htmlcov',
    '--cover-erase',
    '--nocapture',
    '--nologcapture',
    '--verbosity=2',
]

# Secret key for testing
SECRET_KEY = 'test-secret-key-not-for-production'

# Disable whitenoise for testing
if 'whitenoise.middleware.WhiteNoiseMiddleware' in MIDDLEWARE:
    MIDDLEWARE.remove('whitenoise.middleware.WhiteNoiseMiddleware')

# Disable debug toolbar for testing
if 'debug_toolbar' in INSTALLED_APPS:
    INSTALLED_APPS.remove('debug_toolbar')

if 'debug_toolbar.middleware.DebugToolbarMiddleware' in MIDDLEWARE:
    MIDDLEWARE.remove('debug_toolbar.middleware.DebugToolbarMiddleware')

# Disable prometheus for testing
if 'django_prometheus' in INSTALLED_APPS:
    INSTALLED_APPS.remove('django_prometheus')

# Remove prometheus middleware
MIDDLEWARE = [m for m in MIDDLEWARE if 'prometheus' not in m.lower()]

# Test database settings
DATABASES['default']['TEST'] = {
    'NAME': ':memory:',
    'CHARSET': 'utf8',
}

# Fixture directories
FIXTURE_DIRS = [
    BASE_DIR / 'fixtures',
    BASE_DIR / 'registration_requests' / 'fixtures',
]

# Factory Boy settings
FACTORY_FOR_DJANGO_MODELS = True

# Mock external services during testing
MOCK_EXTERNAL_SERVICES = True

# Test data settings
TEST_DATA = {
    'SAMPLE_INSTITUTIONS': [
        'Test University',
        'Mock College',
        'Sample Institute',
    ],
    'SAMPLE_DOMAINS': [
        'test.edu',
        'mock.ac.ke',
        'sample.co.ke',
    ],
    'SAMPLE_USERS': {
        'admin': {
            'email': 'admin@test.com',
            'password': 'testpass123',
            'role': 'super_admin',
        },
        'reviewer': {
            'email': 'reviewer@test.com',
            'password': 'testpass123',
            'role': 'admin',
        },
        'user': {
            'email': 'user@test.com',
            'password': 'testpass123',
            'role': 'student',
        },
    }
}

# Performance testing settings
PERFORMANCE_TESTING = {
    'ENABLED': False,
    'MAX_RESPONSE_TIME_MS': 1000,
    'MAX_QUERY_COUNT': 10,
    'PROFILE_SLOW_QUERIES': True,
}