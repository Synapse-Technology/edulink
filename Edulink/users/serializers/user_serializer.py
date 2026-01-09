from rest_framework import serializers
from authentication.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
import re
from users.roles import RoleChoices


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'is_active', 'is_staff', 'date_joined',
            'is_email_verified', 'phone_number', 'national_id', 
            'email_verified', 'role', 'password', 'confirm_password'
        ]
        read_only_fields = ['id', 'date_joined', 'is_email_verified', 'email_verified']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
        }
    
    def validate_email(self, value):
        """Validate email format and uniqueness"""
        if not value:
            raise serializers.ValidationError("Email is required")
        
        # Normalize email
        value = value.lower().strip()
        
        # Check for basic email format
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Invalid email format")
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'[<>"\\]',  # HTML/script injection
            r'javascript:',  # JavaScript injection
            r'data:',  # Data URI
        ]
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                raise serializers.ValidationError("Invalid characters in email")
        
        # Check uniqueness (excluding current instance)
        if self.instance:
            if User.objects.exclude(pk=self.instance.pk).filter(email=value).exists():
                raise serializers.ValidationError("User with this email already exists")
        else:
            if User.objects.filter(email=value).exists():
                raise serializers.ValidationError("User with this email already exists")
        
        return value
    
    def validate_phone_number(self, value):
        """Validate phone number format"""
        if not value:
            return value
        
        # Remove spaces and common separators
        cleaned = re.sub(r'[\s\-\(\)]', '', value)
        
        # Check for valid phone number pattern (international format)
        phone_regex = r'^\+?[1-9]\d{1,14}$'
        if not re.match(phone_regex, cleaned):
            raise serializers.ValidationError(
                "Invalid phone number format. Use international format (+1234567890)"
            )
        
        return cleaned
    
    def validate_national_id(self, value):
        """Validate national ID format"""
        if not value:
            return value
        
        # Remove spaces and special characters
        cleaned = re.sub(r'[\s\-]', '', value)
        
        # Check for alphanumeric only
        if not re.match(r'^[a-zA-Z0-9]+$', cleaned):
            raise serializers.ValidationError(
                "National ID can only contain letters and numbers"
            )
        
        # Check length (adjust based on your country's requirements)
        if len(cleaned) < 5 or len(cleaned) > 20:
            raise serializers.ValidationError(
                "National ID must be between 5 and 20 characters"
            )
        
        return cleaned
    
    def validate_role(self, value):
        """Validate user role"""
        if value not in [choice[0] for choice in RoleChoices.CHOICES]:
            raise serializers.ValidationError("Invalid role selected")
        return value
    
    def validate_password(self, value):
        """Validate password strength"""
        if not value:
            return value
        
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        
        return value
    
    def validate(self, attrs):
        """Cross-field validation"""
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        
        # Password confirmation validation
        if password and confirm_password:
            if password != confirm_password:
                raise serializers.ValidationError({
                    'confirm_password': 'Passwords do not match'
                })
        
        # Remove confirm_password from validated data
        attrs.pop('confirm_password', None)
        
        return attrs
    
    def create(self, validated_data):
        """Create user with proper password hashing"""
        password = validated_data.pop('password', None)
        user = User.objects.create_user(**validated_data)
        
        if password:
            user.set_password(password)
            user.save()
        
        return user
    
    def update(self, instance, validated_data):
        """Update user with proper password handling"""
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance