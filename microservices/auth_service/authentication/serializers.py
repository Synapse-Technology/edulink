from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import User, EmailOTP, Invite, RoleChoices
import uuid
import random
import string
import requests
from django.conf import settings
from typing import Dict, Any


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    invite_token = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm', 'phone_number', 
            'national_id', 'role', 'invite_token'
        ]
        extra_kwargs = {
            'role': {'required': False},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        
        # Handle invitation-based registration
        invite_token = attrs.get('invite_token')
        if invite_token:
            try:
                invite = Invite.objects.get(token=invite_token, email=attrs['email'])
                if not invite.is_valid():
                    raise serializers.ValidationError("Invalid or expired invitation.")
                attrs['role'] = invite.role
                attrs['_invite'] = invite
            except Invite.DoesNotExist:
                raise serializers.ValidationError("Invalid invitation token.")
        else:
            # Default role for self-registration
            attrs['role'] = attrs.get('role', RoleChoices.STUDENT)
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        invite_token = validated_data.pop('invite_token', None)
        invite = validated_data.pop('_invite', None)
        
        user = User.objects.create_user(**validated_data)
        
        # Mark invite as used if applicable
        if invite:
            invite.use()
        
        return user


class StudentRegistrationSerializer(serializers.Serializer):
    """
    Comprehensive student registration serializer that handles university code 
    and university search methods with institution validation.
    """
    
    # Common fields for all registration methods
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=20)
    national_id = serializers.CharField(max_length=20)
    
    # Registration method selection
    registration_method = serializers.ChoiceField(
        choices=['university_code', 'university_search'],
        required=True
    )
    
    # University code method fields
    university_code = serializers.CharField(max_length=20, required=False)
    year_of_study = serializers.IntegerField(required=False, min_value=1, max_value=8)
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
    
    def validate_email(self, value):
        """Validate email uniqueness."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_phone_number(self, value):
        """Validate phone number uniqueness."""
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return value
    
    def validate(self, data):
        """Validate data based on registration method."""
        # Validate password confirmation
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
        
        # Remove password_confirm from data
        data.pop('password_confirm', None)
        
        # Apply method-specific validation
        registration_method = data.get('registration_method')
        if registration_method == 'university_code':
            return self._validate_university_code_method(data)
        elif registration_method == 'university_search':
            return self._validate_university_search_method(data)
        else:
            raise serializers.ValidationError({
                'registration_method': 'Invalid registration method specified.'
            })
    
    def _validate_university_code_method(self, data):
        """Validate university code registration method."""
        required_fields = ['university_code', 'registration_number', 'year_of_study']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            raise serializers.ValidationError({
                field: 'This field is required for university code registration.'
                for field in missing_fields
            })
        
        # Validate university code with Institution Service
        university_code = data.get('university_code', '').upper()
        institution_data = self._validate_university_code(university_code)
        if not institution_data:
            raise serializers.ValidationError({
                'university_code': 'Invalid or expired university code.'
            })
        
        data['institution_data'] = institution_data
        return data
    
    def _validate_university_search_method(self, data):
        """Validate university search registration method."""
        required_fields = ['institution_name', 'registration_number', 'year_of_study']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            raise serializers.ValidationError({
                field: 'This field is required for university search registration.'
                for field in missing_fields
            })
        
        # Validate institution with Institution Service
        institution_data = self._validate_institution(data['institution_name'])
        if not institution_data:
            raise serializers.ValidationError({
                'institution_name': 'Institution not found or not verified.'
            })
        
        # Validate student with institution's system
        if institution_data.get('has_integration'):
            student_data = self._validate_student_with_institution(
                institution_data['id'], 
                data['registration_number']
            )
            if student_data:
                data['verified_student_data'] = student_data
        
        data['institution_data'] = institution_data
        return data
    
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
    
    def _validate_student_with_institution(self, institution_id: int, registration_number: str) -> Dict[str, Any]:
        """Validate student with institution's system."""
        try:
            institution_service_url = getattr(settings, 'INSTITUTION_SERVICE_URL', 'http://localhost:8003')
            response = requests.post(
                f"{institution_service_url}/api/institutions/{institution_id}/verify-student/",
                json={'registration_number': registration_number},
                timeout=10
            )
            if response.status_code == 200:
                return response.json()
            return None
        except requests.RequestException:
            return None
    
    def create(self, validated_data):
        """Create user and trigger profile creation."""
        # Extract non-user fields
        registration_method = validated_data.pop('registration_method')
        institution_data = validated_data.pop('institution_data')
        verified_student_data = validated_data.pop('verified_student_data', None)
        
        # Extract student-specific fields
        student_fields = {
            'year_of_study': validated_data.pop('year_of_study', None),
            'course': validated_data.pop('course', None),
            'gender': validated_data.pop('gender', None),
            'registration_number': validated_data.pop('registration_number', None),
            'academic_year': validated_data.pop('academic_year', None),
            'course_code': validated_data.pop('course_code', None),
        }
        
        # Create user with student role
        validated_data['role'] = RoleChoices.STUDENT
        user = User.objects.create_user(**validated_data)
        
        # Trigger profile creation via User Service
        self._create_student_profile(user, institution_data, student_fields, verified_student_data)
        
        # Send verification email via Notification Service
        self._send_verification_email(user)
        
        return user
    
    def _create_student_profile(self, user, institution_data, student_fields, verified_student_data):
        """Create student profile via User Service."""
        try:
            user_service_url = getattr(settings, 'USER_SERVICE_URL', 'http://localhost:8002')
            profile_data = {
                'user_id': str(user.id),
                'institution_id': institution_data['id'],
                'institution_name': institution_data['name'],
                **student_fields,
                'verified_data': verified_student_data
            }
            
            response = requests.post(
                f"{user_service_url}/api/profiles/students/",
                json=profile_data,
                timeout=5
            )
            
            if response.status_code != 201:
                # Log error but don't fail registration
                pass
                
        except requests.RequestException:
            # Log error but don't fail registration
            pass
    
    def _send_verification_email(self, user):
        """Send verification email via Notification Service."""
        try:
            notification_service_url = getattr(settings, 'NOTIFICATION_SERVICE_URL', 'http://localhost:8004')
            
            # Generate OTP
            otp = EmailOTP.objects.create(user=user)
            
            response = requests.post(
                f"{notification_service_url}/api/emails/verification/",
                json={
                    'user_id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'otp_code': otp.code
                },
                timeout=5
            )
            
        except requests.RequestException:
            # Log error but don't fail registration
            pass


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer with additional user info."""
    
    def validate(self, attrs):
        # Get user first to check account status
        email = attrs.get('email')
        password = attrs.get('password')
        
        if not email or not password:
            raise serializers.ValidationError('Email and password are required.')
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError('Invalid credentials.')
        
        # Check if account is locked
        if user.is_account_locked():
            raise serializers.ValidationError('Account is temporarily locked due to multiple failed login attempts.')
        
        # Check if account is active
        if not user.is_active:
            raise serializers.ValidationError('Account is deactivated.')
        
        # Authenticate user
        user = authenticate(email=email, password=password)
        if not user:
            # Increment failed login attempts
            try:
                user_obj = User.objects.get(email=email)
                user_obj.increment_failed_login()
            except User.DoesNotExist:
                pass
            raise serializers.ValidationError('Invalid credentials.')
        
        # Reset failed login attempts on successful authentication
        user.reset_failed_login()
        
        # Get tokens
        data = super().validate(attrs)
        
        # Add user info to response
        data.update({
            'user': {
                'id': str(user.id),
                'email': user.email,
                'role': user.role,
                'is_email_verified': user.is_email_verified,
                'two_factor_enabled': user.two_factor_enabled,
                'profile_service_id': str(user.profile_service_id) if user.profile_service_id else None,
            }
        })
        
        return data


class EmailOTPSerializer(serializers.ModelSerializer):
    """Serializer for email OTP operations."""
    
    class Meta:
        model = EmailOTP
        fields = ['email', 'purpose']
    
    def create(self, validated_data):
        # Generate 6-digit OTP
        code = ''.join(random.choices(string.digits, k=6))
        validated_data['code'] = code
        
        # Invalidate previous OTPs for same email and purpose
        EmailOTP.objects.filter(
            email=validated_data['email'],
            purpose=validated_data['purpose'],
            is_used=False
        ).update(is_used=True)
        
        return super().create(validated_data)


class EmailOTPVerificationSerializer(serializers.Serializer):
    """Serializer for OTP verification."""
    
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)
    purpose = serializers.ChoiceField(choices=[
        ('login', 'Login Verification'),
        ('password_reset', 'Password Reset'),
        ('email_verification', 'Email Verification'),
        ('two_factor', 'Two Factor Authentication'),
    ])
    
    def validate(self, attrs):
        try:
            otp = EmailOTP.objects.get(
                email=attrs['email'],
                code=attrs['code'],
                purpose=attrs['purpose']
            )
        except EmailOTP.DoesNotExist:
            raise serializers.ValidationError('Invalid OTP code.')
        
        if not otp.is_valid():
            if otp.is_expired():
                raise serializers.ValidationError('OTP code has expired.')
            elif otp.is_used:
                raise serializers.ValidationError('OTP code has already been used.')
            elif otp.attempts >= 3:
                raise serializers.ValidationError('Too many verification attempts.')
        
        attrs['_otp'] = otp
        return attrs
    
    def save(self):
        otp = self.validated_data['_otp']
        otp.use()
        return otp


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request."""
    
    email = serializers.EmailField()
    
    def validate_email(self, value):
        try:
            user = User.objects.get(email=value, is_active=True)
        except User.DoesNotExist:
            # Don't reveal if email exists or not
            pass
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""
    
    token = serializers.UUIDField()
    password = serializers.CharField(validators=[validate_password])
    password_confirm = serializers.CharField()
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change."""
    
    current_password = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
    new_password_confirm = serializers.CharField()
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("New passwords don't match.")
        return attrs
    
    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class InviteSerializer(serializers.ModelSerializer):
    """Serializer for user invitations."""
    
    class Meta:
        model = Invite
        fields = [
            'id', 'email', 'role', 'token', 'is_used', 'created_at', 
            'expires_at', 'used_at', 'institution_id', 'employer_id', 'metadata'
        ]
        read_only_fields = ['id', 'token', 'is_used', 'created_at', 'used_at']
    
    def create(self, validated_data):
        validated_data['invited_by'] = self.context['request'].user
        return super().create(validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile information."""
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'phone_number', 'national_id', 'role', 
            'is_email_verified', 'two_factor_enabled', 'date_joined',
            'profile_service_id', 'last_login'
        ]
        read_only_fields = [
            'id', 'email', 'role', 'date_joined', 'last_login'
        ]


class TwoFactorSetupSerializer(serializers.Serializer):
    """Serializer for two-factor authentication setup."""
    
    enable = serializers.BooleanField()
    otp_code = serializers.CharField(max_length=6, required=False)
    
    def validate(self, attrs):
        if attrs['enable'] and not attrs.get('otp_code'):
            raise serializers.ValidationError('OTP code is required to enable 2FA.')
        return attrs


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for user list (admin use)."""
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'role', 'is_active', 'is_email_verified',
            'date_joined', 'last_login', 'failed_login_attempts',
            'account_locked_until', 'two_factor_enabled'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class TokenRefreshSerializer(serializers.Serializer):
    """Serializer for token refresh with device tracking."""
    
    refresh = serializers.CharField()
    device_id = serializers.CharField(required=False)
    
    def validate_refresh(self, value):
        from rest_framework_simplejwt.tokens import RefreshToken
        try:
            token = RefreshToken(value)
            return value
        except Exception:
            raise serializers.ValidationError('Invalid refresh token.')