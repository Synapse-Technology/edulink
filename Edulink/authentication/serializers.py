from rest_framework import serializers
from .models import User, Invite, EmailOTP
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, smart_str, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings
from users.models import UserRole, StudentProfile, InstitutionProfile, EmployerProfile
from institutions.models import Institution, MasterInstitution
from django.utils import timezone
from django.db import transaction
import random
from security.models import SecurityEvent, FailedLoginAttempt, UserSession, AuditLog
import logging

# Configure logger for debugging
logger = logging.getLogger(__name__)
from security.utils import ThreatDetector


def safe_create_security_event(**kwargs):
    """Safely create SecurityEvent with proper parameter mapping."""
    try:
        # Handle legacy 'details' parameter
        if 'details' in kwargs:
            details_value = kwargs.pop('details')
            if 'description' not in kwargs:
                kwargs['description'] = details_value
            logger.warning(f"Converted 'details' to 'description': {details_value}")
        
        # Ensure required fields have defaults
        kwargs.setdefault('ip_address', '127.0.0.1')
        kwargs.setdefault('user_agent', '')
        kwargs.setdefault('metadata', {})
        
        logger.debug(f"Creating SecurityEvent with params: {kwargs}")
        return SecurityEvent.objects.create(**kwargs)
    except Exception as e:
        logger.error(f"Failed to create SecurityEvent: {e}, params: {kwargs}")
        raise
from users.roles import RoleChoices
from difflib import SequenceMatcher

from institutions.models import UniversityRegistrationCode, CodeUsageLog


def validate_unique_email(value):
    if not value:
        return
    if User.objects.filter(email=value).exists():  # type: ignore[attr-defined]
        raise serializers.ValidationError("A user with this email already exists.")


def validate_unique_phone_number(value):
    if not value:
        return
    if (
        StudentProfile.objects.filter(phone_number=value).exists()  # type: ignore[attr-defined]
        or InstitutionProfile.objects.filter(phone_number=value).exists()  # type: ignore[attr-defined]
        or EmployerProfile.objects.filter(phone_number=value).exists()  # type: ignore[attr-defined]
    ):
        raise serializers.ValidationError(
            "A user with this phone number already exists."
        )


class BaseProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(
        max_length=20, validators=[validate_unique_phone_number]
    )
    email = serializers.EmailField(validators=[validate_unique_email])
    password = serializers.CharField(write_only=True, validators=[validate_password])





