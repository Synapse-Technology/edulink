from rest_framework import serializers
from .models import Application, SupervisorFeedback
from internship.models import Internship

class InternshipSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Internship
        fields = ['id', 'title', 'employer', 'location', 'start_date', 'end_date', 'is_active']

class ApplicationSerializer(serializers.ModelSerializer):
    internship = InternshipSimpleSerializer(read_only=True)
    internship_id = serializers.PrimaryKeyRelatedField(
        queryset=Internship.objects.all(), source='internship', write_only=True
    )
    student = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Application
        fields = [
            'id', 'student', 'internship', 'internship_id', 'status', 'submitted_at', 'updated_at'
        ]
        read_only_fields = ['id', 'student', 'submitted_at', 'updated_at', 'status']

class ApplicationCreateSerializer(serializers.ModelSerializer):
    internship_id = serializers.PrimaryKeyRelatedField(
        queryset=Internship.objects.all(), source='internship', write_only=True
    )
    class Meta:
        model = Application
        fields = ['internship_id']

class SupervisorFeedbackSerializer(serializers.ModelSerializer):
    application = serializers.PrimaryKeyRelatedField(queryset=Application.objects.all())
    class Meta:
        model = SupervisorFeedback
        fields = ['id', 'application', 'feedback', 'rating'] 