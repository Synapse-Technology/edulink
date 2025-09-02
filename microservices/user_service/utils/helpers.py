import hashlib
import secrets
import string
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import requests
import logging
from PIL import Image
from io import BytesIO
import json

logger = logging.getLogger(__name__)


def generate_unique_id(prefix: str = '', length: int = 8) -> str:
    """
    Generate a unique identifier with optional prefix.
    """
    random_part = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))
    return f"{prefix}{random_part}" if prefix else random_part


def generate_token(length: int = 32) -> str:
    """
    Generate a secure random token.
    """
    return secrets.token_urlsafe(length)


def generate_invitation_token() -> str:
    """
    Generate a secure invitation token.
    """
    return secrets.token_urlsafe(32)


def hash_password(password: str, salt: str = None) -> tuple:
    """
    Hash a password with salt.
    Returns (hashed_password, salt)
    """
    if salt is None:
        salt = secrets.token_hex(16)
    
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return hashed.hex(), salt


def verify_password(password: str, hashed_password: str, salt: str) -> bool:
    """
    Verify a password against its hash.
    """
    hashed, _ = hash_password(password, salt)
    return hashed == hashed_password


def generate_cache_key(*args, **kwargs) -> str:
    """
    Generate a cache key from arguments.
    """
    key_parts = [str(arg) for arg in args]
    key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
    key_string = ':'.join(key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()


def cache_result(timeout: int = 300, key_prefix: str = ''):
    """
    Decorator to cache function results.
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}:{generate_cache_key(func.__name__, *args, **kwargs)}"
            result = cache.get(cache_key)
            
            if result is None:
                result = func(*args, **kwargs)
                cache.set(cache_key, result, timeout)
            
            return result
        return wrapper
    return decorator


def clear_cache_pattern(pattern: str):
    """
    Clear cache keys matching a pattern.
    """
    try:
        # This is a simplified version - in production, you might want to use Redis SCAN
        cache.delete_many([key for key in cache._cache.keys() if pattern in key])
    except Exception as e:
        logger.error(f"Failed to clear cache pattern {pattern}: {e}")


def format_phone_number(phone: str, country_code: str = '+1') -> str:
    """
    Format phone number with country code.
    """
    # Remove all non-digit characters
    digits = ''.join(filter(str.isdigit, phone))
    
    # Add country code if not present
    if not digits.startswith(country_code.replace('+', '')):
        digits = country_code.replace('+', '') + digits
    
    return f"+{digits}"


def validate_email_domain(email: str, allowed_domains: List[str] = None) -> bool:
    """
    Validate email domain against allowed domains.
    """
    if not allowed_domains:
        return True
    
    domain = email.split('@')[-1].lower()
    return domain in [d.lower() for d in allowed_domains]


def generate_username_suggestions(first_name: str, last_name: str, count: int = 5) -> List[str]:
    """
    Generate username suggestions based on name.
    """
    base_username = f"{first_name.lower()}.{last_name.lower()}"
    suggestions = [base_username]
    
    # Add variations
    suggestions.append(f"{first_name.lower()}{last_name.lower()}")
    suggestions.append(f"{first_name[0].lower()}{last_name.lower()}")
    suggestions.append(f"{first_name.lower()}{last_name[0].lower()}")
    
    # Add numbered variations
    for i in range(1, count):
        suggestions.append(f"{base_username}{i}")
    
    return suggestions[:count]


def calculate_age(birth_date: datetime.date) -> int:
    """
    Calculate age from birth date.
    """
    today = timezone.now().date()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


def calculate_gpa(grades: List[Dict[str, Any]]) -> float:
    """
    Calculate GPA from list of grades.
    Expected format: [{'grade': 'A', 'credits': 3}, ...]
    """
    grade_points = {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'D-': 0.7,
        'F': 0.0
    }
    
    total_points = 0
    total_credits = 0
    
    for grade_info in grades:
        grade = grade_info.get('grade', '').upper()
        credits = grade_info.get('credits', 0)
        
        if grade in grade_points:
            total_points += grade_points[grade] * credits
            total_credits += credits
    
    return round(total_points / total_credits, 2) if total_credits > 0 else 0.0


def resize_image(image_file, max_width: int = 800, max_height: int = 600, quality: int = 85) -> BytesIO:
    """
    Resize image while maintaining aspect ratio.
    """
    image = Image.open(image_file)
    
    # Convert to RGB if necessary
    if image.mode in ('RGBA', 'LA', 'P'):
        image = image.convert('RGB')
    
    # Calculate new dimensions
    width, height = image.size
    ratio = min(max_width / width, max_height / height)
    
    if ratio < 1:
        new_width = int(width * ratio)
        new_height = int(height * ratio)
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Save to BytesIO
    output = BytesIO()
    image.save(output, format='JPEG', quality=quality, optimize=True)
    output.seek(0)
    
    return output


def create_thumbnail(image_file, size: tuple = (150, 150)) -> BytesIO:
    """
    Create a thumbnail from an image.
    """
    image = Image.open(image_file)
    
    # Convert to RGB if necessary
    if image.mode in ('RGBA', 'LA', 'P'):
        image = image.convert('RGB')
    
    # Create thumbnail
    image.thumbnail(size, Image.Resampling.LANCZOS)
    
    # Save to BytesIO
    output = BytesIO()
    image.save(output, format='JPEG', quality=90, optimize=True)
    output.seek(0)
    
    return output


def send_notification_email(to_email: str, subject: str, template_name: str, context: Dict[str, Any]):
    """
    Send notification email using template.
    """
    try:
        html_message = render_to_string(template_name, context)
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            html_message=html_message,
            fail_silently=False
        )
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def make_service_request(service_url: str, method: str = 'GET', data: Dict = None, 
                        headers: Dict = None, timeout: int = 30) -> Optional[Dict]:
    """
    Make HTTP request to another service.
    """
    try:
        default_headers = {
            'Content-Type': 'application/json',
            'X-Service-Token': getattr(settings, 'SERVICE_SECRET_KEY', ''),
            'User-Agent': f"UserService/{getattr(settings, 'SERVICE_VERSION', '1.0')}"
        }
        
        if headers:
            default_headers.update(headers)
        
        response = requests.request(
            method=method.upper(),
            url=service_url,
            json=data,
            headers=default_headers,
            timeout=timeout
        )
        
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Service request failed to {service_url}: {e}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Failed to decode JSON response from {service_url}: {e}")
        return None


def notify_service(service_name: str, event_type: str, data: Dict[str, Any]) -> bool:
    """
    Notify another service about an event.
    """
    service_urls = {
        'auth': getattr(settings, 'AUTH_SERVICE_URL', ''),
        'institution': getattr(settings, 'INSTITUTION_SERVICE_URL', ''),
        'internship': getattr(settings, 'INTERNSHIP_SERVICE_URL', ''),
        'notification': getattr(settings, 'NOTIFICATION_SERVICE_URL', '')
    }
    
    service_url = service_urls.get(service_name)
    if not service_url:
        logger.warning(f"No URL configured for service: {service_name}")
        return False
    
    notification_data = {
        'event_type': event_type,
        'timestamp': timezone.now().isoformat(),
        'source_service': 'user_service',
        'data': data
    }
    
    endpoint = f"{service_url.rstrip('/')}/api/webhooks/user-service/"
    result = make_service_request(endpoint, method='POST', data=notification_data)
    
    return result is not None


def paginate_queryset(queryset, page: int = 1, page_size: int = 20):
    """
    Paginate a queryset.
    """
    from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
    
    paginator = Paginator(queryset, page_size)
    
    try:
        page_obj = paginator.page(page)
    except PageNotAnInteger:
        page_obj = paginator.page(1)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages)
    
    return {
        'results': list(page_obj),
        'pagination': {
            'current_page': page_obj.number,
            'total_pages': paginator.num_pages,
            'total_items': paginator.count,
            'page_size': page_size,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'next_page': page_obj.next_page_number() if page_obj.has_next() else None,
            'previous_page': page_obj.previous_page_number() if page_obj.has_previous() else None
        }
    }


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename for safe storage.
    """
    # Remove or replace unsafe characters
    unsafe_chars = '<>:"/\\|?*'
    for char in unsafe_chars:
        filename = filename.replace(char, '_')
    
    # Limit length
    name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
    if len(name) > 100:
        name = name[:100]
    
    return f"{name}.{ext}" if ext else name


def generate_file_path(instance, filename: str, folder: str = 'uploads') -> str:
    """
    Generate file upload path.
    """
    # Get file extension
    ext = filename.split('.')[-1].lower()
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    
    # Create path with date structure
    date_path = timezone.now().strftime('%Y/%m/%d')
    
    return f"{folder}/{date_path}/{unique_filename}"


def format_duration(start_date: datetime.date, end_date: datetime.date = None) -> str:
    """
    Format duration between two dates.
    """
    if end_date is None:
        end_date = timezone.now().date()
    
    delta = end_date - start_date
    years = delta.days // 365
    months = (delta.days % 365) // 30
    
    if years > 0:
        if months > 0:
            return f"{years} year{'s' if years > 1 else ''} {months} month{'s' if months > 1 else ''}"
        else:
            return f"{years} year{'s' if years > 1 else ''}"
    elif months > 0:
        return f"{months} month{'s' if months > 1 else ''}"
    else:
        return f"{delta.days} day{'s' if delta.days > 1 else ''}"


def get_client_ip(request) -> str:
    """
    Get client IP address from request.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def is_valid_uuid(uuid_string: str) -> bool:
    """
    Check if string is a valid UUID.
    """
    try:
        uuid.UUID(uuid_string)
        return True
    except ValueError:
        return False


def mask_sensitive_data(data: str, mask_char: str = '*', visible_chars: int = 4) -> str:
    """
    Mask sensitive data like email or phone numbers.
    """
    if len(data) <= visible_chars:
        return mask_char * len(data)
    
    if '@' in data:  # Email
        username, domain = data.split('@')
        masked_username = username[:2] + mask_char * (len(username) - 2)
        return f"{masked_username}@{domain}"
    else:  # Phone or other
        return data[:visible_chars] + mask_char * (len(data) - visible_chars)


def convert_to_timezone(dt: datetime, target_timezone: str = 'UTC') -> datetime:
    """
    Convert datetime to target timezone.
    """
    import pytz
    
    if dt.tzinfo is None:
        dt = timezone.make_aware(dt)
    
    target_tz = pytz.timezone(target_timezone)
    return dt.astimezone(target_tz)


def get_academic_year(date: datetime.date = None, start_month: int = 9) -> str:
    """
    Get academic year string based on date and start month.
    """
    if date is None:
        date = timezone.now().date()
    
    if date.month >= start_month:
        return f"{date.year}-{date.year + 1}"
    else:
        return f"{date.year - 1}-{date.year}"


def calculate_semester(date: datetime.date = None, start_month: int = 9) -> str:
    """
    Calculate current semester based on date.
    """
    if date is None:
        date = timezone.now().date()
    
    month = date.month
    
    if start_month <= month <= start_month + 3:
        return 'Fall'
    elif start_month + 4 <= month <= start_month + 7:
        return 'Spring'
    else:
        return 'Summer'


def health_check() -> Dict[str, Any]:
    """
    Perform health check for the service.
    """
    health_status = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'service': 'user_service',
        'version': getattr(settings, 'SERVICE_VERSION', '1.0'),
        'checks': {}
    }
    
    # Database check
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        health_status['checks']['database'] = 'healthy'
    except Exception as e:
        health_status['checks']['database'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
    
    # Cache check
    try:
        cache.set('health_check', 'ok', 10)
        cache.get('health_check')
        health_status['checks']['cache'] = 'healthy'
    except Exception as e:
        health_status['checks']['cache'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
    
    return health_status


def validate_file_size(file, max_size_mb=5):
    """
    Validate file size.
    """
    if file.size > max_size_mb * 1024 * 1024:
        from django.core.exceptions import ValidationError
        raise ValidationError(f'File size cannot exceed {max_size_mb}MB')


def validate_file_type(file, allowed_types=None):
    """
    Validate file type.
    """
    if allowed_types is None:
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    
    if file.content_type not in allowed_types:
        from django.core.exceptions import ValidationError
        raise ValidationError(f'File type {file.content_type} is not allowed')


def calculate_profile_completion(profile):
    """
    Calculate profile completion percentage.
    """
    total_fields = 0
    completed_fields = 0
    
    # Basic fields
    fields_to_check = [
        'first_name', 'last_name', 'email', 'phone_number',
        'bio', 'skills', 'experience_level'
    ]
    
    for field in fields_to_check:
        total_fields += 1
        if hasattr(profile, field) and getattr(profile, field):
            completed_fields += 1
    
    # Optional fields
    optional_fields = ['profile_picture', 'resume', 'portfolio_url']
    for field in optional_fields:
        total_fields += 1
        if hasattr(profile, field) and getattr(profile, field):
            completed_fields += 1
    
    return int((completed_fields / total_fields) * 100) if total_fields > 0 else 0