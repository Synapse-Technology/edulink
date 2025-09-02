from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from .models import User, EmailOTP, RoleChoices
from .validators import validate_password_strength
from .utils import get_client_ip
from .tasks import send_email_task
import uuid
import random
import string
import requests
from django.conf import settings
from typing import Dict, Any
import re
import logging

logger = logging.getLogger(__name__)


class SelfServiceRegistrationSerializer(serializers.Serializer):
    """
    Base serializer for self-service registration.
    Handles common validation and user creation logic.
    """
    
    # Common fields for all registration types
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=20)
    national_id = serializers.CharField(max_length=20)
    
    # Registration type selection
    registration_type = serializers.ChoiceField(
        choices=['student', 'institution_admin', 'employer'],
        required=True
    )
    
    # Terms and conditions
    accept_terms = serializers.BooleanField(required=True)
    accept_privacy = serializers.BooleanField(required=True)
    
    def validate_email(self, value):
        """Validate email uniqueness and format."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
        # Additional email validation (e.g., domain restrictions)
        domain = value.split('@')[1].lower()
        blocked_domains = getattr(settings, 'BLOCKED_EMAIL_DOMAINS', [])
        if domain in blocked_domains:
            raise serializers.ValidationError("Email domain is not allowed.")
        
        return value.lower()
    
    def validate_phone_number(self, value):
        """Validate phone number format and uniqueness."""
        # Remove spaces and special characters
        cleaned_phone = re.sub(r'[^\d+]', '', value)
        
        # Basic phone number validation
        if not re.match(r'^\+?[1-9]\d{1,14}$', cleaned_phone):
            raise serializers.ValidationError("Invalid phone number format.")
        
        if User.objects.filter(phone_number=cleaned_phone).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        
        return cleaned_phone
    
    def validate_national_id(self, value):
        """Validate national ID format and uniqueness."""
        # Remove spaces and special characters
        cleaned_id = re.sub(r'[^\w]', '', value)
        
        if len(cleaned_id) < 8:
            raise serializers.ValidationError("National ID must be at least 8 characters.")
        
        if User.objects.filter(national_id=cleaned_id).exists():
            raise serializers.ValidationError("A user with this national ID already exists.")
        
        return cleaned_id
    
    def validate(self, attrs):
        """Validate common fields and terms acceptance."""
        # Validate password confirmation
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
        
        # Validate terms acceptance
        if not attrs.get('accept_terms'):
            raise serializers.ValidationError({
                'accept_terms': 'You must accept the terms and conditions.'
            })
        
        if not attrs.get('accept_privacy'):
            raise serializers.ValidationError({
                'accept_privacy': 'You must accept the privacy policy.'
            })
        
        # Remove password_confirm from data
        attrs.pop('password_confirm', None)
        
        return attrs
    
    def create_base_user(self, validated_data):
        """Create base user with common fields."""
        # Extract non-user fields
        registration_type = validated_data.pop('registration_type')
        validated_data.pop('accept_terms', None)
        validated_data.pop('accept_privacy', None)
        
        # Set role based on registration type
        role_mapping = {
            'student': RoleChoices.STUDENT,
            'institution_admin': RoleChoices.INSTITUTION_ADMIN,
            'employer': RoleChoices.EMPLOYER
        }
        validated_data['role'] = role_mapping[registration_type]
        
        # Create user (inactive until email verification)
        validated_data['is_active'] = False
        validated_data['is_email_verified'] = False
        
        user = User.objects.create_user(**validated_data)
        return user


class StudentSelfRegistrationSerializer(SelfServiceRegistrationSerializer):
    """
    Serializer for student self-service registration.
    Supports both university code and institution search methods.
    """
    
    # Student-specific fields
    registration_method = serializers.ChoiceField(
        choices=['university_code', 'institution_search'],
        required=True
    )
    
    # University code method fields
    university_code = serializers.CharField(max_length=20, required=False)
    
    # Institution search method fields
    institution_name = serializers.CharField(max_length=255, required=False)
    
    # Common student fields
    student_id = serializers.CharField(max_length=50, required=False)
    year_of_study = serializers.IntegerField(required=False, min_value=1, max_value=8)
    course = serializers.CharField(max_length=100, required=False)
    course_code = serializers.CharField(max_length=50, required=False)
    academic_year = serializers.IntegerField(required=False)
    gender = serializers.ChoiceField(
        choices=[('M', 'Male'), ('F', 'Female'), ('O', 'Other')],
        required=False
    )
    
    def validate(self, attrs):
        """Validate student-specific fields."""
        attrs = super().validate(attrs)
        
        # Ensure registration_type is student
        if attrs.get('registration_type') != 'student':
            raise serializers.ValidationError({
                'registration_type': 'Must be "student" for this endpoint.'
            })
        
        # Apply method-specific validation
        registration_method = attrs.get('registration_method')
        if registration_method == 'university_code':
            return self._validate_university_code_method(attrs)
        elif registration_method == 'institution_search':
            return self._validate_institution_search_method(attrs)
        else:
            raise serializers.ValidationError({
                'registration_method': 'Invalid registration method specified.'
            })
    
    def _validate_university_code_method(self, attrs):
        """Validate university code registration method."""
        required_fields = ['university_code', 'student_id', 'year_of_study']
        missing_fields = [field for field in required_fields if not attrs.get(field)]
        
        if missing_fields:
            raise serializers.ValidationError({
                field: 'This field is required for university code registration.'
                for field in missing_fields
            })
        
        # Validate university code with Institution Service
        university_code = attrs.get('university_code', '').upper()
        institution_data = self._validate_university_code(university_code)
        if not institution_data:
            raise serializers.ValidationError({
                'university_code': 'Invalid or expired university code.'
            })
        
        attrs['institution_data'] = institution_data
        return attrs
    
    def _validate_institution_search_method(self, attrs):
        """Validate institution search registration method."""
        required_fields = ['institution_name', 'student_id', 'year_of_study']
        missing_fields = [field for field in required_fields if not attrs.get(field)]
        
        if missing_fields:
            raise serializers.ValidationError({
                field: 'This field is required for institution search registration.'
                for field in missing_fields
            })
        
        # Validate institution with Institution Service
        institution_data = self._validate_institution(attrs['institution_name'])
        if not institution_data:
            raise serializers.ValidationError({
                'institution_name': 'Institution not found or not verified.'
            })
        
        # Validate student with institution's system if integration exists
        if institution_data.get('has_integration'):
            student_data = self._validate_student_with_institution(
                institution_data['id'], 
                attrs['student_id']
            )
            if student_data:
                attrs['verified_student_data'] = student_data
        
        attrs['institution_data'] = institution_data
        return attrs
    
    def _validate_university_code(self, code: str) -> Dict[str, Any]:
        """Validate university code with Institution Service."""
        try:
            institution_service_url = getattr(settings, 'INSTITUTION_SERVICE_URL', 'http://localhost:8003')
            response = requests.get(
                f"{institution_service_url}/api/codes/{code}/validate/",
                timeout=5
            )
            if response.status_code == 200:
                return response.json()
            return None
        except requests.RequestException:
            return None
    
    def _validate_institution(self, name: str) -> Dict[str, Any]:
        """Validate institution with Institution Service."""
        try:
            institution_service_url = getattr(settings, 'INSTITUTION_SERVICE_URL', 'http://localhost:8003')
            response = requests.get(
                f"{institution_service_url}/api/institutions/search/",
                params={'name': name, 'verified_only': True},
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                return data.get('results', [{}])[0] if data.get('results') else None
            return None
        except requests.RequestException:
            return None
    
    def _validate_student_with_institution(self, institution_id: int, student_id: str) -> Dict[str, Any]:
        """Validate student with institution's system."""
        try:
            institution_service_url = getattr(settings, 'INSTITUTION_SERVICE_URL', 'http://localhost:8003')
            response = requests.post(
                f"{institution_service_url}/api/institutions/{institution_id}/verify-student/",
                json={'student_id': student_id},
                timeout=10
            )
            if response.status_code == 200:
                return response.json()
            return None
        except requests.RequestException:
            return None
    
    def create(self, validated_data):
        """Create student user and profile."""
        # Extract student-specific fields
        registration_method = validated_data.pop('registration_method')
        institution_data = validated_data.pop('institution_data')
        verified_student_data = validated_data.pop('verified_student_data', None)
        
        student_fields = {
            'student_id': validated_data.pop('student_id', None),
            'year_of_study': validated_data.pop('year_of_study', None),
            'course': validated_data.pop('course', None),
            'course_code': validated_data.pop('course_code', None),
            'academic_year': validated_data.pop('academic_year', None),
            'gender': validated_data.pop('gender', None),
        }
        
        # Create base user
        user = self.create_base_user(validated_data)
        
        # Store additional data for profile creation
        user._student_data = {
            'registration_method': registration_method,
            'institution_data': institution_data,
            'student_fields': student_fields,
            'verified_student_data': verified_student_data
        }
        
        return user


