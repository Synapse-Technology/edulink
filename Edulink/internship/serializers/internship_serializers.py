# core/serializers/internship_serializers.py

from rest_framework import serializers
from internship.models import Internship # Assuming Internship is in core.models
from internship.models import User # Assuming User model is in authentication_app
from internship.models import Institution # Assuming Institution model is in institutions_app

class InternshipSerializer(serializers.ModelSerializer):
    """
    Serializer for the Internship model.
    """
    # Read-only fields to include related object data
    employer_email = serializers.ReadOnlyField(source='employer.email')
    institution_name = serializers.ReadOnlyField(source='institution.name') # Assuming Institution model has a 'name' field
    is_verified_by_institution = serializers.BooleanField(read_only=True)
    verified_by = serializers.StringRelatedField(read_only=True)
    verification_date = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Internship
        fields = [
            'id', 
            'employer', 
            'employer_email', # Include read-only email
            'institution',
            'institution_name', # Include read-only name
            'title', 
            'description', 
            'requirements', 
            'location', 
            'start_date', 
            'end_date', 
            'application_deadline', 
            'status',
            'created_at',
            'updated_at',
            'is_verified_by_institution',
            'verified_by',
            'verification_date',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'employer_email', 'institution_name', 'is_verified_by_institution', 'verified_by', 'verification_date']

    # Custom validation example (optional)
    def validate_application_deadline(self, value):
        if value < serializers.DateTimeField().current_timezone_aware_value().date():
            raise serializers.ValidationError("Application deadline cannot be in the past.")
        return value