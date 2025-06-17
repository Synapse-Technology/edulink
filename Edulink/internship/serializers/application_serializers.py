# core/serializers/application_serializers.py

from rest_framework import serializers
from internship.models import Application, Internship # Assuming Application and Internship are in core.models
from users.models import User # Assuming User model is in authentication_app

class ApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Application model.
    """
    # Read-only fields to include related object data
    student_user_email = serializers.ReadOnlyField(source='student_user.email')
    internship_title = serializers.ReadOnlyField(source='internship.title')

    class Meta:
        model = Application
        fields = [
            'id', 
            'student_user', 
            'student_user_email', # Include read-only email
            'internship', 
            'internship_title', # Include read-only title
            'application_date', 
            'status',
            'institution_approved',
            'employer_feedback',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'application_date', 'created_at', 'updated_at', 'student_user_email', 'internship_title']

    # Custom validation example (optional, but good practice)
    def validate(self, data):
        # Example: Ensure a student doesn't apply to the same internship more than once
        if self.instance is None and Application.objects.filter(
            student_user=data.get('student_user'), 
            internship=data.get('internship')
        ).exists():
            raise serializers.ValidationError("You have already applied for this internship.")
        return data