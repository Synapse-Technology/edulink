"""
Utility functions for employer app.
"""

import secrets
from typing import Optional

from .models import EmployerRequest


def generate_tracking_code() -> str:
    """
    Generate a human-friendly tracking code for employer requests.
    
    Format: EMP-XXXXXX (6 random characters)
    Uses uppercase letters and numbers, excluding confusing characters (O, 0, I, 1, L)
    
    Returns:
        str: Generated tracking code
        
    Raises:
        RuntimeError: If unable to generate a unique code after multiple attempts
    """
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    max_attempts = 10
    
    for attempt in range(max_attempts):
        # Generate 6 random characters
        code_part = "".join(secrets.choice(alphabet) for _ in range(6))
        tracking_code = f"EMP-{code_part}"
        
        # Check for uniqueness
        if not EmployerRequest.objects.filter(tracking_code=tracking_code).exists():
            return tracking_code
    
    # If we can't generate a unique code after max_attempts, something is wrong
    raise RuntimeError(f"Unable to generate unique tracking code after {max_attempts} attempts")


def get_employer_request_by_tracking_code(tracking_code: str) -> Optional[EmployerRequest]:
    """
    Get employer request by tracking code.
    
    Args:
        tracking_code: The tracking code to look up
        
    Returns:
        EmployerRequest: The employer request if found, None otherwise
    """
    try:
        return EmployerRequest.objects.get(tracking_code=tracking_code.upper())
    except EmployerRequest.DoesNotExist:
        return None
