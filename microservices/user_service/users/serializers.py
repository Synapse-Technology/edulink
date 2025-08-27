from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from .models import User, UserSession, UserActivity, UserPreference
from utils.validators import validate_phone_number
from utils.helpers import generate_username_suggestions
import re


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    """
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name',
            'phone_number', 'password', 'password_confirm',
            'language', 'timezone'
        ]
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate_email(self, value):
        """
        Validate email format and uniqueness.
        """
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()
    
    def validate_username(self, value):
        """
        Validate username format and uniqueness.
        """
        if value:
            # Check format
            if not re.match(r'^[a-zA-Z0-9_.-]+$', value):
                raise serializers.ValidationError(
                    "Username can only contain letters, numbers, dots, hyphens, and underscores."
                )
            
            # Check length
            if len(value) < 3:
                raise serializers.ValidationError("Username must be at least 3 characters long.")
            
            # Check uniqueness
            if User.objects.filter(username__iexact=value).exists():
                raise serializers.ValidationError("A user with this username already exists.")
        
        return value.lower() if value else None
    
    def validate_first_name(self, value):
        """
        Validate first name.
        """
        if len(value.strip()) < 2:
            raise serializers.ValidationError("First name must be at least 2 characters long.")
        return value.strip().title()
    
    def validate_last_name(self, value):
        """
        Validate last name.
        """
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Last name must be at least 2 characters long.")
        return value.strip().title()
    
    def validate_phone_number(self, value):
        """
        Validate phone number.
        """
        if value:
            try:
                validate_phone_number(value)
            except DjangoValidationError as e:
                raise serializers.ValidationError(str(e))
        return value
    
    def validate(self, attrs):
        """
        Validate password confirmation.
        """
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Password confirmation doesn't match."
            })
        
        # Generate username if not provided
        if not attrs.get('username'):
            suggestions = generate_username_suggestions(
                attrs['first_name'], 
                attrs['last_name']
            )
            
            # Find first available username
            for suggestion in suggestions:
                if not User.objects.filter(username__iexact=suggestion).exists():
                    attrs['username'] = suggestion
                    break
        
        return attrs
    
    def create(self, validated_data):
        """
        Create new user.
        """
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for user login.
    """
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})
    remember_me = serializers.BooleanField(default=False)
    
    def validate(self, attrs):
        """
        Validate login credentials.
        """
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            # Check if user exists
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                raise serializers.ValidationError("Invalid email or password.")
            
            # Check if account is locked
            if user.is_account_locked():
                raise serializers.ValidationError(
                    "Account is temporarily locked due to multiple failed login attempts."
                )
            
            # Check if account is active
            if not user.is_active:
                raise serializers.ValidationError("Account is deactivated.")
            
            # Authenticate user
            user = authenticate(email=email, password=password)
            if not user:
                # Increment failed login attempts
                try:
                    user = User.objects.get(email__iexact=email)
                    user.increment_failed_login()
                except User.DoesNotExist:
                    pass
                
                raise serializers.ValidationError("Invalid email or password.")
            
            # Reset failed login attempts on successful login
            user.reset_failed_login()
            attrs['user'] = user
        else:
            raise serializers.ValidationError("Must include email and password.")
        
        return attrs


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user details.
    """
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    initials = serializers.CharField(source='get_initials', read_only=True)
    active_roles = serializers.ListField(source='get_active_roles', read_only=True)
    permissions = serializers.ListField(source='get_permissions', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'initials', 'phone_number', 'avatar', 'bio',
            'language', 'timezone', 'profile_visibility',
            'email_notifications', 'sms_notifications', 'push_notifications',
            'is_active', 'is_verified', 'is_staff', 'two_factor_enabled',
            'date_joined', 'last_login', 'email_verified_at',
            'active_roles', 'permissions'
        ]
        read_only_fields = [
            'id', 'is_staff', 'date_joined', 'last_login', 
            'email_verified_at', 'full_name', 'initials',
            'active_roles', 'permissions'
        ]


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile.
    """
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone_number', 'avatar', 'bio',
            'language', 'timezone', 'profile_visibility',
            'email_notifications', 'sms_notifications', 'push_notifications'
        ]
    
    def validate_first_name(self, value):
        """
        Validate first name.
        """
        if len(value.strip()) < 2:
            raise serializers.ValidationError("First name must be at least 2 characters long.")
        return value.strip().title()
    
    def validate_last_name(self, value):
        """
        Validate last name.
        """
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Last name must be at least 2 characters long.")
        return value.strip().title()
    
    def validate_phone_number(self, value):
        """
        Validate phone number.
        """
        if value:
            try:
                validate_phone_number(value)
            except DjangoValidationError as e:
                raise serializers.ValidationError(str(e))
        return value
    
    def validate_avatar(self, value):
        """
        Validate avatar image.
        """
        if value:
            # Check file size (max 5MB)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("Avatar image size cannot exceed 5MB.")
            
            # Check file type
            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if hasattr(value, 'content_type') and value.content_type not in allowed_types:
                raise serializers.ValidationError(
                    "Only JPEG, PNG, GIF, and WebP images are allowed."
                )
        
        return value
    
    def validate_bio(self, value):
        """
        Validate bio length.
        """
        if len(value) > 500:
            raise serializers.ValidationError("Bio cannot exceed 500 characters.")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change.
    """
    current_password = serializers.CharField(style={'input_type': 'password'})
    new_password = serializers.CharField(
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(style={'input_type': 'password'})
    
    def validate_current_password(self, value):
        """
        Validate current password.
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value
    
    def validate(self, attrs):
        """
        Validate password confirmation.
        """
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "Password confirmation doesn't match."
            })
        
        # Check if new password is different from current
        user = self.context['request'].user
        if user.check_password(attrs['new_password']):
            raise serializers.ValidationError({
                'new_password': "New password must be different from current password."
            })
        
        return attrs
    
    def save(self):
        """
        Save new password.
        """
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.password_changed_at = timezone.now()
        user.save(update_fields=['password', 'password_changed_at'])
        return user


