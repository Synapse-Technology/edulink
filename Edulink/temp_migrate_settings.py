# Temporary settings file for migrations without security middleware
# This file disables the security middleware that's causing transaction rollbacks

from Edulink.settings.dev import *

# Temporarily disable security middleware that interferes with migrations
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    # "security.middleware.SecurityMiddleware",  # DISABLED for migration
    # "security.middleware.RateLimitMiddleware",  # DISABLED for migration
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    # "security.middleware.SessionSecurityMiddleware",  # DISABLED for migration
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Disable audit logging during migrations
SECURITY_SETTINGS = {
    'MAX_LOGIN_ATTEMPTS': 5,
    'LOGIN_ATTEMPT_TIMEOUT': 300,
    'SESSION_TIMEOUT': 3600,
    'PASSWORD_RESET_TIMEOUT': 3600,
    'BRUTE_FORCE_THRESHOLD': 10,
    'RATE_LIMIT_REQUESTS': 100,
    'RATE_LIMIT_WINDOW': 3600,
    'ENABLE_THREAT_DETECTION': False,  # DISABLED for migration
    'ENABLE_SESSION_SECURITY': False,  # DISABLED for migration
    'ENABLE_AUDIT_LOGGING': False,     # DISABLED for migration
    
    'ANONYMIZE_IP_ADDRESSES': True,
    'MINIMAL_LOGGING': True,
    'DATA_RETENTION_DAYS': 90,
    'GDPR_COMPLIANT': True,
}

print("🔧 Migration settings loaded - Security middleware disabled")