from rest_framework import serializers
from ..models.application import Application

class ApplicationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    internship_title = serializers.CharField(source='internship.title', read_only=True)

    class Meta:
        model = Application
        fields = [
            'id',
            'student',
            'student_name',
            'internship',
            'internship_title',
            'application_date',
            'status',
            'cover_letter',
            'resume'
        ]
        read_only_fields = ['student', 'internship', 'application_date']


class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating the status of an application.
    """
    class Meta:
        model = Application
        fields = ['status']
