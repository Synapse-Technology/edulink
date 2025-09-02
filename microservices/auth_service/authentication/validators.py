from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
import re

def validate_password_strength(password):
    """
    Validate password strength requirements.
    
    Requirements:
    - At least 8 characters long
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one digit
    - Contains at least one special character
    """
    if len(password) < 8:
        raise ValidationError(
            _("Password must be at least 8 characters long."),
            code='password_too_short'
        )
    
    if not re.search(r'[A-Z]', password):
        raise ValidationError(
            _("Password must contain at least one uppercase letter."),
            code='password_no_upper'
        )
    
    if not re.search(r'[a-z]', password):
        raise ValidationError(
            _("Password must contain at least one lowercase letter."),
            code='password_no_lower'
        )
    
    if not re.search(r'\d', password):
        raise ValidationError(
            _("Password must contain at least one digit."),
            code='password_no_digit'
        )
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValidationError(
            _("Password must contain at least one special character."),
            code='password_no_special'
        )

def validate_email_domain(email):
    """
    Validate email domain for institutional requirements.
    """
    allowed_domains = [
        'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
        'edu', 'ac.ke', 'co.ke', 'or.ke'
    ]
    
    domain = email.split('@')[-1].lower()
    
    # Check if it's an educational domain or allowed domain
    if not any(domain.endswith(allowed) for allowed in allowed_domains):
        raise ValidationError(
            _("Please use a valid email address."),
            code='invalid_email_domain'
        )