from rest_framework import serializers
from application.models import Application  # Use Application model from application app
from internship.models.internship import Internship
from .models import SupervisorFeedback
from internship.models.internship import Internship as InternshipModel
from .models import Application as ApplicationModel

class InternshipSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternshipModel
        fields = ['id', 'title', 'employer', 'location', 'start_date', 'end_date', 'is_active']

class ApplicationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    internship_title = serializers.CharField(source='internship.title', read_only=True)

    class Meta:
        model = ApplicationModel
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
        model = ApplicationModel
        fields = ['status']

class SupervisorFeedbackSerializer(serializers.ModelSerializer):
    application = serializers.PrimaryKeyRelatedField(queryset=ApplicationModel.objects.all())
    class Meta:
        model = SupervisorFeedback
        fields = ['id', 'application', 'feedback', 'rating'] 