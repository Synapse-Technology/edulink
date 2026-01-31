"""
Authentication and user management serializers.
Follows architecture rules: data validation only, no business logic.
"""

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.apps import apps
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer as BaseTokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.settings import api_settings
from django.contrib.auth.models import update_last_login

from .models import User


class UserSerializer(serializers.ModelSerializer):
    employer_id = serializers.SerializerMethodField()
    institution_id = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "role",
            "phone_number",
            "avatar_url",
            "gender",
            "is_email_verified",
            "is_active",
            "date_joined",
            "last_login",
            "employer_id",
            "institution_id",
        ]
        read_only_fields = ["id", "email", "role", "is_email_verified", "date_joined", "last_login", "employer_id", "institution_id"]
        
    def get_employer_id(self, obj):
        from edulink.apps.employers.queries import get_employer_for_user
        employer = get_employer_for_user(obj.id)
        return str(employer.id) if employer else None
            
    def get_institution_id(self, obj):
        try:
            # Institution Admin
            if obj.role == User.ROLE_INSTITUTION_ADMIN:
                from edulink.apps.institutions.queries import get_institution_for_user
                inst = get_institution_for_user(str(obj.id))
                return str(inst.id) if inst else None
            
            # Institution Supervisor
            if obj.role == User.ROLE_SUPERVISOR:
                from edulink.apps.institutions.queries import get_institution_staff_profile
                staff = get_institution_staff_profile(str(obj.id))
                return str(staff.institution.id) if staff else None
                
            return None 
        except Exception:
            return None


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    # Student specific fields
    registration_number = serializers.CharField(required=False, write_only=True, allow_blank=True)
    institution_id = serializers.UUIDField(required=False, write_only=True, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "phone_number",
            "gender",
            "role",
            "registration_number",
            "institution_id",
        ]
    
    def validate(self, attrs):
        """Validate password confirmation."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def validate_email(self, value):
        """Ensure email is unique."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value
    
    def validate_role(self, value):
        """Validate role choice."""
        valid_roles = [choice[0] for choice in User.ROLE_CHOICES]
        if value not in valid_roles:
            raise serializers.ValidationError(f"Invalid role. Valid roles: {valid_roles}")
        return value
    
    def create(self, validated_data):
        """Create user instance."""
        validated_data.pop('password_confirm')  # Remove confirmation field
        return User.objects.create_user(**validated_data)


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for user login.
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change.
    """
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validate new password confirmation."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("New passwords don't match")
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for password reset request.
    """
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for password reset confirmation.
    """
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validate new password confirmation."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("New passwords don't match")
        return attrs


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone_number", "avatar_url", "gender"]
        extra_kwargs = {
            "first_name": {"required": False},
            "last_name": {"required": False},
            "phone_number": {"required": False},
            "avatar_url": {"required": False},
            "gender": {"required": False},
        }


class RoleAssignmentSerializer(serializers.Serializer):
    """
    Serializer for role assignment.
    """
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)
    
    def validate_role(self, value):
        """Validate role choice."""
        valid_roles = [choice[0] for choice in User.ROLE_CHOICES]
        if value not in valid_roles:
            raise serializers.ValidationError(f"Invalid role. Valid roles: {valid_roles}")
        return value


class TokenSerializer(serializers.Serializer):
    """
    Serializer for authentication token response.
    """
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "role",
            "gender",
            "is_active",
            "date_joined",
        ]


# JWT Authentication Serializers
class TokenObtainPairSerializer(BaseTokenObtainPairSerializer):
    """
    Custom token serializer that includes user data in the response.
    Follows architecture rules: data validation only, no business logic.
    """
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Ensure last login is updated for JWT logins
        update_last_login(None, self.user)
        
        # Add user data to the response
        user = self.user
        user_data = {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "gender": user.gender,
            "is_email_verified": user.is_email_verified,
        }
        user_data.update(get_user_trust_info(user))
        data['user'] = user_data
        
        return data
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token["email"] = user.email
        token["username"] = user.username
        token["role"] = user.role
        token["gender"] = user.gender
        token["is_email_verified"] = user.is_email_verified
        
        return token

def get_user_trust_info(user):
    """Helper to fetch trust level and points based on user role."""
    info = {"trustLevel": 0, "trustPoints": 0}
    try:
        if user.role == 'student':
            Student = apps.get_model('students', 'Student')
            profile = Student.objects.filter(user=user).first()
            if profile:
                info["trustLevel"] = profile.trust_level
                info["trustPoints"] = profile.trust_points
        elif user.role in ['employer', 'employer_admin', 'supervisor']:
            Supervisor = apps.get_model('employers', 'Supervisor')
            supervisor = Supervisor.objects.filter(user=user, is_active=True).first()
            if supervisor and supervisor.employer:
                employer = supervisor.employer
                # Fix for "Unverified" anomaly:
                # If employer is ACTIVE but trust_level is 0 (Unverified), treat as Verified (1).
                # This ensures approved employers don't see "Unverified" badge.
                if employer.status == 'ACTIVE' and employer.trust_level == 0:
                    info["trustLevel"] = 1
                else:
                    info["trustLevel"] = employer.trust_level
        elif user.role in ['institution', 'institution_admin']:
            Institution = apps.get_model('institutions', 'Institution')
            # Check for profile or direct link
            if hasattr(user, 'institution_profile'):
                 info["trustLevel"] = user.institution_profile.trust_level
            else:
                 # Fallback check
                 inst = Institution.objects.filter(users=user).first()
                 if inst:
                     info["trustLevel"] = inst.trust_level
    except Exception:
        pass # Fail gracefully
    return info

class TokenRefreshSerializer(serializers.Serializer):
    """
    Custom token refresh serializer that includes user data.
    Follows architecture rules: data validation only, no business logic.
    """
    refresh = serializers.CharField()
    access = serializers.CharField(read_only=True)
    user = serializers.SerializerMethodField(read_only=True)
    
    def validate(self, attrs):
        refresh = RefreshToken(attrs['refresh'])
        
        data = {'access': str(refresh.access_token)}
        
        if api_settings.ROTATE_REFRESH_TOKENS:
            if api_settings.BLACKLIST_AFTER_ROTATION:
                try:
                    # Attempt to blacklist the given refresh token
                    refresh.blacklist()
                except AttributeError:
                    # If blacklist app not installed, ignore
                    pass

            refresh.set_jti()
            refresh.set_exp()
            refresh.set_iat()

            data['refresh'] = str(refresh)
        
        # Add user data
        user_id = refresh.payload.get('user_id')
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                user_data = {
                    'id': str(user.id),
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role,
                    'gender': user.gender,
                    'is_email_verified': user.is_email_verified,
                }
                user_data.update(get_user_trust_info(user))
                data['user'] = user_data
            except User.DoesNotExist:
                pass
        
        return data
    
    def get_user(self, obj):
        return obj.get('user', None)
