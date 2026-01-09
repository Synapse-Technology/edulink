from rest_framework import serializers
from users.models.student_profile import StudentProfile
from users.serializers.profile_serializer import ProfileBaseSerializer
import json
import re
from urllib.parse import urlparse
from django.core.files.uploadedfile import UploadedFile


class StudentProfileSerializer(ProfileBaseSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    
    # Custom handling for skills and interests
    skills = serializers.JSONField(required=False, default=list)
    interests = serializers.JSONField(required=False, default=list)
    
    def validate_skills(self, value):
        """Validate skills field"""
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    value = parsed
                else:
                    raise serializers.ValidationError("Skills must be a list")
            except json.JSONDecodeError:
                raise serializers.ValidationError("Invalid JSON format for skills")
        elif not isinstance(value, list):
            raise serializers.ValidationError("Skills must be a list")
        
        # Validate individual skills
        if len(value) > 20:
            raise serializers.ValidationError("Cannot have more than 20 skills")
        
        validated_skills = []
        for skill in value:
            if not isinstance(skill, str):
                raise serializers.ValidationError("Each skill must be a string")
            
            # Clean and validate skill
            skill = skill.strip()
            if not skill:
                continue  # Skip empty skills
            
            if len(skill) < 2:
                raise serializers.ValidationError("Each skill must be at least 2 characters long")
            if len(skill) > 50:
                raise serializers.ValidationError("Each skill cannot exceed 50 characters")
            
            # Check for valid characters
            if not re.match(r'^[a-zA-Z0-9\s\-\.\+\#]+$', skill):
                raise serializers.ValidationError(
                    f"Skill '{skill}' contains invalid characters. Only letters, numbers, spaces, hyphens, dots, plus, and hash are allowed"
                )
            
            # Check for suspicious patterns
            suspicious_patterns = [
                r'[<>"\\]',  # HTML/script injection
                r'javascript:',  # JavaScript injection
                r'http[s]?://',  # URLs
            ]
            for pattern in suspicious_patterns:
                if re.search(pattern, skill, re.IGNORECASE):
                    raise serializers.ValidationError(f"Skill '{skill}' contains invalid content")
            
            validated_skills.append(skill.title())
        
        # Remove duplicates while preserving order
        seen = set()
        unique_skills = []
        for skill in validated_skills:
            skill_lower = skill.lower()
            if skill_lower not in seen:
                seen.add(skill_lower)
                unique_skills.append(skill)
        
        return unique_skills
    
    def validate_interests(self, value):
        """Validate interests field"""
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    value = parsed
                else:
                    raise serializers.ValidationError("Interests must be a list")
            except json.JSONDecodeError:
                raise serializers.ValidationError("Invalid JSON format for interests")
        elif not isinstance(value, list):
            raise serializers.ValidationError("Interests must be a list")
        
        # Validate individual interests
        if len(value) > 15:
            raise serializers.ValidationError("Cannot have more than 15 interests")
        
        validated_interests = []
        for interest in value:
            if not isinstance(interest, str):
                raise serializers.ValidationError("Each interest must be a string")
            
            # Clean and validate interest
            interest = interest.strip()
            if not interest:
                continue  # Skip empty interests
            
            if len(interest) < 2:
                raise serializers.ValidationError("Each interest must be at least 2 characters long")
            if len(interest) > 50:
                raise serializers.ValidationError("Each interest cannot exceed 50 characters")
            
            # Check for valid characters
            if not re.match(r'^[a-zA-Z0-9\s\-\.\&]+$', interest):
                raise serializers.ValidationError(
                    f"Interest '{interest}' contains invalid characters. Only letters, numbers, spaces, hyphens, dots, and ampersands are allowed"
                )
            
            # Check for suspicious patterns
            suspicious_patterns = [
                r'[<>"\\]',  # HTML/script injection
                r'javascript:',  # JavaScript injection
                r'http[s]?://',  # URLs
            ]
            for pattern in suspicious_patterns:
                if re.search(pattern, interest, re.IGNORECASE):
                    raise serializers.ValidationError(f"Interest '{interest}' contains invalid content")
            
            validated_interests.append(interest.title())
        
        # Remove duplicates while preserving order
        seen = set()
        unique_interests = []
        for interest in validated_interests:
            interest_lower = interest.lower()
            if interest_lower not in seen:
                seen.add(interest_lower)
                unique_interests.append(interest)
        
        return unique_interests
    
    def validate_github_url(self, value):
        """Validate GitHub URL"""
        if not value:
            return value
        
        value = value.strip()
        
        # Parse URL
        try:
            parsed = urlparse(value)
        except Exception:
            raise serializers.ValidationError("Invalid URL format")
        
        # Check if it's a valid GitHub URL
        if not parsed.scheme in ['http', 'https']:
            raise serializers.ValidationError("URL must use http or https protocol")
        
        if not parsed.netloc.lower() in ['github.com', 'www.github.com']:
            raise serializers.ValidationError("Must be a valid GitHub URL")
        
        # Check for valid GitHub username pattern
        path = parsed.path.strip('/')
        if not path or not re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9\-]){0,38}$', path.split('/')[0]):
            raise serializers.ValidationError("Invalid GitHub username in URL")
        
        return value
    
    def validate_linkedin_url(self, value):
        """Validate LinkedIn URL"""
        if not value:
            return value
        
        value = value.strip()
        
        # Parse URL
        try:
            parsed = urlparse(value)
        except Exception:
            raise serializers.ValidationError("Invalid URL format")
        
        # Check if it's a valid LinkedIn URL
        if not parsed.scheme in ['http', 'https']:
            raise serializers.ValidationError("URL must use http or https protocol")
        
        valid_domains = ['linkedin.com', 'www.linkedin.com']
        if not parsed.netloc.lower() in valid_domains:
            raise serializers.ValidationError("Must be a valid LinkedIn URL")
        
        # Check for valid LinkedIn profile path
        path = parsed.path.strip('/')
        if not path.startswith('in/') and not path.startswith('pub/'):
            raise serializers.ValidationError("Must be a valid LinkedIn profile URL")
        
        return value
    
    def validate_twitter_url(self, value):
        """Validate Twitter URL"""
        if not value:
            return value
        
        value = value.strip()
        
        # Parse URL
        try:
            parsed = urlparse(value)
        except Exception:
            raise serializers.ValidationError("Invalid URL format")
        
        # Check if it's a valid Twitter URL
        if not parsed.scheme in ['http', 'https']:
            raise serializers.ValidationError("URL must use http or https protocol")
        
        valid_domains = ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com']
        if not parsed.netloc.lower() in valid_domains:
            raise serializers.ValidationError("Must be a valid Twitter/X URL")
        
        # Check for valid Twitter username pattern
        path = parsed.path.strip('/')
        if not path or not re.match(r'^[a-zA-Z0-9_]{1,15}$', path.split('/')[0]):
            raise serializers.ValidationError("Invalid Twitter/X username in URL")
        
        return value
    
    def validate_resume(self, value):
        """Validate resume file upload"""
        if not value:
            return value
        
        # Check file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                "Resume file size cannot exceed 10MB"
            )
        
        # Check file type
        allowed_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Resume must be a PDF, DOC, or DOCX file"
            )
        
        # Check file extension
        allowed_extensions = ['.pdf', '.doc', '.docx']
        file_extension = value.name.lower().split('.')[-1] if '.' in value.name else ''
        if f'.{file_extension}' not in allowed_extensions:
            raise serializers.ValidationError(
                "Resume file must have .pdf, .doc, or .docx extension"
            )
        
        return value
    
    def validate_registration_number(self, value):
        """Validate student registration number"""
        if not value:
            return value
        
        value = value.strip().upper()
        
        # Check length
        if len(value) < 3 or len(value) > 20:
            raise serializers.ValidationError(
                "Registration number must be between 3 and 20 characters"
            )
        
        # Check for valid characters (alphanumeric, hyphens, slashes)
        if not re.match(r'^[A-Z0-9\-\/]+$', value):
            raise serializers.ValidationError(
                "Registration number can only contain letters, numbers, hyphens, and slashes"
            )
        
        return value
    
    def validate(self, attrs):
        """Cross-field validation"""
        attrs = super().validate(attrs)
        
        # Check that at least one contact method is provided
        github_url = attrs.get('github_url')
        linkedin_url = attrs.get('linkedin_url')
        twitter_url = attrs.get('twitter_url')
        
        if not any([github_url, linkedin_url, twitter_url]):
            # This is just a warning, not a hard requirement
            pass
        
        return attrs
    
    class Meta(ProfileBaseSerializer.Meta):
        model = StudentProfile
        fields = ProfileBaseSerializer.Meta.fields + [
            'institution',
            'institution_name',
            'course',
            'course_name',
            'national_id',
            'registration_number',
            'academic_year',
            'skills',
            'interests',
            'internship_status',
            'github_url',
            'linkedin_url',
            'twitter_url',
            'resume',
            'email',
        ]
        read_only_fields = ProfileBaseSerializer.Meta.read_only_fields + [
            'institution', 'institution_name', 'course', 'course_name', 
            'national_id', 'registration_number', 'email'
        ]
