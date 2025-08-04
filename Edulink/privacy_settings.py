# Privacy and Data Protection Settings for Edulink
# Compliant with GDPR, CCPA, and other data protection regulations

from datetime import timedelta

# Data Retention Policies
DATA_RETENTION = {
    # Security logs retention (minimum required for security, maximum for compliance)
    'SECURITY_EVENTS': timedelta(days=90),  # 3 months for security incidents
    'AUDIT_LOGS': timedelta(days=365),      # 1 year for audit compliance
    'FAILED_LOGIN_ATTEMPTS': timedelta(days=30),  # 30 days for brute force detection
    'USER_SESSIONS': timedelta(days=30),    # 30 days for session management
    
    # User data retention
    'INACTIVE_USER_DATA': timedelta(days=1095),  # 3 years for inactive accounts
    'DELETED_USER_DATA': timedelta(days=30),     # 30 days grace period before permanent deletion
}

# Privacy Settings
PRIVACY_SETTINGS = {
    # Data minimization - only collect what's necessary
    'COLLECT_IP_ADDRESSES': True,           # Required for security
    'COLLECT_USER_AGENT': True,             # Required for security
    'COLLECT_GEOLOCATION': False,           # Not necessary for core functionality
    'COLLECT_DEVICE_FINGERPRINT': False,    # Not necessary, privacy invasive
    
    # Anonymization settings
    'ANONYMIZE_IP_ADDRESSES': True,         # Mask last octet of IP addresses
    'ANONYMIZE_OLD_LOGS': True,             # Anonymize logs older than retention period
    
    # User consent and rights
    'REQUIRE_EXPLICIT_CONSENT': True,       # Explicit consent for data processing
    'ENABLE_DATA_EXPORT': True,             # Right to data portability
    'ENABLE_DATA_DELETION': True,           # Right to be forgotten
    'ENABLE_DATA_CORRECTION': True,         # Right to rectification
    
    # Transparency
    'LOG_DATA_ACCESS': True,                # Log when user data is accessed
    'NOTIFY_DATA_BREACH': True,             # Notify users of data breaches
    'PROVIDE_PRIVACY_DASHBOARD': True,      # User privacy control dashboard
}

# Security vs Privacy Balance
SECURITY_PRIVACY_BALANCE = {
    # What we collect for security (justified and proportionate)
    'SECURITY_JUSTIFIED_DATA': [
        'login_attempts',           # Prevent brute force attacks
        'session_management',       # Prevent session hijacking
        'ip_addresses',            # Detect suspicious activity
        'user_agents',             # Detect automated attacks
        'failed_authentications',  # Security monitoring
        'access_patterns',         # Anomaly detection
    ],
    
    # What we DON'T collect (privacy-first approach)
    'PRIVACY_PROTECTED_DATA': [
        'precise_geolocation',     # Only country/region if needed
        'device_fingerprinting',   # Too invasive
        'browsing_history',        # Not relevant to platform
        'personal_communications', # Private by default
        'biometric_data',          # Not necessary
        'detailed_device_info',    # Basic info only
    ],
}

# Data Processing Purposes (GDPR Article 6 lawful bases)
DATA_PROCESSING_PURPOSES = {
    'LEGITIMATE_INTEREST': [
        'fraud_prevention',
        'security_monitoring',
        'system_optimization',
        'analytics_aggregated',
    ],
    'CONTRACT_PERFORMANCE': [
        'user_authentication',
        'service_delivery',
        'account_management',
        'communication',
    ],
    'LEGAL_OBLIGATION': [
        'audit_logging',
        'security_incident_response',
        'regulatory_compliance',
    ],
    'CONSENT': [
        'marketing_communications',
        'optional_analytics',
        'third_party_integrations',
    ],
}

# Data Subject Rights Implementation
DATA_SUBJECT_RIGHTS = {
    'RIGHT_TO_ACCESS': {
        'enabled': True,
        'response_time_days': 30,
        'format': 'JSON',  # Machine-readable format
    },
    'RIGHT_TO_RECTIFICATION': {
        'enabled': True,
        'self_service': True,  # Users can update their own data
    },
    'RIGHT_TO_ERASURE': {
        'enabled': True,
        'grace_period_days': 30,  # Time to recover accidentally deleted accounts
        'exceptions': ['legal_obligations', 'security_incidents'],
    },
    'RIGHT_TO_PORTABILITY': {
        'enabled': True,
        'formats': ['JSON', 'CSV'],
    },
    'RIGHT_TO_OBJECT': {
        'enabled': True,
        'processing_types': ['marketing', 'profiling'],
    },
}

# Privacy by Design Principles
PRIVACY_BY_DESIGN = {
    'DATA_MINIMIZATION': True,      # Collect only what's necessary
    'PURPOSE_LIMITATION': True,     # Use data only for stated purposes
    'STORAGE_LIMITATION': True,     # Delete data when no longer needed
    'ACCURACY': True,               # Keep data accurate and up-to-date
    'SECURITY': True,               # Protect data with appropriate security
    'TRANSPARENCY': True,           # Be clear about data processing
    'ACCOUNTABILITY': True,         # Document compliance measures
}

# Cookie and Tracking Policy
COOKIE_POLICY = {
    'ESSENTIAL_COOKIES_ONLY': True,     # Only use necessary cookies
    'NO_TRACKING_COOKIES': True,        # No advertising/tracking cookies
    'SESSION_COOKIES_ONLY': True,       # Prefer session over persistent cookies
    'SECURE_COOKIES': True,             # Use secure cookie flags
    'SAMESITE_STRICT': True,            # Prevent CSRF attacks
}

# Third-Party Data Sharing
THIRD_PARTY_SHARING = {
    'ENABLED': False,                   # No data sharing by default
    'REQUIRE_EXPLICIT_CONSENT': True,   # Explicit consent for any sharing
    'APPROVED_PROCESSORS': [],          # List of approved data processors
    'DATA_PROCESSING_AGREEMENTS': True, # Require DPAs with processors
}

# Breach Notification
BREACH_NOTIFICATION = {
    'AUTHORITY_NOTIFICATION_HOURS': 72,  # Notify authorities within 72 hours
    'USER_NOTIFICATION_HOURS': 72,       # Notify users without undue delay
    'HIGH_RISK_IMMEDIATE': True,         # Immediate notification for high-risk breaches
    'DOCUMENTATION_REQUIRED': True,      # Document all breaches
}

# Regular Privacy Audits
PRIVACY_AUDITS = {
    'QUARTERLY_REVIEWS': True,           # Review privacy practices quarterly
    'ANNUAL_ASSESSMENTS': True,          # Comprehensive annual assessment
    'IMPACT_ASSESSMENTS': True,          # DPIA for high-risk processing
    'EXTERNAL_AUDITS': False,            # Consider external audits for compliance
}

# User Education and Transparency
USER_TRANSPARENCY = {
    'CLEAR_PRIVACY_POLICY': True,        # Plain language privacy policy
    'DATA_USAGE_DASHBOARD': True,        # Show users how their data is used
    'REGULAR_UPDATES': True,             # Keep users informed of changes
    'PRIVACY_CONTROLS': True,            # Give users control over their data
}