import re
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from datetime import datetime, timedelta
import magic
from PIL import Image
from io import BytesIO


def validate_phone_number(value):
    """
    Validate phone number format.
    Accepts formats: +1234567890, +1-234-567-8901, +1 (234) 567-8901
    """
    phone_regex = re.compile(
        r'^\+?1?\d{9,15}$|^\+?[1-9]\d{1,14}$|^\+?\d[\s\-\(\)\d]{7,20}\d$'
    )
    
    # Remove spaces, dashes, and parentheses for validation
    cleaned_value = re.sub(r'[\s\-\(\)]', '', value)
    
    if not phone_regex.match(cleaned_value):
        raise ValidationError(
            _('Enter a valid phone number.'),
            code='invalid_phone'
        )


def validate_student_id(value):
    """
    Validate student ID format.
    Should be alphanumeric and between 6-20 characters.
    """
    if not re.match(r'^[A-Za-z0-9]{6,20}$', value):
        raise ValidationError(
            _('Student ID must be 6-20 alphanumeric characters.'),
            code='invalid_student_id'
        )


def validate_institution_code(value):
    """
    Validate institution code format.
    Should be uppercase letters and numbers, 2-10 characters.
    """
    if not re.match(r'^[A-Z0-9]{2,10}$', value):
        raise ValidationError(
            _('Institution code must be 2-10 uppercase letters and numbers.'),
            code='invalid_institution_code'
        )


def validate_department_code(value):
    """
    Validate department code format.
    Should be uppercase letters, 2-6 characters.
    """
    if not re.match(r'^[A-Z]{2,6}$', value):
        raise ValidationError(
            _('Department code must be 2-6 uppercase letters.'),
            code='invalid_department_code'
        )


def validate_program_code(value):
    """
    Validate program code format.
    Should be uppercase letters and numbers, 2-10 characters.
    """
    if not re.match(r'^[A-Z0-9]{2,10}$', value):
        raise ValidationError(
            _('Program code must be 2-10 uppercase letters and numbers.'),
            code='invalid_program_code'
        )


def validate_gpa(value):
    """
    Validate GPA value.
    Should be between 0.0 and 4.0.
    """
    if not (0.0 <= value <= 4.0):
        raise ValidationError(
            _('GPA must be between 0.0 and 4.0.'),
            code='invalid_gpa'
        )


def validate_graduation_year(value):
    """
    Validate graduation year.
    Should be between current year and current year + 10.
    """
    current_year = timezone.now().year
    if not (current_year <= value <= current_year + 10):
        raise ValidationError(
            _('Graduation year must be between %(current)s and %(max)s.') % {
                'current': current_year,
                'max': current_year + 10
            },
            code='invalid_graduation_year'
        )


def validate_established_year(value):
    """
    Validate institution established year.
    Should be between 1800 and current year.
    """
    current_year = timezone.now().year
    if not (1800 <= value <= current_year):
        raise ValidationError(
            _('Established year must be between 1800 and %(current)s.') % {
                'current': current_year
            },
            code='invalid_established_year'
        )


def validate_future_date(value):
    """
    Validate that date is in the future.
    """
    if value <= timezone.now().date():
        raise ValidationError(
            _('Date must be in the future.'),
            code='invalid_future_date'
        )


def validate_future_datetime(value):
    """
    Validate that datetime is in the future.
    """
    if value <= timezone.now():
        raise ValidationError(
            _('Date and time must be in the future.'),
            code='invalid_future_datetime'
        )


def validate_age_range(value, min_age=16, max_age=100):
    """
    Validate age based on birth date.
    """
    today = timezone.now().date()
    age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
    
    if not (min_age <= age <= max_age):
        raise ValidationError(
            _('Age must be between %(min)s and %(max)s years.') % {
                'min': min_age,
                'max': max_age
            },
            code='invalid_age'
        )


def validate_image_file(value):
    """
    Validate uploaded image file.
    """
    # Check file size (max 5MB)
    if value.size > 5 * 1024 * 1024:
        raise ValidationError(
            _('Image file size cannot exceed 5MB.'),
            code='file_too_large'
        )
    
    # Check file type using python-magic
    try:
        file_type = magic.from_buffer(value.read(1024), mime=True)
        value.seek(0)  # Reset file pointer
        
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file_type not in allowed_types:
            raise ValidationError(
                _('Only JPEG, PNG, GIF, and WebP images are allowed.'),
                code='invalid_file_type'
            )
    except Exception:
        raise ValidationError(
            _('Unable to verify file type.'),
            code='file_verification_error'
        )
    
    # Validate image using PIL
    try:
        image = Image.open(value)
        image.verify()
        value.seek(0)  # Reset file pointer
        
        # Check image dimensions (max 4000x4000)
        if image.width > 4000 or image.height > 4000:
            raise ValidationError(
                _('Image dimensions cannot exceed 4000x4000 pixels.'),
                code='image_too_large'
            )
        
        # Check minimum dimensions (min 100x100)
        if image.width < 100 or image.height < 100:
            raise ValidationError(
                _('Image dimensions must be at least 100x100 pixels.'),
                code='image_too_small'
            )
            
    except Exception as e:
        raise ValidationError(
            _('Invalid image file.'),
            code='invalid_image'
        )


def validate_document_file(value):
    """
    Validate uploaded document file.
    """
    # Check file size (max 10MB)
    if value.size > 10 * 1024 * 1024:
        raise ValidationError(
            _('Document file size cannot exceed 10MB.'),
            code='file_too_large'
        )
    
    # Check file type
    try:
        file_type = magic.from_buffer(value.read(1024), mime=True)
        value.seek(0)  # Reset file pointer
        
        allowed_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ]
        
        if file_type not in allowed_types:
            raise ValidationError(
                _('Only PDF, DOC, DOCX, and TXT files are allowed.'),
                code='invalid_file_type'
            )
    except Exception:
        raise ValidationError(
            _('Unable to verify file type.'),
            code='file_verification_error'
        )