class UnifiedStudentRegistrationSerializer(serializers.Serializer):
    """
    Unified student registration serializer that handles both university code and university search methods.
    Automatically detects registration method and applies appropriate validation.
    """
    
    # Common fields for all registration methods
    email = serializers.EmailField(validators=[validate_unique_email])
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=20, validators=[validate_unique_phone_number])
    national_id = serializers.CharField(max_length=20)
    
    # Method-specific fields
    registration_method = serializers.ChoiceField(
        choices=['university_code', 'university_search'],
        required=True
    )
    
    # University code method fields
    university_code = serializers.CharField(max_length=20, required=False)
    year_of_study = serializers.IntegerField(required=False)
    course = serializers.CharField(max_length=100, required=False)
    gender = serializers.ChoiceField(
        choices=[('M', 'Male'), ('F', 'Female'), ('O', 'Other')],
        required=False
    )
    
    # University search method fields
    institution_name = serializers.CharField(max_length=255, required=False)
    registration_number = serializers.CharField(max_length=50, required=False)
    academic_year = serializers.IntegerField(required=False)
    course_code = serializers.CharField(max_length=50, required=False)
    
    def validate(self, data):
        """
        Validate data based on registration method and apply method-specific validation.
        """
        registration_method = data.get('registration_method')
        
        # Validate password confirmation
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
        
        # Remove password_confirm from data as it's not needed for user creation
        data.pop('password_confirm', None)
        
        # Apply method-specific validation
        if registration_method == 'university_code':
            return self._validate_university_code_method(data)
        elif registration_method == 'university_search':
            return self._validate_university_search_method(data)
        else:
            raise serializers.ValidationError({
                'registration_method': 'Invalid registration method specified.'
            })
    
    def _validate_university_code_method(self, data):
        """
        Validate university code registration method.
        """
        # Check required fields for university code method
        required_fields = ['university_code', 'registration_number', 'year_of_study']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            raise serializers.ValidationError({
                field: 'This field is required for university code registration.'
                for field in missing_fields
            })
        
        # Validate university code
        university_code = data.get('university_code', '').upper()
        try:
            code = UniversityRegistrationCode.objects.get(code=university_code)
            is_valid, error_message = code.is_valid()
            
            if not is_valid:
                # Log invalid code attempt
                request = self.context.get('request')
                ip_address = self.get_client_ip(request) if request else '127.0.0.1'
                
                SecurityEvent.objects.create(
                    event_type='invalid_university_code',
                    severity='medium',
                    description=f'Invalid university code attempt: {university_code}',
                    user=None,
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
                    metadata={
                        'university_code': university_code,
                        'error_message': error_message,
                        'email': data.get('email')
                    }
                )
                
                raise serializers.ValidationError({
                    'university_code': error_message
                })
            
            data['registration_code'] = code
            data['institution'] = code.institution
            
        except UniversityRegistrationCode.DoesNotExist:
            # Log invalid code attempt
            request = self.context.get('request')
            ip_address = self.get_client_ip(request) if request else '127.0.0.1'
            
            SecurityEvent.objects.create(
                event_type='invalid_university_code',
                severity='medium',
                description=f'Non-existent university code attempt: {university_code}',
                user=None,
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
                metadata={
                    'university_code': university_code,
                    'email': data.get('email')
                }
            )
            
            raise serializers.ValidationError({
                'university_code': 'Invalid university code.'
            })
        
        # Validate unique fields
        self._validate_unique_fields(data)
        
        return data
    
    def _validate_university_search_method(self, data):
        """
        Validate university search registration method.
        """
        # Check required fields for university search method
        required_fields = ['institution_name', 'registration_number', 'year_of_study']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            raise serializers.ValidationError({
                field: 'This field is required for university search registration.'
                for field in missing_fields
            })
        
        # Validate institution exists and is verified
        try:
            institution = Institution.objects.get(name=data['institution_name'])
            if not institution.is_verified:
                raise serializers.ValidationError({
                    'institution_name': 'The specified institution is not verified yet.'
                })
            data['institution'] = institution
        except Institution.DoesNotExist:
            raise serializers.ValidationError({
                'institution_name': 'The specified institution does not exist.'
            })
        
        # Validate course if provided
        if data.get('course_code'):
            try:
                course = institution.courses.get(code=data['course_code'])
                data['course'] = course
            except Exception:
                raise serializers.ValidationError({
                    'course_code': 'Invalid course code for the specified institution.'
                })
        
        # Validate unique fields
        self._validate_unique_fields(data)
        
        return data
    
    def _validate_unique_fields(self, data):
        """
        Validate unique fields across both registration methods.
        """
        # Validate unique national_id
        if StudentProfile.objects.filter(national_id=data['national_id']).exists():
            raise serializers.ValidationError({
                'national_id': 'A student with this national ID already exists.'
            })
        
        # Validate unique registration_number per institution
        if data.get('registration_number'):
            institution = data.get('institution')
            if not institution:
                # For university_code method, get institution from the code
                university_code = data.get('university_code')
                if university_code:
                    try:
                        reg_code = UniversityRegistrationCode.objects.get(code=university_code)
                        institution = reg_code.institution
                    except UniversityRegistrationCode.DoesNotExist:
                        pass
            
            if institution and StudentProfile.objects.filter(
                institution=institution,
                registration_number=data['registration_number']
            ).exists():
                raise serializers.ValidationError({
                    'registration_number': f'A student with this registration number already exists at {institution.name}.'
                })
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Create user and student profile based on registration method.
        """
        registration_method = validated_data.pop('registration_method')
        
        if registration_method == 'university_code':
            return self._create_university_code_registration(validated_data)
        elif registration_method == 'university_search':
            return self._create_university_search_registration(validated_data)
    
    def _create_university_code_registration(self, validated_data):
        """
        Create user and profile for university code registration.
        """
        # Extract data
        registration_code = validated_data.pop('registration_code')
        institution = validated_data.pop('institution')
        university_code = validated_data.get('university_code')
        
        # Create user
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            role='student',
            phone_number=validated_data['phone_number'],
            national_id=validated_data['national_id'],
            is_email_verified=False
        )
        
        # For university code method, set default values for fields not provided
        # The university code validates the student's eligibility, so we don't need detailed registration info
        year_of_study = validated_data.get('year_of_study', 1)  # Default to first year
        registration_number = validated_data.get('registration_number')  # Optional for code method
        
        # Create student profile
        student_profile = StudentProfile.objects.create(
            user=user,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_number=validated_data['phone_number'],
            national_id=validated_data['national_id'],
            year_of_study=year_of_study,
            registration_number=registration_number,
            institution=institution,
            institution_name=institution.name,
            registration_method='university_code',
            university_verified=True,
            university_code_used=university_code,
            is_verified=True,
            course=validated_data.get('course'),
            gender=validated_data.get('gender')
        )
        
        # Update registration code usage
        registration_code.current_uses += 1
        registration_code.save()
        
        # Log code usage
        request = self.context.get('request')
        ip_address = self.get_client_ip(request) if request else None
        user_agent = request.META.get('HTTP_USER_AGENT', '') if request else ''
        
        CodeUsageLog.objects.create(
            registration_code=registration_code,
            email=user.email,
            usage_status='success',
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Log security event
        SecurityEvent.objects.create(
            event_type='user_registration',
            severity='low',
            description=f'Student registered using university code: {user.email}',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'email': user.email,
                'role': 'student',
                'registration_method': 'university_code',
                'university_code': university_code,
                'institution_name': institution.name
            }
        )
        
        # Send welcome email and verification
        self._send_welcome_email(user, student_profile)
        
        return user
    
    def _create_university_search_registration(self, validated_data):
        """
        Create user and profile for university search registration.
        """
        # Extract data
        institution = validated_data.pop('institution')
        
        # Create user
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            role='student',
            phone_number=validated_data['phone_number'],
            national_id=validated_data['national_id'],
            is_email_verified=False
        )
        
        # Create student profile
        student_profile = StudentProfile.objects.create(
            user=user,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_number=validated_data['phone_number'],
            national_id=validated_data['national_id'],
            registration_number=validated_data.get('registration_number'),
            academic_year=validated_data.get('academic_year'),
            year_of_study=validated_data.get('academic_year', 1),
            institution=institution,
            institution_name=institution.name,
            registration_method='university_search',
            university_verified=institution.is_verified,
            is_verified=institution.is_verified,
            course=validated_data.get('course')
        )
        
        # Log security event
        request = self.context.get('request')
        ip_address = self.get_client_ip(request) if request else None
        user_agent = request.META.get('HTTP_USER_AGENT', '') if request else ''
        
        SecurityEvent.objects.create(
            event_type='user_registration',
            severity='low',
            description=f'Student registered using university search: {user.email}',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'email': user.email,
                'role': 'student',
                'registration_method': 'university_search',
                'institution_name': institution.name,
                'registration_number': validated_data.get('registration_number')
            }
        )
        
        # Send welcome email and verification
        self._send_welcome_email(user, student_profile)
        
        return user
    
    def _send_welcome_email(self, user, student_profile):
        """
        Send welcome email and email verification.
        """
        # Create welcome notification
        from notifications.models import Notification
        
        Notification.objects.create(
            user=user,
            message=f"Welcome to EduLink KE, {student_profile.first_name}! We're excited to have you.",
            notification_type="email",
            status="pending",
        )
        
        # Send email verification
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_url = f"http://localhost:8000/api/auth/verify-email/{uid}/{token}/"
        
        send_mail(
            "Verify your EduLink account",
            f"Hi {student_profile.first_name},\n\nPlease verify your email by clicking the link below:\n{verify_url}\n\nThank you for joining EduLink!",
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        if not request:
            return None
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    """
    Student registration serializer using university-generated registration codes
    """
    email = serializers.EmailField(validators=[validate_unique_email])
    password = serializers.CharField(write_only=True, validators=[validate_password])
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(
        max_length=20, validators=[validate_unique_phone_number]
    )
    national_id = serializers.CharField(max_length=20)
    registration_number = serializers.CharField(max_length=50)
    year_of_study = serializers.IntegerField()
    university_code = serializers.CharField(max_length=20)
    course_code = serializers.CharField(max_length=50, required=False)

    def validate(self, data):
        # Validate university code
        university_code = data.get('university_code', '').upper()
        try:
            code = UniversityRegistrationCode.objects.get(code=university_code)
            is_valid, error_message = code.is_valid()
            
            if not is_valid:
                raise serializers.ValidationError({
                    'university_code': error_message
                })
            
            data['registration_code'] = code
            data['institution'] = code.institution
            
        except UniversityRegistrationCode.DoesNotExist:
            raise serializers.ValidationError({
                'university_code': 'Invalid university code'
            })

        # Validate unique fields
        if StudentProfile.objects.filter(national_id=data["national_id"]).exists():
            raise serializers.ValidationError({
                "national_id": "A student with this national ID already exists."
            })

        if StudentProfile.objects.filter(
            registration_number=data["registration_number"]
        ).exists():
            raise serializers.ValidationError({
                "registration_number": "A student with this registration number already exists."
            })

        # Validate course if provided
        if "course_code" in data and data["course_code"]:
            try:
                course = data['institution'].courses.get(code=data["course_code"])
                data["course"] = course
            except Exception:
                raise serializers.ValidationError({
                    "course_code": "Invalid course code for the specified institution."
                })

        return data

    @transaction.atomic
    def create(self, validated_data):
        # Extract data
        registration_code = validated_data.pop('registration_code')
        institution = validated_data.pop('institution')
        phone_number = validated_data.pop("phone_number")
        national_id = validated_data.pop("national_id")
        university_code = validated_data.pop('university_code')
        
        profile_data = {
            "first_name": validated_data.pop("first_name"),
            "last_name": validated_data.pop("last_name"),
            "phone_number": phone_number,
            "national_id": national_id,
            "registration_number": validated_data.pop("registration_number"),
            "year_of_study": validated_data.pop("year_of_study"),
            "institution": institution,
            "course": validated_data.get("course"),
            "institution_name": institution.name,
            "university_verified": True,  # Verified through university code
            "university_code_used": university_code,
            "is_verified": True,
        }

        # Create user
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            role="student",
            phone_number=phone_number,
            national_id=national_id,
            is_email_verified=True,
        )

        # Create StudentProfile
        student_profile = StudentProfile.objects.create(
            user=user, **profile_data
        )

        # Update registration code usage
        registration_code.current_uses += 1
        registration_code.save()

        # Log successful code usage
        request = self.context.get('request')
        ip_address = self.get_client_ip(request) if request else None
        user_agent = request.META.get('HTTP_USER_AGENT', '') if request else ''
        
        CodeUsageLog.objects.create(
            registration_code=registration_code,
            email=user.email,
            usage_status='success',
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Log security event
        SecurityEvent.objects.create(
            event_type='user_registration',
            severity='low',
            description=f'Student registered using university code: {user.email}',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'email': user.email,
                'role': 'student',
                'registration_type': 'university_code',
                'university_code': university_code,
                'institution_name': institution.name
            }
        )

        return student_profile

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        if not request:
            return None
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class InstitutionRegistrationSerializer(BaseProfileSerializer):
    institution_name = serializers.CharField(max_length=255)
    institution_type = serializers.CharField(max_length=100)
    registration_number = serializers.CharField(max_length=100)
    address = serializers.CharField(max_length=255)
    website = serializers.URLField(required=False)
    position = serializers.CharField(max_length=100, required=False)
    national_id = serializers.CharField(max_length=20)

    def _find_matching_master_institution(self, institution_name, institution_type):
        """
        Find a matching MasterInstitution record using fuzzy string matching.
        Returns the best match if similarity is above threshold, otherwise None.
        """
        # First try exact match
        exact_match = MasterInstitution.objects.filter(
            name__iexact=institution_name.strip()
        ).first()
        if exact_match:
            return exact_match
        
        # Try fuzzy matching with different similarity thresholds
        master_institutions = MasterInstitution.objects.all()
        best_match = None
        best_similarity = 0.0
        
        for master_inst in master_institutions:
            # Calculate similarity ratio
            similarity = SequenceMatcher(None, 
                institution_name.lower().strip(), 
                master_inst.name.lower().strip()
            ).ratio()
            
            # Boost similarity if institution types match
            if (master_inst.institution_type and 
                institution_type.lower() in master_inst.institution_type.lower()):
                similarity += 0.1
            
            # Update best match if this is better
            if similarity > best_similarity and similarity >= 0.85:  # 85% similarity threshold
                best_similarity = similarity
                best_match = master_inst
        
        return best_match

    @transaction.atomic
    def create(self, validated_data):
        # Extract profile data
        phone_number = validated_data.pop("phone_number", None)
        if not phone_number:
            raise serializers.ValidationError(
                {"phone_number": "Phone number is required."}
            )
        profile_data = {
            "first_name": validated_data.pop("first_name"),
            "last_name": validated_data.pop("last_name"),
            "phone_number": phone_number,
            "position": validated_data.pop("position", None),
        }

        # Create user with correct role
        user = User.objects.create_user(  # type: ignore[attr-defined]
            email=validated_data["email"],
            password=validated_data["password"],
            role="institution_admin",  # Set the correct role
            national_id=validated_data.pop("national_id"),  # Save national_id to user
        )

        # Find matching MasterInstitution
        master_institution = self._find_matching_master_institution(
            validated_data["institution_name"],
            validated_data["institution_type"]
        )
        
        # Create Institution with optional master_institution link
        institution_data = {
            "name": validated_data["institution_name"],
            "institution_type": validated_data["institution_type"],
            "registration_number": validated_data["registration_number"],
            "email": validated_data["email"],
            "phone_number": phone_number,
            "address": validated_data["address"],
            "website": validated_data.get("website"),
        }
        
        if master_institution:
            institution_data["master_institution"] = master_institution
        
        institution = Institution.objects.create(**institution_data)  # type: ignore[attr-defined]

        # Create UserRole
        UserRole.objects.create(  # type: ignore[attr-defined]
            user=user, role="institution_admin", institution=institution
        )

        # Create InstitutionProfile
        institution_profile = InstitutionProfile.objects.create(  # type: ignore[attr-defined]
            user=user, institution=institution, **profile_data
        )

        # Log user registration security event
        request = self.context.get('request')
        ip_address = '127.0.0.1'  # Default IP address
        user_agent = ''
        if request:
            ip_address = self.get_client_ip(request) or '127.0.0.1'
            user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Prepare metadata with master institution linking info
        metadata = {
            'email': user.email,
            'role': 'institution_admin',
            'registration_type': 'institution_admin_registration',
            'institution_name': validated_data["institution_name"],
            'master_institution_linked': master_institution is not None
        }
        
        if master_institution:
            metadata['master_institution_id'] = master_institution.id
            metadata['master_institution_name'] = master_institution.name

        SecurityEvent.objects.create(
            event_type='user_registration',
            severity='low',
            description=f'New institution admin user registered: {user.email}',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
        
        # Create audit log
        AuditLog.objects.create(
            action='user_registration',
            user=user,
            resource_type='User',
            resource_id=str(user.pk),
            description=f'New institution admin user registered: {user.email}',
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'email': user.email,
                'role': 'institution_admin',
                'registration_type': 'institution_admin_registration'
            }
        )

        # Create welcome notification
        from notifications.models import Notification

        Notification.objects.create(  # type: ignore[attr-defined]
            user=user,
            message=f"Welcome to EduLink KE, {institution_profile.first_name}! We're excited to have you.",
            notification_type="email",
            status="pending",
        )
        # Send email verification
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_url = f"http://localhost:8000/api/auth/verify-email/{uid}/{token}/"
        send_mail(
            "Verify your EduLink account",
            f"Hi {institution_profile.first_name},\n\nPlease verify your email by clicking the link below:\n{verify_url}\n\nThank you for joining EduLink!",
            settings.DEFAULT_FROM_EMAIL,
            [user.email],  # type: ignore[attr-defined]
            fail_silently=False,
        )
        return user

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class EmployerRegistrationSerializer(BaseProfileSerializer):
    company_name = serializers.CharField(max_length=255)
    industry = serializers.CharField(max_length=100)
    company_size = serializers.CharField(max_length=50)
    location = serializers.CharField(max_length=255)
    website = serializers.URLField(required=False)
    department = serializers.CharField(max_length=100, required=False)
    position = serializers.CharField(max_length=100, required=False)
    national_id = serializers.CharField(max_length=20)

    @transaction.atomic
    def create(self, validated_data):
        # Extract profile data
        phone_number = validated_data.pop("phone_number", None)
        if not phone_number:
            raise serializers.ValidationError(
                {"phone_number": "Phone number is required."}
            )
        profile_data = {
            "first_name": validated_data.pop("first_name"),
            "last_name": validated_data.pop("last_name"),
            "phone_number": phone_number,
            "position": validated_data.pop("position", None),
        }

        # Create user with correct role
        user = User.objects.create_user(  # type: ignore[attr-defined]
            email=validated_data["email"],
            password=validated_data["password"],
            role="employer",  # Set the correct role
            national_id=validated_data.pop("national_id"),  # Save national_id to user
        )

        # Create EmployerProfile
        employer_profile = EmployerProfile.objects.create(  # type: ignore[attr-defined]
            user=user,
            company_name=validated_data["company_name"],
            industry=validated_data["industry"],
            company_size=validated_data["company_size"],
            location=validated_data["location"],
            website=validated_data.get("website"),
            department=validated_data.get("department"),
            **profile_data,
        )

        # Create UserRole
        UserRole.objects.create(  # type: ignore[attr-defined]
            user=user, role="employer"
        )

        # Log user registration security event
        request = self.context.get('request')
        ip_address = '127.0.0.1'  # Default IP address
        user_agent = ''
        if request:
            ip_address = self.get_client_ip(request) or '127.0.0.1'
            user_agent = request.META.get('HTTP_USER_AGENT', '')

        SecurityEvent.objects.create(
            event_type='user_registration',
            severity='low',
            description=f'New employer user registered: {user.email}',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'email': user.email,
                'role': 'employer',
                'registration_type': 'employer_registration',
                'company_name': validated_data["company_name"]
            }
        )
        
        # Create audit log
        AuditLog.objects.create(
            action='user_registration',
            user=user,
            resource_type='User',
            resource_id=str(user.pk),
            description=f'New employer user registered: {user.email}',
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'email': user.email,
                'role': 'employer',
                'registration_type': 'employer_registration'
            }
        )

        # Create welcome notification
        from notifications.models import Notification

        Notification.objects.create(  # type: ignore[attr-defined]
            user=user,
            message=f"Welcome to EduLink KE, {employer_profile.first_name}! We're excited to have you.",
            notification_type="email",
            status="pending",
        )
        # Send email verification
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_url = f"http://localhost:8000/api/auth/verify-email/{uid}/{token}/"
        send_mail(
            "Verify your EduLink account",
            f"Hi {employer_profile.first_name},\n\nPlease verify your email by clicking the link below:\n{verify_url}\n\nThank you for joining EduLink!",
            settings.DEFAULT_FROM_EMAIL,
            [user.email],  # type: ignore[attr-defined]
            fail_silently=False,
        )
        return user

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(email=data["email"], password=data["password"])
        if not user:
            raise serializers.ValidationError(
                "No active account found with the given credentials"
            )

        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated")

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        if user.role == RoleChoices.STUDENT:  # type: ignore[attr-defined]
            try:
                student_profile = user.student_profile  # type: ignore[attr-defined]
                student_profile.last_login_at = timezone.now()
                student_profile.save(update_fields=["last_login_at"])
                
                # Check if student profile is verified (this is the institution verification)
                if not student_profile.is_verified:
                    raise serializers.ValidationError(
                        "Your institution is not yet verified. Please contact your institution administrator."
                    )
            except StudentProfile.DoesNotExist:  # type: ignore[attr-defined]
                # If no student profile exists, that's a data integrity issue
                raise serializers.ValidationError(
                    "Student profile not found. Please contact support."
                )

        return data

    def _get_profile_data(self, user):
        try:
            if user.role == RoleChoices.STUDENT:  # type: ignore[attr-defined]
                profile = user.student_profile  # type: ignore[attr-defined]
            elif user.role == RoleChoices.INSTITUTION_ADMIN:  # type: ignore[attr-defined]
                profile = user.institution_profile  # type: ignore[attr-defined]
            elif user.role == RoleChoices.EMPLOYER:  # type: ignore[attr-defined]
                profile = user.employer_profile  # type: ignore[attr-defined]
            else:
                profile = None

            if profile:
                return {
                    "first_name": profile.first_name,
                    "last_name": profile.last_name,
                }
        except (
            AttributeError,
            StudentProfile.DoesNotExist,  # type: ignore[attr-defined]
            InstitutionProfile.DoesNotExist,  # type: ignore[attr-defined]
            EmployerProfile.DoesNotExist,  # type: ignore[attr-defined]
        ):
            pass
        return {"first_name": None, "last_name": None}


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Get request from context for IP address
        request = self.context.get('request')
        ip_address = self.get_client_ip(request) if request else '127.0.0.1'
        
        try:
            data = super().validate(attrs)
            user = self.user
            
            # Check if email is verified
            if not user.is_email_verified:  # type: ignore[attr-defined]
                raise serializers.ValidationError(
                    "Please verify your email address before logging in. Check your email for a verification link."
                )
            
            # Update last login for user
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            
            # Update last_login_at in profile if exists
            profile = getattr(user, 'studentprofile', None) or \
                     getattr(user, 'institutionprofile', None) or \
                     getattr(user, 'employerprofile', None)
            
            if profile:
                profile.last_login_at = timezone.now()
                profile.save(update_fields=['last_login_at'])
                
                # Check if student profile is verified (this is the institution verification)
                if user.role == RoleChoices.STUDENT and not profile.is_verified:  # type: ignore[attr-defined]
                    raise serializers.ValidationError(
                        "Your institution is not yet verified. Please contact your institution administrator."
                    )

            # Add custom claims
            refresh = self.get_token(user)
            data['refresh'] = str(refresh)
            data['access'] = str(refresh.access_token)
            data['user'] = {
                'email': user.email,
                'role': user.role,
                'profile': {
                    'first_name': profile.first_name if profile else None,
                    'last_name': profile.last_name if profile else None,
                }
            }
            
            # Log successful login security event
            if request:
                SecurityEvent.objects.create(
                    event_type='login_success',
                    user=user,
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    description=f'Successful login for user {user.email}',
                    metadata={'email': user.email}
                )
                
                # Create user session record
                session_key = request.session.session_key
                if not session_key:
                    # Generate a unique session key if none exists
                    import uuid
                    session_key = str(uuid.uuid4())
                    
                UserSession.objects.create(
                    user=user,
                    session_key=session_key,
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
            
            return data
            
        except Exception as e:
            # Log failed login attempt
            if request and 'email' in attrs:
                FailedLoginAttempt.objects.create(
                    email=attrs['email'],
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    reason='invalid_credentials'
                )
                
                SecurityEvent.objects.create(
                    event_type='login_failed',
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    description=f"Login failed for {attrs['email']}: {str(e)}",
                    metadata={'email': attrs['email'], 'reason': str(e)}
                )
            
            raise e
    
    def get_client_ip(self, request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    reset_url_template = serializers.CharField(write_only=True, required=False)

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():  # type: ignore[attr-defined]
            raise serializers.ValidationError("No user found with this email address.")
        return value

    def save(self):
        user = User.objects.get(email=self.validated_data["email"])  # type: ignore[attr-defined]
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Use the provided template or a default from settings
        url_template = self.validated_data.get(  # type: ignore[attr-defined]
            "reset_url_template",
            getattr(
                settings,
                "PASSWORD_RESET_URL_TEMPLATE",
                "http://localhost:3000/reset-password/{uid}/{token}/",
            ),
        )
        reset_url = url_template.format(uid=uid, token=token)

        # Get request context for logging with enhanced IP detection
        request = self.context.get('request')
        ip_address, ip_metadata = self.get_ip_with_metadata(request)
        user_agent = ''
        if request:
            user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Log password reset request security event
        metadata = {
            'email': user.email,
            'reset_method': 'email_link',
            'ip_detection': ip_metadata
        }
        SecurityEvent.objects.create(
            event_type='password_reset_request',
            severity='medium',
            description=f'Password reset requested for user {user.email}',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )

        # Create audit log
        AuditLog.objects.create(
            action='password_reset_request',
            user=user,
            resource_type='User',
            resource_id=str(user.pk),
            description=f'Password reset requested for user {user.email}',
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'email': user.email,
                'reset_method': 'email_link'
            }
        )

        send_mail(
            subject="Password Reset Request",
            message=f"Click the following link to reset your password: {reset_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],  # type: ignore[attr-defined]
        )

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True, validators=[validate_password]
    )

    def validate(self, attrs):
        try:
            uid = force_str(urlsafe_base64_decode(attrs["uidb64"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):  # type: ignore[attr-defined]
            raise serializers.ValidationError("Invalid reset link.")

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError("Invalid or expired token.")

        self.user = user
        return attrs

    def save(self):
        # Get request context for logging
        request = self.context.get('request')
        ip_address = '127.0.0.1'  # Default IP address
        user_agent = ''
        if request:
            ip_address = self.get_client_ip(request) or '127.0.0.1'
            user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Log password reset confirmation security event
        SecurityEvent.objects.create(
            event_type='password_reset_confirm',
            severity='medium',
            description=f'Password reset completed for user {self.user.email}',
            user=self.user,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'email': self.user.email,
                'reset_method': 'email_link'
            }
        )

        # Create audit log
        AuditLog.objects.create(
            action='password_reset_confirm',
            user=self.user,
            resource_type='User',
            resource_id=str(self.user.pk),
            description=f'Password reset completed for user {self.user.email}',
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'email': self.user.email,
                'reset_method': 'email_link'
            }
        )

        self.user.set_password(self.validated_data["new_password"])  # type: ignore[index]
        self.user.save()

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        write_only=True, validators=[validate_password]
    )

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])  # type: ignore[index]
        user.save()
        return user


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError("The two password fields didn't match.")
        return data


class InviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invite
        fields = ["email", "role"]

    def validate_role(self, value):
        if value == RoleChoices.STUDENT:
            raise serializers.ValidationError(
                "Cannot invite Students. They must self-register."
            )
        return value

    def create(self, validated_data):
        invite = Invite.objects.create(**validated_data)  # type: ignore[attr-defined]
        invite_link = (
            f"http://localhost:8000/api/auth/invite-register?token={invite.token}"
        )
        
        # Log invite creation security event
        request = self.context.get('request')
        ip_address = '127.0.0.1'  # Default IP address
        user_agent = ''
        created_by = None
        if request:
            ip_address = self.get_client_ip(request) or '127.0.0.1'
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            created_by = request.user if request.user.is_authenticated else None

        SecurityEvent.objects.create(
            event_type='invite_created',
            severity='low',
            description=f'Invite created for {invite.email} with role {invite.role}',
            user=created_by,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'invite_email': invite.email,
                'invite_role': invite.role,
                'invite_token': str(invite.token)
            }
        )
        
        # Create audit log
        AuditLog.objects.create(
            action='invite_created',
            user=created_by,
            resource_type='Invite',
            resource_id=str(invite.pk),
            description=f'Invite created for {invite.email} with role {invite.role}',
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'invite_email': invite.email,
                'invite_role': invite.role
            }
        )
        
        send_mail(
            subject="You're invited to join EduLink KE",
            message=f"Click the following link to register: {invite_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invite.email],
        )
        return invite
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class InvitedUserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    invite_token = serializers.UUIDField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "phone_number",
            "national_id",
            "invite_token",
        ]

    def validate(self, attrs):
        try:
            invite = Invite.objects.get(token=attrs["invite_token"], is_used=False)  # type: ignore[attr-defined]
        except Invite.DoesNotExist:  # type: ignore[attr-defined]
            raise serializers.ValidationError(
                {"invite_token": "Invalid or already used token."}
            )

        if invite.email.lower() != attrs["email"].lower():  # type: ignore[attr-defined, index]
            raise serializers.ValidationError({"email": "Email does not match invite."})

        if invite.role == RoleChoices.STUDENT:
            raise serializers.ValidationError(
                {"invite_token": "Students must use the public registration endpoint."}
            )

        self.context["invite"] = invite
        return attrs

    def create(self, validated_data):
        invite = self.context["invite"]
        validated_data["role"] = invite.role
        validated_data.pop("invite_token", None)
        user = User.objects.create_user(**validated_data)  # type: ignore[attr-defined]
        
        # Log invite usage security event
        request = self.context.get('request')
        ip_address = '127.0.0.1'  # Default IP address
        user_agent = ''
        if request:
            ip_address = self.get_client_ip(request) or '127.0.0.1'
            user_agent = request.META.get('HTTP_USER_AGENT', '')

        SecurityEvent.objects.create(
            event_type='invite_used',
            severity='low',
            description=f'Invite used for registration by {user.email}',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'invite_email': invite.email,
                'invite_role': invite.role,
                'invite_token': str(invite.token),
                'registration_email': user.email
            }
        )
        
        # Create audit log
        AuditLog.objects.create(
            action='invite_used',
            user=user,
            resource_type='Invite',
            resource_id=str(invite.pk),
            description=f'Invite used for registration by {user.email}',
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'invite_email': invite.email,
                'invite_role': invite.role,
                'registration_email': user.email
            }
        )
        
        invite.is_used = True
        invite.save()
        return user
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    invite_token = serializers.UUIDField(required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "phone_number",
            "national_id",
            "invite_token",
        ]

    def validate(self, attrs):
        invite_token = attrs.get("invite_token", None)  # type: ignore[attr-defined]
        if invite_token:
            try:
                invite = Invite.objects.get(token=invite_token, is_used=False)  # type: ignore[attr-defined]
            except Invite.DoesNotExist:  # type: ignore[attr-defined]
                raise serializers.ValidationError(
                    {"invite_token": "Invalid or used invite token."}
                )

            if invite.email.lower() != attrs["email"].lower():  # type: ignore[attr-defined, index]
                raise serializers.ValidationError(
                    {"email": "Email does not match invite."}
                )

            attrs["role"] = invite.role
            self.context["invite"] = invite
        else:
            attrs["role"] = RoleChoices.STUDENT
        return attrs

    def create(self, validated_data):
        invite = self.context.get("invite", None)
        validated_data.pop("invite_token", None)
        user = User.objects.create_user(**validated_data)  # type: ignore[attr-defined]
        
        # Log registration security event
        request = self.context.get('request')
        ip_address = '127.0.0.1'  # Default IP address
        user_agent = ''
        if request:
            ip_address = self.get_client_ip(request) or '127.0.0.1'
            user_agent = request.META.get('HTTP_USER_AGENT', '')

        if invite:
            # Log invite-based registration
            SecurityEvent.objects.create(
                event_type='invite_registration',
                severity='low',
                description=f'User registered via invite: {user.email}',
                user=user,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    'invite_email': invite.email,
                    'invite_role': invite.role,
                    'registration_email': user.email,
                    'registration_type': 'invite_based'
                }
            )
            
            # Create audit log
            AuditLog.objects.create(
                action='invite_registration',
                user=user,
                resource_type='User',
                resource_id=str(user.pk),
                description=f'User registered via invite: {user.email}',
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    'invite_email': invite.email,
                    'invite_role': invite.role,
                    'registration_type': 'invite_based'
                }
            )
            
            invite.is_used = True
            invite.save()
        else:
            # Log regular registration
            SecurityEvent.objects.create(
                event_type='user_registration',
                severity='low',
                description=f'User registered: {user.email}',
                user=user,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    'email': user.email,
                    'role': user.role,
                    'registration_type': 'regular'
                }
            )
            
            # Create audit log
            AuditLog.objects.create(
                action='user_registration',
                user=user,
                resource_type='User',
                resource_id=str(user.pk),
                description=f'User registered: {user.email}',
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    'email': user.email,
                    'role': user.role,
                    'registration_type': 'regular'
                }
            )
        
        return user
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class TwoFALoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(email=data["email"], password=data["password"])
        if not user:
            # Log failed 2FA login attempt
            request = self.context.get('request')
            ip_address = '127.0.0.1'  # Default IP address
            user_agent = ''
            if request:
                ip_address = self.get_client_ip(request) or '127.0.0.1'
                user_agent = request.META.get('HTTP_USER_AGENT', '')

            SecurityEvent.objects.create(
                event_type='2fa_login_failed',
                severity='medium',
                description=f'Failed 2FA login attempt for email {data["email"]} - invalid credentials',
                user=None,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    'email': data["email"],
                    'failure_reason': 'invalid_credentials'
                }
            )
            raise serializers.ValidationError("Invalid credentials")

        otp = f"{random.randint(100000, 999999)}"
        EmailOTP.objects.create(email=data["email"], code=otp)  # type: ignore[attr-defined]

        # Log OTP generation security event
        request = self.context.get('request')
        ip_address = '127.0.0.1'  # Default IP address
        user_agent = ''
        if request:
            ip_address = self.get_client_ip(request) or '127.0.0.1'
            user_agent = request.META.get('HTTP_USER_AGENT', '')

        SecurityEvent.objects.create(
            event_type='2fa_otp_generated',
            severity='low',
            description=f'2FA OTP generated for user {user.email}',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'email': user.email,
                'otp_method': 'email'
            }
        )

        send_mail(
            subject="Your EduLink 2FA Code",
            message=f"Your OTP is {otp}. It expires in 5 minutes.",
            from_email=None,
            recipient_list=[data["email"]],
        )

        return data

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)

    def validate(self, data):
        request = self.context.get('request')
        ip_address = '127.0.0.1'  # Default IP address
        user_agent = ''
        if request:
            ip_address = self.get_client_ip(request) or '127.0.0.1'
            user_agent = request.META.get('HTTP_USER_AGENT', '')

        try:
            otp_entry = EmailOTP.objects.filter(
                email=data["email"], code=data["code"]
            ).latest(
                "created_at"
            )  # type: ignore[attr-defined]
        except EmailOTP.DoesNotExist:  # type: ignore[attr-defined]
            # Log failed OTP verification - invalid code
            SecurityEvent.objects.create(
                event_type='2fa_verify_failed',
                severity='medium',
                description=f'Failed 2FA verification for email {data["email"]} - invalid OTP',
                user=None,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    'email': data["email"],
                    'failure_reason': 'invalid_otp'
                }
            )
            raise serializers.ValidationError("Invalid OTP")

        if otp_entry.is_expired():
            # Log failed OTP verification - expired code
            SecurityEvent.objects.create(
                event_type='2fa_verify_failed',
                severity='medium',
                description=f'Failed 2FA verification for email {data["email"]} - expired OTP',
                user=None,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    'email': data["email"],
                    'failure_reason': 'expired_otp'
                }
            )
            raise serializers.ValidationError("OTP expired")

        user = User.objects.get(email=data["email"])  # type: ignore[attr-defined]
        
        # Log successful 2FA verification
        SecurityEvent.objects.create(
            event_type='2fa_verify_success',
            severity='low',
            description=f'Successful 2FA verification for user {user.email}',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                'email': user.email,
                'verification_method': 'email_otp'
            }
        )

        return {
            "refresh": str(RefreshToken.for_user(user)),
            "access": str(RefreshToken.for_user(user).access_token),  # type: ignore[attr-defined]
        }

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
