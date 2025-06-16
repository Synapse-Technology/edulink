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
from users.models import UserRole, StudentProfile
from institutions.models import Institution
from django.utils import timezone


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    admission_number = serializers.CharField(required=True)
    academic_year = serializers.IntegerField(required=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'institution', 'phone_number', 'national_id', 
                 'first_name', 'last_name', 'admission_number', 'academic_year']

    def create(self, validated_data):
        # Extract profile data
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        admission_number = validated_data.pop('admission_number')
        academic_year = validated_data.pop('academic_year')
        institution_name = validated_data.get('institution')
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        # Create UserRole for student
        UserRole.objects.create(
            user=user,
            role='student'
        )
        
        # Check if institution exists and is verified
        try:
            institution = Institution.objects.get(name=institution_name)
            is_verified = institution.is_verified
        except Institution.DoesNotExist:
            is_verified = False
            institution = None
        
        # Create StudentProfile
        StudentProfile.objects.create(
            user=user,
            first_name=first_name,
            last_name=last_name,
            phone_number=validated_data.get('phone_number', ''),
            national_id=validated_data.get('national_id', ''),
            admission_number=admission_number,
            academic_year=academic_year,
            institution=institution,
            is_verified=is_verified,
            institution_name=institution_name
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
                'institution': user.institution,
                'phone_number': user.phone_number
            }
        }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        
        # Update last login for user
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Update student profile if it exists
        try:
            student_profile = user.studentprofile
            student_profile.last_login_at = timezone.now()
            student_profile.save(update_fields=['last_login_at'])
        except StudentProfile.DoesNotExist:
            pass

        # Add custom claims
        refresh = self.get_token(user)
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        data['user'] = {
            'email': user.email,
            'role': user.role,
            'institution': user.institution,
            'phone_number': user.phone_number
        }
        
        return data


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
