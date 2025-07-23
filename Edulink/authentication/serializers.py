from rest_framework import serializers
from .models import User
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str, force_bytes, smart_str, smart_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings
from users.models import UserRole, StudentProfile, InstitutionProfile, EmployerProfile
from institutions.models import Institution
from employers.models import Employer
from django.utils import timezone
from django.db import transaction
from security.models import SecurityEvent, FailedLoginAttempt, UserSession
from security.utils import ThreatDetector


class BaseProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])


class StudentRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=20)
    national_id = serializers.CharField(max_length=20)
    registration_number = serializers.CharField(max_length=50)
    academic_year = serializers.IntegerField()
    institution_name = serializers.CharField(max_length=255)
    course_code = serializers.CharField(max_length=50, required=False)

    def validate(self, data):
        # Validate institution exists and is verified
        try:
            institution = Institution.objects.get(name=data['institution_name'])
            if not institution.is_verified:
                raise serializers.ValidationError("The specified institution is not verified yet.")
            data['institution'] = institution
        except Institution.DoesNotExist:
            raise serializers.ValidationError("The specified institution does not exist.")
        
        # Validate course if provided
        if 'course_code' in data:
            try:
                course = institution.courses.get(code=data['course_code'])
                data['course'] = course
            except:
                raise serializers.ValidationError("Invalid course code for the specified institution.")
        
        # Validate unique fields
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
        if StudentProfile.objects.filter(national_id=data['national_id']).exists():
            raise serializers.ValidationError("A student with this national ID already exists.")
        
        if StudentProfile.objects.filter(registration_number=data['registration_number']).exists():
            raise serializers.ValidationError("A student with this registration number already exists.")
        
        return data

    @transaction.atomic
    def create(self, validated_data):
        # Extract profile data
        academic_year = validated_data.pop('academic_year')
        profile_data = {
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'phone_number': validated_data.pop('phone_number'),
            'national_id': validated_data.pop('national_id'),
            'registration_number': validated_data.pop('registration_number'),
            'academic_year': academic_year,
            'institution': validated_data.pop('institution'),
            'course': validated_data.get('course'),
            'year_of_study': academic_year,
        }
        
        # Create user with role
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            role='student'  # Set the role directly on the user
        )
        
        # Create StudentProfile
        StudentProfile.objects.create(
            user=user,
            **profile_data
        )
        
        return user


class InstitutionRegistrationSerializer(BaseProfileSerializer):
    institution_name = serializers.CharField(max_length=255)
    institution_type = serializers.CharField(max_length=100)
    registration_number = serializers.CharField(max_length=100)
    address = serializers.CharField(max_length=255)
    website = serializers.URLField(required=False)
    position = serializers.CharField(max_length=100, required=False)

    @transaction.atomic
    def create(self, validated_data):
        # Extract profile data
        profile_data = {
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'phone_number': validated_data.pop('phone_number'),
            'position': validated_data.pop('position', None),
        }
        
        # Create user
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        # Create Institution
        institution = Institution.objects.create(
            name=validated_data['institution_name'],
            institution_type=validated_data['institution_type'],
            registration_number=validated_data['registration_number'],
            email=validated_data['email'],
            phone_number=validated_data['phone_number'],
            address=validated_data['address'],
            website=validated_data.get('website')
        )
        
        # Create UserRole
        UserRole.objects.create(
            user=user,
            role='institution_admin',
            institution=institution
        )
        
        # Create InstitutionProfile
        InstitutionProfile.objects.create(
            user=user,
            institution=institution,
            **profile_data
        )
        
        return user


class EmployerRegistrationSerializer(BaseProfileSerializer):
    company_name = serializers.CharField(max_length=255)
    industry = serializers.CharField(max_length=100)
    company_size = serializers.CharField(max_length=50)
    location = serializers.CharField(max_length=255)
    website = serializers.URLField(required=False)
    department = serializers.CharField(max_length=100, required=False)
    position = serializers.CharField(max_length=100, required=False)

    @transaction.atomic
    def create(self, validated_data):
        # Extract profile data
        profile_data = {
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'phone_number': validated_data.pop('phone_number'),
            'department': validated_data.pop('department', None),
            'position': validated_data.pop('position', None),
        }
        
        # Create user
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        # Create Employer
        employer = Employer.objects.create(
            user=user,
            company_name=validated_data['company_name'],
            industry=validated_data['industry'],
            company_size=validated_data['company_size'],
            contact_email=validated_data['email'],
            location=validated_data['location'],
            website=validated_data.get('website')
        )
        
        # Create UserRole
        UserRole.objects.create(
            user=user,
            role='employer',
            employer=employer
        )
        
        # Create EmployerProfile
        EmployerProfile.objects.create(
            user=user,
            employer=employer,
            **profile_data
        )
        
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError("No active account found with the given credentials")
            
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated")
            
        # Update last login for user
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
            
        # Check if user's institution is verified and update last_login_at
        try:
            student_profile = user.studentprofile
            student_profile.last_login_at = timezone.now()
            student_profile.save(update_fields=['last_login_at'])
            
            if not student_profile.is_verified:
                raise serializers.ValidationError("Your institution is not yet verified. Please wait for verification to access your dashboard.")
        except StudentProfile.DoesNotExist:
            # If no student profile exists, we still allow login but with a warning
            pass
            
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'email': user.email,
                'role': user.role,
                'profile': {
                    'first_name': user.profile.first_name if user.profile else None,
                    'last_name': user.profile.last_name if user.profile else None,
                }
            }
        }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Get request from context for IP address
        request = self.context.get('request')
        ip_address = self.get_client_ip(request) if request else None
        
        try:
            data = super().validate(attrs)
            user = self.user
            
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
                    details={'email': user.email}
                )
                
                # Create user session record
                UserSession.objects.create(
                    user=user,
                    session_key=request.session.session_key or '',
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    login_time=timezone.now()
                )
            
            return data
            
        except Exception as e:
            # Log failed login attempt
            if request and 'email' in attrs:
                FailedLoginAttempt.objects.create(
                    email=attrs['email'],
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    failure_reason=str(e)
                )
                
                SecurityEvent.objects.create(
                    event_type='login_failed',
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    details={'email': attrs['email'], 'reason': str(e)}
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

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user with this email.")
        return value

    def save(self):
        user = User.objects.get(email=self.validated_data['email'])
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        reset_url = f"http://localhost:3000/reset-password/{uid}/{token}/"
        send_mail(
            subject="Password Reset Request",
            message=f"Click the link to reset your password: {reset_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
        )


class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate(self, attrs):
        try:
            uid = smart_str(urlsafe_base64_decode(attrs['uidb64']))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError("Invalid reset link.")

        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError("Invalid or expired token.")

        self.user = user
        return attrs

    def save(self):
        self.user.set_password(self.validated_data['new_password'])
        self.user.save()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("The two password fields didn't match.")
        return data
