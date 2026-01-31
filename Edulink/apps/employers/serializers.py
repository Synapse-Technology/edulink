from rest_framework import serializers
from .models import EmployerRequest, EmployerInvite, Employer, Supervisor, EmployerStaffProfileRequest

class SupervisorSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.get_full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Supervisor
        fields = ['id', 'user', 'name', 'email', 'role', 'is_active']

class EmployerSupervisorInviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Supervisor.ROLE_CHOICES, default=Supervisor.ROLE_SUPERVISOR)

class EmployerRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployerRequest
        fields = [
            "id",
            "name",
            "official_email",
            "domain",
            "organization_type",
            "contact_person",
            "phone_number",
            "website_url",
            "registration_number",
            "status",
            "tracking_code",
            "created_at",
            "updated_at",
            "rejection_reason",
        ]
        read_only_fields = [
            "id",
            "status",
            "tracking_code",
            "created_at",
            "updated_at",
            "rejection_reason",
        ]

class EmployerRequestReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject"])
    rejection_reason_code = serializers.CharField(required=False)
    rejection_reason = serializers.CharField(required=False)

class EmployerInviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployerInvite
        fields = ["id", "email", "role", "status", "expires_at"]

class EmployerInviteValidationSerializer(serializers.Serializer):
    invite_id = serializers.UUIDField()
    token = serializers.CharField()

class EmployerInviteActivationSerializer(serializers.Serializer):
    invite_id = serializers.UUIDField()
    token = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    phone_number = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        # Basic complexity check
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        if not any(char.isalpha() for char in value):
            raise serializers.ValidationError("Password must contain at least one letter.")
        return value

class EmployerSerializer(serializers.ModelSerializer):
    max_active_students = serializers.SerializerMethodField()
    supervisor_ratio = serializers.SerializerMethodField()
    active_internship_count = serializers.SerializerMethodField()
    current_supervisor_ratio = serializers.SerializerMethodField()

    class Meta:
        model = Employer
        fields = [
            "id",
            "name",
            "official_email",
            "domain",
            "organization_type",
            "contact_person",
            "phone_number",
            "website_url",
            "registration_number",
            "logo",
            "status",
            "trust_level",
            "is_featured",
            "max_active_students",
            "supervisor_ratio",
            "active_internship_count",
            "current_supervisor_ratio",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "trust_level",
            "is_featured",
            "max_active_students",
            "supervisor_ratio",
            "active_internship_count",
            "current_supervisor_ratio",
            "created_at",
            "updated_at",
        ]

    def get_supervisor_ratio(self, obj):
        # Fixed Policy Ratio: 1 supervisor per 5 students
        return 5

    def get_max_active_students(self, obj):
        # Calculate MAX capacity dynamically based on active supervisors
        # This is the LIMIT, not the current usage.
        active_supervisors = obj.supervisors.filter(is_active=True).count()
        return active_supervisors * 5

    def get_active_internship_count(self, obj):
        # Real-time count of active internships
        # Import query to avoid cross-app model import
        from edulink.apps.internships.queries import count_active_internships_for_employer
        return count_active_internships_for_employer(obj.id)

    def get_current_supervisor_ratio(self, obj):
        # Real-time ratio: Active Students / Active Supervisors
        active_supervisors = obj.supervisors.filter(is_active=True).count()
        if active_supervisors == 0:
            return 0
            
        from edulink.apps.internships.queries import count_active_internships_for_employer
        active_students = count_active_internships_for_employer(obj.id)
        
        # Round to 1 decimal place
        return round(active_students / active_supervisors, 1)


class EmployerStaffProfileRequestCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=255, required=False)
    last_name = serializers.CharField(max_length=255, required=False)
    email = serializers.EmailField(required=False)
    
    def validate(self, data):
        if not any(data.values()):
            raise serializers.ValidationError("At least one field must be provided.")
        return data

class EmployerStaffProfileRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    staff_email = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EmployerStaffProfileRequest
        fields = [
            'id', 'staff', 'staff_name', 'staff_email', 'requested_changes', 
            'status', 'reviewed_by', 'reviewed_by_name', 'reviewed_at', 
            'admin_feedback', 'created_at'
        ]
        read_only_fields = list(fields)

    def get_staff_name(self, obj):
        return obj.staff.user.get_full_name()

    def get_staff_email(self, obj):
        return obj.staff.user.email

    def get_reviewed_by_name(self, obj):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.get(id=obj.reviewed_by).get_full_name() if obj.reviewed_by else None

class EmployerStaffProfileRequestActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    admin_feedback = serializers.CharField(required=False, allow_blank=True)