def validate_linkedin_url(value):
    """
    Validate LinkedIn profile URL.
    """
    linkedin_regex = re.compile(
        r'^https?://(www\.)?linkedin\.com/in/[a-zA-Z0-9\-]+/?$'
    )
    
    if not linkedin_regex.match(value):
        raise ValidationError(
            _('Enter a valid LinkedIn profile URL.'),
            code='invalid_linkedin_url'
        )


def validate_github_url(value):
    """
    Validate GitHub profile URL.
    """
    github_regex = re.compile(
        r'^https?://(www\.)?github\.com/[a-zA-Z0-9\-]+/?$'
    )
    
    if not github_regex.match(value):
        raise ValidationError(
            _('Enter a valid GitHub profile URL.'),
            code='invalid_github_url'
        )


def validate_website_url(value):
    """
    Validate website URL.
    """
    url_regex = re.compile(
        r'^https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?$'
    )
    
    if not url_regex.match(value):
        raise ValidationError(
            _('Enter a valid website URL.'),
            code='invalid_website_url'
        )


def validate_postal_code(value, country='US'):
    """
    Validate postal code based on country.
    """
    patterns = {
        'US': r'^\d{5}(-\d{4})?$',
        'CA': r'^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$',
        'UK': r'^[A-Za-z]{1,2}\d[A-Za-z\d]? \d[A-Za-z]{2}$',
        'DE': r'^\d{5}$',
        'FR': r'^\d{5}$',
    }
    
    pattern = patterns.get(country, r'^[A-Za-z0-9\s\-]{3,10}$')  # Generic pattern
    
    if not re.match(pattern, value):
        raise ValidationError(
            _('Enter a valid postal code for %(country)s.') % {'country': country},
            code='invalid_postal_code'
        )


def validate_company_size(value):
    """
    Validate company size range.
    """
    valid_sizes = [
        '1-10', '11-50', '51-200', '201-500', 
        '501-1000', '1001-5000', '5001-10000', '10000+'
    ]
    
    if value not in valid_sizes:
        raise ValidationError(
            _('Select a valid company size range.'),
            code='invalid_company_size'
        )


def validate_industry(value):
    """
    Validate industry selection.
    """
    valid_industries = [
        'TECHNOLOGY', 'HEALTHCARE', 'FINANCE', 'EDUCATION', 'MANUFACTURING',
        'RETAIL', 'CONSULTING', 'MEDIA', 'GOVERNMENT', 'NON_PROFIT',
        'AUTOMOTIVE', 'AEROSPACE', 'ENERGY', 'REAL_ESTATE', 'HOSPITALITY',
        'TRANSPORTATION', 'AGRICULTURE', 'CONSTRUCTION', 'TELECOMMUNICATIONS',
        'ENTERTAINMENT', 'LEGAL', 'INSURANCE', 'PHARMACEUTICALS', 'OTHER'
    ]
    
    if value not in valid_industries:
        raise ValidationError(
            _('Select a valid industry.'),
            code='invalid_industry'
        )


def validate_skill_level(value):
    """
    Validate skill proficiency level.
    """
    valid_levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']
    
    if value not in valid_levels:
        raise ValidationError(
            _('Select a valid skill level.'),
            code='invalid_skill_level'
        )


def validate_language_proficiency(value):
    """
    Validate language proficiency level.
    """
    valid_levels = ['BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE']
    
    if value not in valid_levels:
        raise ValidationError(
            _('Select a valid language proficiency level.'),
            code='invalid_language_proficiency'
        )


def validate_duration_format(value):
    """
    Validate duration format (e.g., '2 years', '6 months', '1 year 6 months').
    """
    duration_regex = re.compile(
        r'^(\d+\s+(year|years|month|months))(\s+\d+\s+(month|months))?$'
    )
    
    if not duration_regex.match(value.lower()):
        raise ValidationError(
            _('Enter a valid duration format (e.g., "2 years", "6 months", "1 year 6 months").'),
            code='invalid_duration_format'
        )


def validate_credit_hours(value):
    """
    Validate credit hours for academic programs.
    """
    if not (1 <= value <= 300):
        raise ValidationError(
            _('Credit hours must be between 1 and 300.'),
            code='invalid_credit_hours'
        )


def validate_academic_year_month(value):
    """
    Validate academic year start month.
    """
    if not (1 <= value <= 12):
        raise ValidationError(
            _('Academic year start month must be between 1 and 12.'),
            code='invalid_academic_month'
        )


def validate_internship_duration(value):
    """
    Validate internship duration in weeks.
    """
    if not (1 <= value <= 52):
        raise ValidationError(
            _('Internship duration must be between 1 and 52 weeks.'),
            code='invalid_internship_duration'
        )


# Regex validators for common patterns
alphanumeric_validator = RegexValidator(
    regex=r'^[a-zA-Z0-9]+$',
    message=_('Only alphanumeric characters are allowed.'),
    code='invalid_alphanumeric'
)

username_validator = RegexValidator(
    regex=r'^[a-zA-Z0-9_.-]+$',
    message=_('Username can only contain letters, numbers, dots, hyphens, and underscores.'),
    code='invalid_username'
)

slug_validator = RegexValidator(
    regex=r'^[-a-zA-Z0-9_]+$',
    message=_('Only letters, numbers, hyphens, and underscores are allowed.'),
    code='invalid_slug'
)

hex_color_validator = RegexValidator(
    regex=r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
    message=_('Enter a valid hex color code.'),
    code='invalid_hex_color'
)