from django.db import models
import string
import random


class MasterInstitution(models.Model):
    """Comprehensive database of all Kenyan higher learning institutions"""
    name = models.CharField(max_length=255, unique=True)
    short_name = models.CharField(max_length=100, blank=True)
    institution_type = models.CharField(
        max_length=50,
        choices=[
            ('university', 'University'),
            ('college', 'College'),
            ('institute', 'Institute'),
            ('polytechnic', 'Polytechnic'),
            ('tvet', 'TVET Institution'),
        ]
    )
    accreditation_body = models.CharField(
        max_length=50,
        choices=[
            ('cue', 'Commission for University Education'),
            ('tveta', 'Technical and Vocational Education and Training Authority'),
            ('knqa', 'Kenya National Qualifications Authority'),
            ('other', 'Other'),
        ]
    )
    registration_number = models.CharField(max_length=100, unique=True, blank=True, null=True)
    website = models.URLField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    county = models.CharField(max_length=100, blank=True)
    is_public = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    data_source = models.CharField(
        max_length=50,
        choices=[
            ('kuccps', 'KUCCPS'),
            ('cue', 'CUE'),
            ('tveta', 'TVETA'),
            ('manual', 'Manual Entry'),
            ('webscrape', 'Web Scraping'),
        ],
        default='manual'
    )
    last_verified = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['institution_type']),
            models.Index(fields=['is_active']),
        ]

    def get_display_name(self):
        """Return a formatted display name for the institution"""
        if self.short_name:
            return f"{self.name} ({self.short_name})"
        return self.name
    
    def __str__(self):
        return self.name


class Institution(models.Model):
    name = models.CharField(max_length=255)
    institution_type = models.CharField(max_length=100)  # e.g., University, College
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    registration_number = models.CharField(max_length=100, unique=True, blank=True, null=True)
    university_code = models.CharField(
        max_length=20, 
        unique=True, 
        blank=True, 
        null=True,
        help_text="Unique code for student registration (e.g., UON2024, JKUAT2024)"
    )
    master_institution = models.ForeignKey(
        MasterInstitution, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="Link to master institution database"
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.university_code:
            self.university_code = self.generate_university_code()
        super().save(*args, **kwargs)

    def generate_university_code(self):
        """Generate a unique university code based on institution name and year"""
        from datetime import datetime
        
        # Extract initials from institution name
        words = self.name.upper().split()
        initials = ''.join([word[0] for word in words if word])
        
        # Add current year
        year = datetime.now().year
        
        # Create base code
        base_code = f"{initials}{year}"
        
        # Ensure uniqueness by adding random suffix if needed
        code = base_code
        counter = 1
        while Institution.objects.filter(university_code=code).exists():
            code = f"{base_code}{counter:02d}"
            counter += 1
            
        return code

    def __str__(self):
        return self.name


class Course(models.Model):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='courses')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    duration_years = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.institution.name})"


class Department(models.Model):
    """Model to represent academic departments within institutions"""
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    head_of_department = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['institution', 'code']

    def __str__(self):
        return f"{self.name} - {self.institution.name}"


class Campus(models.Model):
    """Model to represent different campuses of an institution"""
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='campuses')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20)
    address = models.TextField()
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default='Kenya')
    is_main_campus = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['institution', 'code']
        verbose_name_plural = 'Campuses'

    def __str__(self):
        return f"{self.name} Campus - {self.institution.name}"


