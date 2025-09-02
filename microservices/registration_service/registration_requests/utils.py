"""Utility functions for registration requests."""

import secrets
import hashlib
import re
import logging
from typing import Dict, Any, Optional
from urllib.parse import urlparse
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import requests

logger = logging.getLogger(__name__)


def generate_verification_token(length: int = 32) -> str:
    """Generate a secure verification token."""
    return secrets.token_urlsafe(length)


def generate_request_number() -> str:
    """Generate a unique request number."""
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
    random_suffix = secrets.token_hex(4).upper()
    return f"REG-{timestamp}-{random_suffix}"


def validate_email_domain(email: str) -> Dict[str, Any]:
    """Validate email domain and check for common issues."""
    try:
        domain = email.split('@')[1].lower()
        
        # Check for common disposable email domains
        disposable_domains = {
            '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
            'mailinator.com', 'throwaway.email', 'temp-mail.org',
            'yopmail.com', 'maildrop.cc', 'sharklasers.com'
        }
        
        is_disposable = domain in disposable_domains
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'\d{4,}',  # Many consecutive digits
            r'[a-z]{20,}',  # Very long random strings
            r'temp|test|fake|spam',  # Suspicious keywords
        ]
        
        is_suspicious = any(re.search(pattern, domain) for pattern in suspicious_patterns)
        
        # Check domain reputation (simplified)
        reputation_score = check_domain_reputation(domain)
        
        return {
            'domain': domain,
            'is_disposable': is_disposable,
            'is_suspicious': is_suspicious,
            'reputation_score': reputation_score,
            'is_valid': not (is_disposable or is_suspicious) and reputation_score > 0.3
        }
        
    except (IndexError, ValueError):
        return {
            'domain': None,
            'is_disposable': True,
            'is_suspicious': True,
            'reputation_score': 0.0,
            'is_valid': False
        }


def check_domain_reputation(domain: str) -> float:
    """Check domain reputation using various signals."""
    try:
        # Basic checks
        score = 0.5  # Start with neutral score
        
        # Check if domain has MX record (simplified)
        try:
            import dns.resolver
            dns.resolver.resolve(domain, 'MX')
            score += 0.2  # Has MX record
        except (ImportError, Exception):
            pass
        
        # Check domain age (would require external API in real implementation)
        # For now, just check if it's a known good domain
        trusted_domains = {
            'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
            'edu', 'ac.ke', 'co.ke', 'or.ke', 'go.ke'
        }
        
        if any(domain.endswith(trusted) for trusted in trusted_domains):
            score += 0.3
        
        # Check for suspicious TLDs
        suspicious_tlds = {'.tk', '.ml', '.ga', '.cf'}
        if any(domain.endswith(tld) for tld in suspicious_tlds):
            score -= 0.4
        
        return max(0.0, min(1.0, score))
        
    except Exception as e:
        logger.warning(f"Error checking domain reputation for {domain}: {e}")
        return 0.5  # Neutral score on error


