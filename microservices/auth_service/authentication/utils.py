from django.http import HttpRequest
from django.core.cache import cache
from django.conf import settings
import hashlib
import time
from typing import Optional

def get_client_ip(request: HttpRequest) -> str:
    """
    Get the client's IP address from the request.
    
    Args:
        request: Django HttpRequest object
        
    Returns:
        str: Client IP address
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip

def generate_cache_key(prefix: str, *args) -> str:
    """
    Generate a cache key with the given prefix and arguments.
    
    Args:
        prefix: Cache key prefix
        *args: Additional arguments to include in the key
        
    Returns:
        str: Generated cache key
    """
    key_parts = [str(arg) for arg in args]
    key_string = ':'.join([prefix] + key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()

def rate_limit_key(ip: str, action: str) -> str:
    """
    Generate a rate limiting cache key.
    
    Args:
        ip: Client IP address
        action: Action being rate limited
        
    Returns:
        str: Rate limit cache key
    """
    return f"rate_limit:{action}:{ip}"

def check_rate_limit(ip: str, action: str, limit: int = 5, window: int = 300) -> bool:
    """
    Check if the client has exceeded the rate limit.
    
    Args:
        ip: Client IP address
        action: Action being rate limited
        limit: Maximum number of attempts
        window: Time window in seconds
        
    Returns:
        bool: True if rate limit exceeded, False otherwise
    """
    key = rate_limit_key(ip, action)
    current_attempts = cache.get(key, 0)
    
    if current_attempts >= limit:
        return True
    
    # Increment the counter
    cache.set(key, current_attempts + 1, window)
    return False

def clear_rate_limit(ip: str, action: str) -> None:
    """
    Clear the rate limit for a specific IP and action.
    
    Args:
        ip: Client IP address
        action: Action to clear rate limit for
    """
    key = rate_limit_key(ip, action)
    cache.delete(key)

def sanitize_user_input(input_string: str) -> str:
    """
    Sanitize user input by removing potentially harmful characters.
    
    Args:
        input_string: Raw user input
        
    Returns:
        str: Sanitized input
    """
    if not input_string:
        return ''
    
    # Remove null bytes and control characters
    sanitized = ''.join(char for char in input_string if ord(char) >= 32 or char in '\t\n\r')
    
    # Limit length
    return sanitized[:1000]

def format_user_agent(request: HttpRequest) -> str:
    """
    Extract and format user agent information.
    
    Args:
        request: Django HttpRequest object
        
    Returns:
        str: Formatted user agent string
    """
    user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
    return sanitize_user_input(user_agent)[:200]