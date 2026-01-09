"""Test settings for Edulink project.

This module contains Django settings specifically for running tests.
It inherits from base settings and overrides configurations for testing.
"""

from .base import *
import tempfile
import os

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'test-secret-key-not-for-production'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']

# Database
# Use in-memory SQLite for faster tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'TEST': {
            'NAME': ':memory:',
        },
    }
}

# Cache
# Use dummy cache for tests
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Sessions
# Use database sessions for tests since DummyCache doesn't support sessions
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# Email
# Use locmem backend for testing
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
EMAIL_USE_TLS = False
EMAIL_USE_SSL = False

# Media files
# Use temporary directory for test media files
MEDIA_ROOT = tempfile.mkdtemp()

# Static files
# Use temporary directory for test static files
STATIC_ROOT = tempfile.mkdtemp()

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

# Password validation
# Disable password validation for tests
AUTH_PASSWORD_VALIDATORS = []

# Internationalization
USE_I18N = False
USE_L10N = False
USE_TZ = True

# Logging
# Disable logging during tests
LOGGING_CONFIG = None
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'root': {
        'handlers': ['null'],
    },
    'loggers': {
        'django': {
            'handlers': ['null'],
            'propagate': False,
        },
        'edulink': {
            'handlers': ['null'],
            'propagate': False,
        },
    }
}

# Celery
# Use eager mode for tests
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = 'memory://'
CELERY_RESULT_BACKEND = 'cache+memory://'

# Django REST Framework
REST_FRAMEWORK.update({
    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
})

# JWT Settings for tests
SIMPLE_JWT.update({
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
})

# CORS settings for tests
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# CSRF settings for tests
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False

# Security settings for tests
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_CONTENT_TYPE_NOSNIFF = False
SECURE_BROWSER_XSS_FILTER = False

# Rate limiting - disable for tests
RATE_LIMITING_ENABLED = False

# File upload settings for tests
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024  # 1MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024  # 1MB

# Test-specific settings
TEST_RUNNER = 'django.test.runner.DiscoverRunner'

# Disable debug toolbar in tests
if 'debug_toolbar' in INSTALLED_APPS:
    INSTALLED_APPS.remove('debug_toolbar')

if 'debug_toolbar.middleware.DebugToolbarMiddleware' in MIDDLEWARE:
    MIDDLEWARE.remove('debug_toolbar.middleware.DebugToolbarMiddleware')

# Performance settings for tests
DEBUG_PROPAGATE_EXCEPTIONS = True

# Disable unnecessary middleware for tests
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Test-specific apps
TEST_APPS = [
    'tests',
]

INSTALLED_APPS += TEST_APPS

# Factory Boy settings
FACTORY_BOY_RANDOM_SEED = 42

# Faker settings for consistent test data
FAKER_LOCALE = 'en_US'

# Test fixtures
FIXTURE_DIRS = [
    os.path.join(BASE_DIR, 'fixtures'),
    os.path.join(BASE_DIR, 'tests', 'fixtures'),
]

# API testing settings
API_TEST_CASE_DEFAULT_FORMAT = 'json'

# Notification settings for tests
NOTIFICATIONS_ENABLED = False
EMAIL_NOTIFICATIONS_ENABLED = False

# Search settings for tests
SEARCH_ENABLED = False

# Monitoring settings for tests
MONITORING_ENABLED = False
PERFORMANCE_MONITORING_ENABLED = False
ERROR_TRACKING_ENABLED = False
METRICS_COLLECTION_ENABLED = False

# Security settings for tests
SECURITY_MIDDLEWARE_ENABLED = False
RATE_LIMITING_ENABLED = False
SUSPICIOUS_ACTIVITY_DETECTION_ENABLED = False

# File storage for tests
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# Test data cleanup
CLEANUP_TEST_DATA = True

# Parallel testing
TEST_PARALLEL = True
TEST_PARALLEL_PROCESSES = 4

# Test output
TEST_OUTPUT_VERBOSE = True
TEST_OUTPUT_DIR = os.path.join(BASE_DIR, 'test_output')

# Coverage settings
COVERAGE_REPORT_HTML_OUTPUT_DIR = os.path.join(BASE_DIR, 'htmlcov')
COVERAGE_REPORT_XML_OUTPUT_FILE = os.path.join(BASE_DIR, 'coverage.xml')

# Disable unnecessary features for tests
USE_ETAGS = False
USE_THOUSAND_SEPARATOR = False

# Test-specific time zone
TIME_ZONE = 'UTC'

# Test user settings
TEST_USER_PASSWORD = 'testpass123'
TEST_ADMIN_USERNAME = 'testadmin'
TEST_ADMIN_EMAIL = 'testadmin@example.com'

# API rate limiting for tests
API_RATE_LIMIT_ENABLED = False

# Test environment indicator
TEST_ENVIRONMENT = True

print("Test settings loaded successfully")