from rest_framework import serializers
from users.models.profile_base import ProfileBase
import re
from django.core.files.images import get_image_dimensions
from django.core.exceptions import ValidationError as DjangoValidationError


class ProfileBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileBase
        # We include all common fields defined in the abstract base
        fields = [
            'first_name',
            'last_name',
            'phone_number',
            'profile_picture',
            'phone_verified',
            'is_active',
            'last_login_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['phone_verified',
                            'is_active', 'last_login_at', 'created_at', 'updated_at']
    
    def validate_first_name(self, value):
        """Validate first name"""
        if not value:
            raise serializers.ValidationError("First name is required")
        
        # Remove extra whitespace and normalize
        value = value.strip()
        
        # Check length
        if len(value) < 2:
            raise serializers.ValidationError("First name must be at least 2 characters long")
        if len(value) > 50:
            raise serializers.ValidationError("First name cannot exceed 50 characters")
        
        # Check for valid characters (letters, spaces, hyphens, apostrophes)
        if not re.match(r"^[a-zA-Z\s\-']+$", value):
            raise serializers.ValidationError(
                "First name can only contain letters, spaces, hyphens, and apostrophes"
            )
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'[<>"\\]',  # HTML/script injection
            r'javascript:',  # JavaScript injection
            r'\d{3,}',  # Multiple consecutive digits
        ]
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                raise serializers.ValidationError("Invalid characters in first name")
        
        return value.title()  # Capitalize properly
    
    def validate_last_name(self, value):
        """Validate last name"""
        if not value:
            raise serializers.ValidationError("Last name is required")
        
        # Remove extra whitespace and normalize
        value = value.strip()
        
        # Check length
        if len(value) < 2:
            raise serializers.ValidationError("Last name must be at least 2 characters long")
        if len(value) > 50:
            raise serializers.ValidationError("Last name cannot exceed 50 characters")
        
        # Check for valid characters (letters, spaces, hyphens, apostrophes)
        if not re.match(r"^[a-zA-Z\s\-']+$", value):
            raise serializers.ValidationError(
                "Last name can only contain letters, spaces, hyphens, and apostrophes"
            )
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'[<>"\\]',  # HTML/script injection
            r'javascript:',  # JavaScript injection
            r'\d{3,}',  # Multiple consecutive digits
        ]
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                raise serializers.ValidationError("Invalid characters in last name")
        
        return value.title()  # Capitalize properly
    
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
    
    def validate_profile_picture(self, value):
        """Validate profile picture upload"""
        if not value:
            return value
        
        # Check file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                "Profile picture file size cannot exceed 5MB"
            )
        
        # Check file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Profile picture must be a JPEG, PNG, or WebP image"
            )
        
        # Check image dimensions
        try:
            width, height = get_image_dimensions(value)
            if width and height:
                # Check minimum dimensions
                if width < 100 or height < 100:
                    raise serializers.ValidationError(
                        "Profile picture must be at least 100x100 pixels"
                    )
                
                # Check maximum dimensions
                if width > 2000 or height > 2000:
                    raise serializers.ValidationError(
                        "Profile picture cannot exceed 2000x2000 pixels"
                    )
        except Exception:
            raise serializers.ValidationError("Invalid image file")
        
        return value
    
    def validate(self, attrs):
        """Cross-field validation"""
        first_name = attrs.get('first_name', '')
        last_name = attrs.get('last_name', '')
        
        # Check if first and last names are too similar (potential spam/fake accounts)
        if first_name and last_name:
            if first_name.lower() == last_name.lower():
                raise serializers.ValidationError({
                    'last_name': 'First name and last name cannot be identical'
                })
        
        return attrs
