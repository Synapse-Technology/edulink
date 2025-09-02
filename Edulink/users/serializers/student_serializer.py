from rest_framework import serializers
from users.models.student_profile import StudentProfile
from users.serializers.profile_serializer import ProfileBaseSerializer
import json


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
                    return parsed
                else:
                    raise serializers.ValidationError("Skills must be a list")
            except json.JSONDecodeError:
                raise serializers.ValidationError("Invalid JSON format for skills")
        elif isinstance(value, list):
            return value
        else:
            raise serializers.ValidationError("Skills must be a list")
    
    def validate_interests(self, value):
        """Validate interests field"""
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
                else:
                    raise serializers.ValidationError("Interests must be a list")
            except json.JSONDecodeError:
                raise serializers.ValidationError("Invalid JSON format for interests")
        elif isinstance(value, list):
            return value
        else:
            raise serializers.ValidationError("Interests must be a list")
    
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