def calculate_risk_factors(registration_request) -> Dict[str, float]:
    """Calculate various risk factors for a registration request."""
    from .models import RegistrationRequest, UserRole, InstitutionType
    
    risk_factors = {}
    
    # Email domain risk
    email_validation = validate_email_domain(registration_request.email)
    if email_validation['is_disposable']:
        risk_factors['email_domain'] = 0.9
    elif email_validation['is_suspicious']:
        risk_factors['email_domain'] = 0.7
    else:
        risk_factors['email_domain'] = 1.0 - email_validation['reputation_score']
    
    # Domain reputation risk
    if registration_request.organization_website:
        try:
            domain = urlparse(registration_request.organization_website).netloc
            reputation = check_domain_reputation(domain)
            risk_factors['domain_reputation'] = 1.0 - reputation
        except Exception:
            risk_factors['domain_reputation'] = 0.5
    else:
        risk_factors['domain_reputation'] = 0.3  # Slight risk for no website
    
    # Institution verification risk
    if registration_request.institutional_verified:
        risk_factors['institution_verification'] = 0.1
    elif registration_request.domain_verified:
        risk_factors['institution_verification'] = 0.3
    else:
        risk_factors['institution_verification'] = 0.8
    
    # Role-based risk
    role_risks = {
        UserRole.SUPER_ADMIN: 0.9,  # High risk
        UserRole.ADMIN: 0.7,
        UserRole.TEACHER: 0.3,
        UserRole.STUDENT: 0.2,
        UserRole.PARENT: 0.2,
        UserRole.EMPLOYER: 0.4,
    }
    risk_factors['role_risk'] = role_risks.get(registration_request.role, 0.5)
    
    # Geographic risk (simplified)
    # In a real implementation, this would check IP geolocation
    risk_factors['geographic_risk'] = 0.2  # Low risk for Kenya-based system
    
    # Submission patterns risk
    # Check for rapid submissions from same email domain
    email_domain = registration_request.email.split('@')[1]
    recent_submissions = RegistrationRequest.objects.filter(
        email__endswith=f'@{email_domain}',
        created_at__gte=timezone.now() - timedelta(hours=24)
    ).count()
    
    if recent_submissions > 10:
        risk_factors['submission_patterns'] = 0.9
    elif recent_submissions > 5:
        risk_factors['submission_patterns'] = 0.6
    else:
        risk_factors['submission_patterns'] = 0.2
    
    return risk_factors


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage."""
    # Remove or replace dangerous characters
    filename = re.sub(r'[^\w\s.-]', '', filename)
    # Replace spaces with underscores
    filename = re.sub(r'\s+', '_', filename)
    # Limit length
    if len(filename) > 100:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:95] + ('.' + ext if ext else '')
    
    return filename


def generate_secure_hash(data: str, salt: Optional[str] = None) -> str:
    """Generate a secure hash of the given data."""
    if salt is None:
        salt = secrets.token_hex(16)
    
    hash_input = f"{data}{salt}".encode('utf-8')
    return hashlib.sha256(hash_input).hexdigest()


def validate_kenyan_phone_number(phone: str) -> Dict[str, Any]:
    """Validate Kenyan phone number format."""
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', phone)
    
    # Kenyan phone number patterns
    patterns = [
        r'^254[17]\d{8}$',  # +254 7xx xxx xxx or +254 1xx xxx xxx
        r'^0[17]\d{8}$',   # 07xx xxx xxx or 01xx xxx xxx
        r'^[17]\d{8}$',    # 7xx xxx xxx or 1xx xxx xxx
    ]
    
    is_valid = any(re.match(pattern, digits_only) for pattern in patterns)
    
    # Normalize to international format
    if is_valid:
        if digits_only.startswith('254'):
            normalized = f"+{digits_only}"
        elif digits_only.startswith('0'):
            normalized = f"+254{digits_only[1:]}"
        else:
            normalized = f"+254{digits_only}"
    else:
        normalized = None
    
    return {
        'is_valid': is_valid,
        'normalized': normalized,
        'original': phone
    }


def validate_kenyan_id_number(id_number: str) -> Dict[str, Any]:
    """Validate Kenyan ID number format."""
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', id_number)
    
    # Kenyan ID numbers are typically 7-8 digits
    is_valid = len(digits_only) >= 7 and len(digits_only) <= 8 and digits_only.isdigit()
    
    return {
        'is_valid': is_valid,
        'normalized': digits_only if is_valid else None,
        'original': id_number
    }


def get_client_ip(request) -> str:
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_security_event(event_type: str, details: Dict[str, Any], request=None):
    """Log security-related events."""
    log_data = {
        'event_type': event_type,
        'timestamp': timezone.now().isoformat(),
        'details': details
    }
    
    if request:
        log_data.update({
            'ip_address': get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'referer': request.META.get('HTTP_REFERER', '')
        })
    
    logger.warning(f"Security event: {event_type}", extra=log_data)


def check_rate_limit(identifier: str, limit: int, window_seconds: int) -> Dict[str, Any]:
    """Simple rate limiting check using cache."""
    from django.core.cache import cache
    
    cache_key = f"rate_limit:{identifier}"
    current_count = cache.get(cache_key, 0)
    
    if current_count >= limit:
        return {
            'allowed': False,
            'current_count': current_count,
            'limit': limit,
            'reset_time': cache.ttl(cache_key)
        }
    
    # Increment counter
    cache.set(cache_key, current_count + 1, window_seconds)
    
    return {
        'allowed': True,
        'current_count': current_count + 1,
        'limit': limit,
        'reset_time': window_seconds
    }


def mask_sensitive_data(data: str, mask_char: str = '*', visible_chars: int = 4) -> str:
    """Mask sensitive data for logging."""
    if len(data) <= visible_chars:
        return mask_char * len(data)
    
    return data[:visible_chars] + mask_char * (len(data) - visible_chars)


def validate_website_url(url: str) -> Dict[str, Any]:
    """Validate website URL format and accessibility."""
    try:
        parsed = urlparse(url)
        
        # Basic validation
        if not parsed.scheme or not parsed.netloc:
            return {
                'is_valid': False,
                'error': 'Invalid URL format',
                'normalized': None
            }
        
        # Ensure HTTPS for security
        if parsed.scheme not in ['http', 'https']:
            return {
                'is_valid': False,
                'error': 'Only HTTP/HTTPS URLs are allowed',
                'normalized': None
            }
        
        # Normalize URL
        normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        if parsed.query:
            normalized += f"?{parsed.query}"
        
        return {
            'is_valid': True,
            'normalized': normalized,
            'domain': parsed.netloc,
            'scheme': parsed.scheme
        }
        
    except Exception as e:
        return {
            'is_valid': False,
            'error': str(e),
            'normalized': None
        }


def format_duration(seconds: int) -> str:
    """Format duration in seconds to human-readable string."""
    if seconds < 60:
        return f"{seconds} seconds"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} minutes"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hours"
    else:
        days = seconds // 86400
        return f"{days} days"


def get_file_extension(filename: str) -> str:
    """Get file extension from filename."""
    return filename.split('.')[-1].lower() if '.' in filename else ''


def is_allowed_file_type(filename: str, allowed_extensions: Optional[list] = None) -> bool:
    """Check if file type is allowed."""
    if allowed_extensions is None:
        allowed_extensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif']
    
    extension = get_file_extension(filename)
    return extension in [ext.lower() for ext in allowed_extensions]