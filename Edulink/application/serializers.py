from rest_framework import serializers
from .models import Application, SupervisorFeedback
from internship.models.internship import Internship


class InternshipSimpleSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='employer.company_name', read_only=True)
    company_name = serializers.CharField(source='employer.company_name', read_only=True)
    
    class Meta:
        model = Internship
        fields = [
            "id",
            "title",
            "employer",
            "employer_name",
            "company_name",
            "location",
            "start_date",
            "end_date",
            "is_active",
        ]


class ApplicationSerializer(serializers.ModelSerializer):
    internship = InternshipSimpleSerializer(read_only=True)
    internship_id = serializers.PrimaryKeyRelatedField(
        queryset=Internship.objects.all(), source="internship", write_only=True  # type: ignore[attr-defined]
    )
    student = serializers.StringRelatedField(read_only=True)
    # Add frontend-expected field names
    internship_title = serializers.CharField(source='internship.title', read_only=True)
    company = serializers.CharField(source='internship.employer.company_name', read_only=True)
    location = serializers.CharField(source='internship.location', read_only=True)
    applied_on = serializers.DateTimeField(source='application_date', read_only=True)
    created_at = serializers.DateTimeField(source='application_date', read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "student",
            "internship",
            "internship_id",
            "internship_title",
            "company",
            "location",
            "status",
            "applied_on",
            "created_at",
            "application_date",
            "updated_at",
            "cover_letter",
            "resume",
        ]
        read_only_fields = ["id", "student", "application_date", "updated_at"]


class ApplicationCreateSerializer(serializers.ModelSerializer):
    internship_id = serializers.PrimaryKeyRelatedField(
        queryset=Internship.objects.all(), source="internship", write_only=True  # type: ignore[attr-defined]
    )

    class Meta:
        model = Application
        fields = ["internship_id"]


class SupervisorFeedbackSerializer(serializers.ModelSerializer):
    application = serializers.PrimaryKeyRelatedField(queryset=Application.objects.all())  # type: ignore[attr-defined]

    class Meta:
        model = SupervisorFeedback
        fields = ["id", "application", "feedback", "rating"]


class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ["status", "review_notes"]


# --- Application Serializers (moved from internship) ---
# (Paste the full content of Edulink/internship/serializers/application_serializers.py here)


class ApplicationListSerializer(serializers.ModelSerializer):
    internship = InternshipSimpleSerializer(read_only=True)
    student = serializers.StringRelatedField(read_only=True)
    status = serializers.CharField(read_only=True)
    application_date = serializers.DateTimeField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "student",
            "internship",
            "status",
            "application_date",
            "is_active",
            "cover_letter",
            "resume",
            "reviewed_by",
            "reviewed_at",
            "review_notes",
        ]


# For employer/institution/internship application lists, you can use ApplicationListSerializer or extend as needed.


class ApplicationStatisticsSerializer(serializers.Serializer):
    total_applications = serializers.IntegerField()
    pending_applications = serializers.IntegerField()
    accepted_applications = serializers.IntegerField()
    rejected_applications = serializers.IntegerField()
    withdrawn_applications = serializers.IntegerField(required=False)
    total_internships = serializers.IntegerField(required=False)
    verified_internships = serializers.IntegerField(required=False)