class InstitutionAdminSelfRegistrationSerializer(SelfServiceRegistrationSerializer):
    """
    Serializer for institution admin self-service registration.
    Requires institution verification and admin approval.
    """
    
    # Institution admin specific fields
    institution_name = serializers.CharField(max_length=255)
    institution_website = serializers.URLField()
    institution_type = serializers.ChoiceField(
        choices=[
            ('university', 'University'),
            ('college', 'College'),
            ('technical', 'Technical Institute'),
            ('vocational', 'Vocational School'),
            ('other', 'Other')
        ]
    )
    position_title = serializers.CharField(max_length=100)
    department = serializers.CharField(max_length=100, required=False)
    work_email = serializers.EmailField()
    work_phone = serializers.CharField(max_length=20)
    
    # Verification documents
    verification_documents = serializers.ListField(
        child=serializers.CharField(max_length=500),
        required=False,
        help_text="URLs or references to verification documents"
    )
    
    # Additional information
    additional_info = serializers.CharField(
        max_length=1000,
        required=False,
        help_text="Additional information to support your application"
    )
    
    def validate_work_email(self, value):
        """Validate work email domain matches institution."""
        # Extract domain from work email
        work_domain = value.split('@')[1].lower()
        
        # Check if domain is from a free email provider
        free_domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com']
        if work_domain in free_domains:
            raise serializers.ValidationError(
                "Work email must be from your institution's domain, not a free email provider."
            )
        
        return value.lower()
    
    def validate(self, attrs):
        """Validate institution admin specific fields."""
        attrs = super().validate(attrs)
        
        # Ensure registration_type is institution_admin
        if attrs.get('registration_type') != 'institution_admin':
            raise serializers.ValidationError({
                'registration_type': 'Must be "institution_admin" for this endpoint.'
            })
        
        # Validate institution website domain matches work email domain
        work_email_domain = attrs['work_email'].split('@')[1].lower()
        institution_website = attrs['institution_website'].lower()
        
        # Extract domain from website URL
        if '://' in institution_website:
            website_domain = institution_website.split('://')[1].split('/')[0]
        else:
            website_domain = institution_website.split('/')[0]
        
        # Remove www. prefix if present
        if website_domain.startswith('www.'):
            website_domain = website_domain[4:]
        
        if work_email_domain not in website_domain and website_domain not in work_email_domain:
            raise serializers.ValidationError({
                'work_email': 'Work email domain should match your institution\'s website domain.'
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create institution admin user (pending approval)."""
        # Extract institution-specific fields
        institution_fields = {
            'institution_name': validated_data.pop('institution_name'),
            'institution_website': validated_data.pop('institution_website'),
            'institution_type': validated_data.pop('institution_type'),
            'position_title': validated_data.pop('position_title'),
            'department': validated_data.pop('department', None),
            'work_email': validated_data.pop('work_email'),
            'work_phone': validated_data.pop('work_phone'),
            'verification_documents': validated_data.pop('verification_documents', []),
            'additional_info': validated_data.pop('additional_info', None),
        }
        
        # Create base user (inactive until approved)
        user = self.create_base_user(validated_data)
        
        # Store additional data for approval process
        user._institution_admin_data = institution_fields
        
        return user


class EmployerSelfRegistrationSerializer(SelfServiceRegistrationSerializer):
    """
    Serializer for employer self-service registration.
    Requires company verification and admin approval.
    """
    
    # Company information
    company_name = serializers.CharField(max_length=255)
    company_website = serializers.URLField()
    company_type = serializers.ChoiceField(
        choices=[
            ('corporation', 'Corporation'),
            ('startup', 'Startup'),
            ('nonprofit', 'Non-Profit'),
            ('government', 'Government'),
            ('consulting', 'Consulting'),
            ('other', 'Other')
        ]
    )
    industry = serializers.CharField(max_length=100)
    company_size = serializers.ChoiceField(
        choices=[
            ('1-10', '1-10 employees'),
            ('11-50', '11-50 employees'),
            ('51-200', '51-200 employees'),
            ('201-1000', '201-1000 employees'),
            ('1000+', '1000+ employees')
        ]
    )
    
    # Contact information
    position_title = serializers.CharField(max_length=100)
    department = serializers.CharField(max_length=100, required=False)
    work_email = serializers.EmailField()
    work_phone = serializers.CharField(max_length=20)
    
    # Company address
    company_address = serializers.CharField(max_length=500)
    city = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=100)
    
    # Verification documents
    verification_documents = serializers.ListField(
        child=serializers.CharField(max_length=500),
        required=False,
        help_text="URLs or references to verification documents"
    )
    
    # Additional information
    additional_info = serializers.CharField(
        max_length=1000,
        required=False,
        help_text="Additional information about your company and internship programs"
    )
    
    def validate_work_email(self, value):
        """Validate work email domain matches company."""
        # Extract domain from work email
        work_domain = value.split('@')[1].lower()
        
        # Check if domain is from a free email provider
        free_domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com']
        if work_domain in free_domains:
            raise serializers.ValidationError(
                "Work email must be from your company's domain, not a free email provider."
            )
        
        return value.lower()
    
    def validate(self, attrs):
        """Validate employer specific fields."""
        attrs = super().validate(attrs)
        
        # Ensure registration_type is employer
        if attrs.get('registration_type') != 'employer':
            raise serializers.ValidationError({
                'registration_type': 'Must be "employer" for this endpoint.'
            })
        
        # Validate company website domain matches work email domain
        work_email_domain = attrs['work_email'].split('@')[1].lower()
        company_website = attrs['company_website'].lower()
        
        # Extract domain from website URL
        if '://' in company_website:
            website_domain = company_website.split('://')[1].split('/')[0]
        else:
            website_domain = company_website.split('/')[0]
        
        # Remove www. prefix if present
        if website_domain.startswith('www.'):
            website_domain = website_domain[4:]
        
        if work_email_domain not in website_domain and website_domain not in work_email_domain:
            raise serializers.ValidationError({
                'work_email': 'Work email domain should match your company\'s website domain.'
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create employer user (pending approval)."""
        # Extract employer-specific fields
        employer_fields = {
            'company_name': validated_data.pop('company_name'),
            'company_website': validated_data.pop('company_website'),
            'company_type': validated_data.pop('company_type'),
            'industry': validated_data.pop('industry'),
            'company_size': validated_data.pop('company_size'),
            'position_title': validated_data.pop('position_title'),
            'department': validated_data.pop('department', None),
            'work_email': validated_data.pop('work_email'),
            'work_phone': validated_data.pop('work_phone'),
            'company_address': validated_data.pop('company_address'),
            'city': validated_data.pop('city'),
            'country': validated_data.pop('country'),
            'verification_documents': validated_data.pop('verification_documents', []),
            'additional_info': validated_data.pop('additional_info', None),
        }
        
        # Create base user (inactive until approved)
        user = self.create_base_user(validated_data)
        
        # Store additional data for approval process
        user._employer_data = employer_fields
        
        return user


class RegistrationStatusSerializer(serializers.Serializer):
    """
    Serializer for checking registration status.
    """
    
    email = serializers.EmailField(
        help_text="Email address to check registration status for"
    )
    
    def validate_email(self, value):
        """Validate email format."""
        return value.lower().strip()