class UniversityRegistrationCode(models.Model):
    """Model for university-generated registration codes (EDUJKUAT24-XX format)"""
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='registration_codes')
    code = models.CharField(
        max_length=20, 
        unique=True,
        help_text="University registration code in format EDUJKUAT24-XX"
    )
    year = models.PositiveIntegerField(help_text="Academic year for this code")
    sequence_number = models.PositiveIntegerField(help_text="Sequential number for this institution and year")
    
    # Code lifecycle management
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="When this code expires")
    max_uses = models.PositiveIntegerField(default=1, help_text="Maximum number of times this code can be used")
    current_uses = models.PositiveIntegerField(default=0, help_text="Current number of uses")
    
    # Security and tracking
    created_by = models.CharField(max_length=255, blank=True, help_text="Who generated this code")
    ip_restrictions = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of allowed IP addresses/ranges for geofencing"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['institution', 'year', 'sequence_number']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['institution', 'year']),
            models.Index(fields=['is_active', 'expires_at']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.institution.name}"
    
    def is_valid(self):
        """Check if code is valid for use"""
        from django.utils import timezone
        
        if not self.is_active:
            return False, "Code is inactive"
        
        if self.expires_at and self.expires_at < timezone.now():
            return False, "Code has expired"
        
        if self.current_uses >= self.max_uses:
            return False, "Code usage limit exceeded"
        
        return True, "Code is valid"
    
    def increment_usage(self):
        """Increment usage count"""
        self.current_uses += 1
        self.save(update_fields=['current_uses'])
    
    @classmethod
    def generate_code(cls, institution, year=None, created_by=None):
        """Generate a new registration code for an institution"""
        from datetime import datetime
        
        if year is None:
            year = datetime.now().year
        
        # Get institution abbreviation
        institution_codes = {
            'Jomo Kenyatta University of Agriculture and Technology': 'JKUAT',
            'University of Nairobi': 'UON',
            'Kenyatta University': 'KU',
            'Moi University': 'MU',
            'Egerton University': 'EG',
            'Technical University of Kenya': 'TUK',
            'Strathmore University': 'STRATH',
            'United States International University': 'USIU',
            'Daystar University': 'DAYSTAR',
            'Catholic University of Eastern Africa': 'CUEA'
        }
        
        # Get institution code or create from name
        inst_code = institution_codes.get(institution.name)
        if not inst_code:
            # Create code from first letters of each word
            words = institution.name.upper().split()
            inst_code = ''.join([word[0] for word in words if word])[:6]
        
        # Get next sequence number
        last_code = cls.objects.filter(
            institution=institution, 
            year=year
        ).order_by('-sequence_number').first()
        
        sequence = (last_code.sequence_number + 1) if last_code else 1
        
        # Generate code in format EDUJKUAT24-XX
        year_short = year % 100  # Last 2 digits of year
        code = f"EDU{inst_code}{year_short:02d}-{sequence:02d}"
        
        # Create the code
        return cls.objects.create(
            institution=institution,
            code=code,
            year=year,
            sequence_number=sequence,
            created_by=created_by or 'system'
        )


class CodeUsageLog(models.Model):
    """Log of registration code usage attempts"""
    registration_code = models.ForeignKey(
        UniversityRegistrationCode, 
        on_delete=models.CASCADE, 
        related_name='usage_logs',
        null=True,
        blank=True
    )
    
    # User information
    email = models.EmailField(help_text="Email of user attempting registration")
    national_id = models.CharField(max_length=20, blank=True)
    registration_number = models.CharField(max_length=50, blank=True)
    
    # Usage details
    usage_status = models.CharField(
        max_length=20,
        choices=[
            ('success', 'Successful Registration'),
            ('failed', 'Failed Registration'),
            ('invalid_code', 'Invalid Code'),
            ('expired', 'Code Expired'),
            ('limit_exceeded', 'Usage Limit Exceeded'),
            ('ip_blocked', 'IP Address Blocked'),
            ('duplicate_attempt', 'Duplicate Registration Attempt')
        ]
    )
    
    # Security tracking
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Additional context
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['registration_code', 'created_at']),
            models.Index(fields=['email', 'usage_status']),
            models.Index(fields=['ip_address', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.registration_code.code} - {self.email} - {self.usage_status}"


class UniversityAPIConfig(models.Model):
    """Configuration for university system API integration"""
    institution = models.OneToOneField(Institution, on_delete=models.CASCADE, related_name='api_config')
    api_endpoint = models.URLField(help_text="Base URL for the university's student information system API")
    api_key = models.CharField(max_length=255, blank=True, help_text="API key for authentication")
    api_secret = models.CharField(max_length=255, blank=True, help_text="API secret for authentication")
    auth_type = models.CharField(
        max_length=20,
        choices=[
            ('api_key', 'API Key'),
            ('oauth', 'OAuth'),
            ('basic', 'Basic Auth'),
            ('bearer', 'Bearer Token')
        ],
        default='api_key'
    )
    is_active = models.BooleanField(default=False)
    last_sync = models.DateTimeField(null=True, blank=True)
    sync_frequency_hours = models.PositiveIntegerField(default=24, help_text="How often to sync data in hours")
    
    # API endpoint configurations
    student_lookup_endpoint = models.CharField(
        max_length=255, 
        default='/api/students/{registration_number}',
        help_text="Endpoint to lookup student by registration number. Use {registration_number} as placeholder"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"API Config for {self.institution.name}"


class StudentVerificationLog(models.Model):
    """Log of student verification attempts with university systems"""
    registration_number = models.CharField(max_length=50)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    verification_status = models.CharField(
        max_length=20,
        choices=[
            ('success', 'Success'),
            ('failed', 'Failed'),
            ('not_found', 'Student Not Found'),
            ('api_error', 'API Error'),
            ('timeout', 'Timeout')
        ]
    )
    api_response = models.JSONField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.registration_number} - {self.verification_status}"


class StudentInvite(models.Model):
    """Model for student invitation tokens"""
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    email = models.EmailField()
    registration_number = models.CharField(max_length=50, blank=True)
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('authentication.User', on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('institution', 'email')
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['institution', 'is_used']),
        ]
    
    def __str__(self):
        return f"Invite for {self.email} to {self.institution.name}"
    
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at