class EmailChangeSerializer(serializers.Serializer):
    """
    Serializer for email change.
    """
    new_email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})
    
    def validate_new_email(self, value):
        """
        Validate new email.
        """
        # Check if email is different from current
        user = self.context['request'].user
        if user.email.lower() == value.lower():
            raise serializers.ValidationError("New email must be different from current email.")
        
        # Check if email is already taken
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
        return value.lower()
    
    def validate_password(self, value):
        """
        Validate current password.
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Password is incorrect.")
        return value


class UserSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for user sessions.
    """
    is_current = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(source='is_expired', read_only=True)
    
    class Meta:
        model = UserSession
        fields = [
            'id', 'session_key', 'ip_address', 'user_agent',
            'device_type', 'location', 'is_active', 'is_current',
            'is_expired', 'created_at', 'last_activity', 'expires_at'
        ]
        read_only_fields = ['id', 'session_key', 'created_at']
    
    def get_is_current(self, obj):
        """
        Check if this is the current session.
        """
        request = self.context.get('request')
        if request and hasattr(request, 'session'):
            return obj.session_key == request.session.session_key
        return False


class UserActivitySerializer(serializers.ModelSerializer):
    """
    Serializer for user activities.
    """
    
    class Meta:
        model = UserActivity
        fields = [
            'id', 'action', 'description', 'ip_address',
            'user_agent', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for user preferences.
    """
    
    class Meta:
        model = UserPreference
        fields = [
            'email_frequency', 'show_email', 'show_phone', 'allow_search',
            'theme', 'items_per_page', 'preferred_contact_method', 'settings'
        ]
    
    def validate_items_per_page(self, value):
        """
        Validate items per page.
        """
        if not (10 <= value <= 100):
            raise serializers.ValidationError("Items per page must be between 10 and 100.")
        return value


class UserListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for user lists.
    """
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    initials = serializers.CharField(source='get_initials', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'initials', 'avatar', 'is_active',
            'is_verified', 'date_joined', 'last_login'
        ]


class UserStatsSerializer(serializers.Serializer):
    """
    Serializer for user statistics.
    """
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    verified_users = serializers.IntegerField()
    new_users_today = serializers.IntegerField()
    new_users_this_week = serializers.IntegerField()
    new_users_this_month = serializers.IntegerField()
    users_by_role = serializers.DictField()
    users_by_status = serializers.DictField()


class UserSearchSerializer(serializers.Serializer):
    """
    Serializer for user search parameters.
    """
    query = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    is_verified = serializers.BooleanField(required=False)
    date_joined_from = serializers.DateField(required=False)
    date_joined_to = serializers.DateField(required=False)
    institution_id = serializers.UUIDField(required=False)
    
    def validate(self, attrs):
        """
        Validate search parameters.
        """
        date_from = attrs.get('date_joined_from')
        date_to = attrs.get('date_joined_to')
        
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError({
                'date_joined_to': "End date must be after start date."
            })
        
        return attrs


class UserExportSerializer(serializers.Serializer):
    """
    Serializer for user data export.
    """
    format = serializers.ChoiceField(
        choices=['csv', 'json', 'xlsx'],
        default='csv'
    )
    fields = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    filters = serializers.DictField(required=False)
    
    def validate_fields(self, value):
        """
        Validate export fields.
        """
        if value:
            allowed_fields = [
                'id', 'email', 'username', 'first_name', 'last_name',
                'phone_number', 'is_active', 'is_verified', 'date_joined',
                'last_login', 'language', 'timezone'
            ]
            
            invalid_fields = [field for field in value if field not in allowed_fields]
            if invalid_fields:
                raise serializers.ValidationError(
                    f"Invalid fields: {', '.join(invalid_fields)}"
                )
        
        return value


class BulkUserActionSerializer(serializers.Serializer):
    """
    Serializer for bulk user actions.
    """
    user_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=100
    )
    action = serializers.ChoiceField(
        choices=['activate', 'deactivate', 'verify', 'unverify', 'delete']
    )
    
    def validate_user_ids(self, value):
        """
        Validate user IDs.
        """
        # Check if all users exist
        existing_users = User.objects.filter(id__in=value).count()
        if existing_users != len(value):
            raise serializers.ValidationError("Some user IDs are invalid.")
        
        return value
    
    def validate(self, attrs):
        """
        Validate bulk action.
        """
        user_ids = attrs['user_ids']
        action = attrs['action']
        
        # Prevent actions on superusers
        if action in ['deactivate', 'delete']:
            superuser_count = User.objects.filter(
                id__in=user_ids,
                is_superuser=True
            ).count()
            
            if superuser_count > 0:
                raise serializers.ValidationError(
                    "Cannot perform this action on superuser accounts."
                )
        
        return attrs