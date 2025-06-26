from rest_framework import serializers
from .models import User, Invite, EmailOTP
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
from django.utils import timezone
from django.db import transaction
import uuid
import random
from users.roles import RoleChoices
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from security.models import SecurityLog
from rest_framework_simplejwt.views import TokenBlacklistView
from rest_framework.permissions import AllowAny


def validate_unique_email(value):
    User = get_user_model()
    if User.objects.filter(email__iexact=value).exists():
        raise serializers.ValidationError("A user with this email already exists.")

def validate_unique_phone_number(value):
    if not value:
        return
    if StudentProfile.objects.filter(phone_number=value).exists() or \
       InstitutionProfile.objects.filter(phone_number=value).exists() or \
       EmployerProfile.objects.filter(phone_number=value).exists():
        raise serializers.ValidationError("A user with this phone number already exists.")


class BaseProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=20, validators=[validate_unique_phone_number])
    email = serializers.EmailField(validators=[validate_unique_email])
    password = serializers.CharField(write_only=True, validators=[validate_password])


class StudentRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField(validators=[validate_unique_email])
    password = serializers.CharField(write_only=True, validators=[validate_password])
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=20, validators=[validate_unique_phone_number])
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
        
        # Create user with role and inactive status
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            role='student',  # Set the role directly on the user
            is_active=False  # User is inactive until email is verified
        )
        
        # Create StudentProfile
        StudentProfile.objects.create(
            user=user,
            **profile_data
        )
        
        # Send verification email
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verification_link = f"http://localhost:8000/api/auth/verify-email/{uid}/{token}/"
        send_mail(
            subject="Verify your email",
            message=f"Click the link to verify your email: {verification_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
        )
        
        return user


class InstitutionRegistrationSerializer(BaseProfileSerializer):
    institution_name = serializers.CharField(max_length=255)
    institution_type = serializers.CharField(max_length=100)
    registration_number = serializers.CharField(max_length=100)
    address = serializers.CharField(max_length=255)
    website = serializers.URLField(required=False)
    position = serializers.CharField(max_length=100, required=False)
    national_id = serializers.CharField(max_length=20)

    @transaction.atomic
    def create(self, validated_data):
        # Extract profile data
        phone_number = validated_data.pop('phone_number', None)
        if not phone_number:
            raise serializers.ValidationError({'phone_number': 'Phone number is required.'})
        profile_data = {
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'phone_number': phone_number,
            'position': validated_data.pop('position', None),
        }
        
        # Create user with correct role
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            role='institution_admin',  # Set the correct role
            national_id=validated_data.pop('national_id')  # Save national_id to user
        )
        
        # Create Institution
        institution = Institution.objects.create(
            name=validated_data['institution_name'],
            institution_type=validated_data['institution_type'],
            registration_number=validated_data['registration_number'],
            email=validated_data['email'],
            phone_number=phone_number,
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
    national_id = serializers.CharField(max_length=20)

    @transaction.atomic
    def create(self, validated_data):
        # Extract profile data
        phone_number = validated_data.pop('phone_number', None)
        if not phone_number:
            raise serializers.ValidationError({'phone_number': 'Phone number is required.'})

        # Create user with correct role
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            role='employer',  # Set the correct role
            national_id=validated_data.pop('national_id')  # Save national_id to user
        )

        # Create EmployerProfile
        employer_profile = EmployerProfile.objects.create(
            user=user,
            first_name=validated_data.pop('first_name'),
            last_name=validated_data.pop('last_name'),
            phone_number=phone_number,
            company_name=validated_data.pop('company_name'),
            industry=validated_data.pop('industry'),
            company_size=validated_data.pop('company_size'),
            location=validated_data.pop('location'),
            website=validated_data.get('website'),
            department=validated_data.pop('department', None),
            position=validated_data.pop('position', None),
        )

        # Create UserRole
        UserRole.objects.create(
            user=user,
            role='employer',
            employer=employer_profile
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
            
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
            
        if user.role == RoleChoices.STUDENT:
            try:
                student_profile = user.student_profile
                student_profile.last_login_at = timezone.now()
                student_profile.save(update_fields=['last_login_at'])
                
                if not student_profile.is_verified:
                    raise serializers.ValidationError("Your institution is not yet verified.")
            except StudentProfile.DoesNotExist:
                pass
            
        profile_data = self._get_profile_data(user)
            
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'email': user.email,
                'role': user.role,
                'profile': profile_data
            }
        }

    def _get_profile_data(self, user):
        profile = None
        try:
            if user.role == RoleChoices.STUDENT:
                profile = user.student_profile
            elif user.role == RoleChoices.INSTITUTION_ADMIN:
                profile = user.institutionprofile_profile
            elif user.role == RoleChoices.EMPLOYER:
                profile = user.employerprofile_profile
            
            if profile:
                return {'first_name': profile.first_name, 'last_name': profile.last_name}
        except (AttributeError, StudentProfile.DoesNotExist, InstitutionProfile.DoesNotExist, EmployerProfile.DoesNotExist):
            pass
        return {'first_name': None, 'last_name': None}


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        if user.role == RoleChoices.STUDENT:
            try:
                student_profile = user.student_profile
                student_profile.last_login_at = timezone.now()
                student_profile.save(update_fields=['last_login_at'])
            except StudentProfile.DoesNotExist:
                pass

        profile_data = self._get_profile_data(user)

        refresh = self.get_token(user)
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        data['user'] = {
            'email': user.email,
            'role': user.role,
            'profile': profile_data
        }
        
        return data

    def _get_profile_data(self, user):
        profile = None
        try:
            if user.role == RoleChoices.STUDENT:
                profile = user.student_profile
            elif user.role == RoleChoices.INSTITUTION_ADMIN:
                profile = user.institutionprofile_profile
            elif user.role == RoleChoices.EMPLOYER:
                profile = user.employerprofile_profile

            if profile:
                return {'first_name': profile.first_name, 'last_name': profile.last_name}
        except (AttributeError, StudentProfile.DoesNotExist, InstitutionProfile.DoesNotExist, EmployerProfile.DoesNotExist):
            pass
        return {'first_name': None, 'last_name': None}


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    reset_url_template = serializers.CharField(write_only=True, required=False)

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user with this email.")
        return value

    def save(self):
        user = User.objects.get(email=self.validated_data['email'])
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Use the provided template or a default from settings
        url_template = self.validated_data.get(
            'reset_url_template',
            getattr(settings, 'PASSWORD_RESET_URL_TEMPLATE', 'http://localhost:3000/reset-password/{uid}/{token}/')
        )
        reset_url = url_template.format(uid=uid, token=token)

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


class InviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invite
        fields = ['email', 'role']
        

    def validate_role(self, value):
        if value == RoleChoices.STUDENT:
            raise serializers.ValidationError("Cannot invite Students. They must self-register.")
        return value

    def create(self, validated_data):
        invite = Invite.objects.create(**validated_data)
        invite_link = f"http://localhost:8000/api/auth/invite-register?token={invite.token}"
        send_mail(
            subject="You're invited to join EduLink KE",
            message=f"You've been invited to register as a {invite.role}.\n\nUse this link to register:\n{invite_link}",
            from_email="noreply@edulink.com",
            recipient_list=[invite.email],
            fail_silently=False,
        )
        return invite


class InvitedUserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    invite_token = serializers.UUIDField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'institution', 'phone_number', 'national_id', 'invite_token']

    def validate(self, attrs):
        try:
            invite = Invite.objects.get(token=attrs['invite_token'], is_used=False)
        except Invite.DoesNotExist:
            raise serializers.ValidationError({'invite_token': 'Invalid or already used token.'})

        if invite.email.lower() != attrs['email'].lower():
            raise serializers.ValidationError({'email': 'Email does not match invite.'})

        if invite.role == RoleChoices.STUDENT:
            raise serializers.ValidationError({'invite_token': 'Students must use the public registration endpoint.'})

        self.context['invite'] = invite
        return attrs

    def create(self, validated_data):
        invite = self.context['invite']
        validated_data['role'] = invite.role
        validated_data.pop('invite_token', None)
        user = User.objects.create_user(**validated_data)
        invite.is_used = True
        invite.save()
        return user


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    invite_token = serializers.UUIDField(required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'password',
            'institution', 'phone_number', 'national_id',
            'invite_token',
        ]

    def validate(self, attrs):
        invite_token = attrs.get('invite_token', None)
        if invite_token:
            try:
                invite = Invite.objects.get(token=invite_token, is_used=False)
            except Invite.DoesNotExist:
                raise serializers.ValidationError({'invite_token': 'Invalid or used invite token.'})

            if invite.email.lower() != attrs['email'].lower():
                raise serializers.ValidationError({'email': 'Email does not match invite.'})

            attrs['role'] = invite.role
            self.context['invite'] = invite
        else:
            attrs['role'] = RoleChoices.STUDENT
        return attrs

    def create(self, validated_data):
        invite = self.context.get('invite', None)
        validated_data.pop('invite_token', None)
        user = User.objects.create_user(**validated_data)
        if invite:
            invite.is_used = True
            invite.save()
        return user


class TwoFALoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Invalid credentials")

        otp = f"{random.randint(100000, 999999)}"
        EmailOTP.objects.create(email=data['email'], code=otp)

        send_mail(
            subject="Your EduLink 2FA Code",
            message=f"Your OTP is {otp}. It expires in 5 minutes.",
            from_email=None,
            recipient_list=[data['email']],
        )

        return {"detail": "OTP sent to your email"}


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)

    def validate(self, data):
        try:
            otp_entry = EmailOTP.objects.filter(email=data['email'], code=data['code']).latest('created_at')
        except EmailOTP.DoesNotExist:
            raise serializers.ValidationError("Invalid OTP")

        if otp_entry.is_expired():
            raise serializers.ValidationError("OTP expired")

        user = User.objects.get(email=data['email'])
        return {
            "refresh": str(RefreshToken.for_user(user)),
            "access": str(RefreshToken.for_user(user).access_token),
        }


class CustomLogoutView(TokenBlacklistView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        # Try to get user from request if authenticated, else log as None
        user = request.user if request.user.is_authenticated else None
        SecurityLog.objects.create(
            user=user,
            action="LOGOUT",
            description="User logged out and token blacklisted.",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return response
