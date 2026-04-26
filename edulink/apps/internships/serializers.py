from rest_framework import serializers
from .models import InternshipOpportunity, InternshipApplication, InternshipEvidence, Incident, SuccessStory, SupervisorAssignment, OpportunityStatus, ApplicationStatus

class SuccessStorySerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    employer_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SuccessStory
        fields = [
            'id', 'application', 'student_testimonial', 'employer_feedback', 
            'is_published', 'created_at', 'updated_at', 'student_name', 'employer_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'student_name', 'employer_name']

    def get_student_name(self, obj):
        if obj.application.student_id:
            from edulink.apps.students.queries import get_student_by_id
            student = get_student_by_id(obj.application.student_id)
            if student:
                return f"{student.user.first_name} {student.user.last_name}"
        return "Unknown Student"

    def get_employer_name(self, obj):
        if obj.application.opportunity.employer_id:
            from edulink.apps.employers.queries import get_employer_by_id
            employer = get_employer_by_id(obj.application.opportunity.employer_id)
            if employer:
                return employer.name
        return "Unknown Employer"

class InternshipOpportunitySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    location_type_display = serializers.CharField(source='get_location_type_display', read_only=True)
    employer_details = serializers.SerializerMethodField()
    student_has_applied = serializers.SerializerMethodField()
    is_deadline_expired = serializers.BooleanField(read_only=True)
    deadline_status = serializers.SerializerMethodField()
    days_until_deadline = serializers.SerializerMethodField()
    
    class Meta:
        model = InternshipOpportunity
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'status', 
            'institution_id', 'employer_id', 'is_deadline_expired',
            'deadline_status', 'days_until_deadline'
        ]

    def get_employer_details(self, obj):
        if not obj.employer_id:
            return None
        from edulink.apps.employers.queries import get_employer_by_id
        employer = get_employer_by_id(obj.employer_id)
        if employer:
            return {
                "name": employer.name,
                "is_verified": employer.trust_level > 0,
                "is_featured": employer.is_featured,
                "organization_type": employer.organization_type,
                "location": "", 
                "logo": employer.logo.url if employer.logo else None
            }
        return None

    def get_student_has_applied(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or not request.user.is_student:
            return False
        
        from edulink.apps.students.queries import get_student_for_user
        student = get_student_for_user(str(request.user.id))
        if not student:
            return False
            
        from .queries import has_student_applied
        return has_student_applied(opportunity_id=obj.id, student_id=student.id)
    
    def get_deadline_status(self, obj):
        """
        Returns deadline status enum for frontend UI:
        - VALID: No deadline or deadline is in future
        - APPROACHING_24H: Deadline within 24 hours
        - APPROACHING_1H: Deadline within 1 hour
        - EXPIRED: Deadline has passed
        """
        from django.utils import timezone
        from datetime import timedelta
        
        if not obj.application_deadline:
            return "VALID"
        
        now = timezone.now()
        if obj.is_deadline_expired:
            return "EXPIRED"
        
        time_until_deadline = obj.application_deadline - now
        
        if time_until_deadline <= timedelta(hours=1):
            return "APPROACHING_1H"
        elif time_until_deadline <= timedelta(hours=24):
            return "APPROACHING_24H"
        else:
            return "VALID"
    
    def get_days_until_deadline(self, obj):
        """
        Returns number of days until deadline, or None if no deadline.
        Convenience field for frontend.
        """
        if not obj.application_deadline:
            return None
        
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        if obj.is_deadline_expired:
            return 0
        
        delta = obj.application_deadline - now
        days = delta.days + (1 if delta.seconds > 0 else 0)  # Round up
        return max(0, days)

class InternshipApplicationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    student_info = serializers.SerializerMethodField()
    employer_details = serializers.SerializerMethodField()
    institution_supervisor_details = serializers.SerializerMethodField()
    employer_supervisor_details = serializers.SerializerMethodField()
    logbook_count = serializers.SerializerMethodField()
    can_complete = serializers.SerializerMethodField()
    can_feedback = serializers.SerializerMethodField()
    completion_readiness = serializers.SerializerMethodField()
    
    # Flatten Opportunity fields
    title = serializers.CharField(source='opportunity.title', read_only=True)
    description = serializers.CharField(source='opportunity.description', read_only=True)
    department = serializers.CharField(source='opportunity.department', read_only=True)
    skills = serializers.JSONField(source='opportunity.skills', read_only=True)
    location = serializers.CharField(source='opportunity.location', read_only=True)
    location_type = serializers.CharField(source='opportunity.location_type', read_only=True)
    start_date = serializers.DateField(source='opportunity.start_date', read_only=True)
    end_date = serializers.DateField(source='opportunity.end_date', read_only=True)
    duration = serializers.CharField(source='opportunity.duration', read_only=True)
    employer_id = serializers.UUIDField(source='opportunity.employer_id', read_only=True)
    institution_id = serializers.UUIDField(source='opportunity.institution_id', read_only=True)
    
    def get_can_complete(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        from .policies import can_transition_application
        return can_transition_application(request.user, obj, 'COMPLETED')

    def get_completion_readiness(self, obj):
        from .services import get_completion_readiness
        return get_completion_readiness(obj)

    def get_can_feedback(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False

        from .policies import can_submit_final_feedback
        return can_submit_final_feedback(request.user, obj)

    class Meta:
        model = InternshipApplication
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'status', 
            'opportunity', 'student_id', 'application_snapshot'
        ]
        
    def get_student_info(self, obj):
        from edulink.apps.students.queries import get_student_by_id
        student = get_student_by_id(obj.student_id)
        if student:
            return {
                "id": str(student.id),
                "name": f"{student.user.first_name} {student.user.last_name}",
                "email": student.user.email,
                "trust_level": student.trust_level,
                "trust_points": student.trust_points,
            }
        return None

    def get_employer_details(self, obj):
        if not obj.opportunity.employer_id:
            return None
        from edulink.apps.employers.queries import get_employer_by_id
        employer = get_employer_by_id(obj.opportunity.employer_id)
        if employer:
            return {
                "name": employer.name,
                "is_verified": employer.trust_level > 0,
                "is_featured": employer.is_featured,
                "organization_type": employer.organization_type,
                "location": "", 
                "logo": employer.logo.url if employer.logo else None
            }
        return None

    def get_institution_supervisor_details(self, obj):
        if not obj.institution_supervisor_id:
            return None
        from edulink.apps.institutions.queries import get_institution_staff_by_id
        supervisor = get_institution_staff_by_id(staff_id=obj.institution_supervisor_id)
        if supervisor:
            return {
                "id": str(supervisor.id),
                "user_id": str(supervisor.user_id),
                "name": f"{supervisor.user.first_name} {supervisor.user.last_name}",
                "email": supervisor.user.email
            }
        return None

    def get_employer_supervisor_details(self, obj):
        if not obj.employer_supervisor_id:
            return None
        from edulink.apps.employers.queries import get_supervisor_by_id
        supervisor = get_supervisor_by_id(supervisor_id=obj.employer_supervisor_id)
        if supervisor:
            return {
                "id": str(supervisor.id),
                "user_id": str(supervisor.user_id),
                "name": f"{supervisor.user.first_name} {supervisor.user.last_name}",
                "email": supervisor.user.email
            }
        return None

    def get_logbook_count(self, obj):
        from .queries import get_application_logbook_count
        return get_application_logbook_count(application_id=obj.id)

class CreateInternshipSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()
    department = serializers.CharField(required=False, allow_blank=True)
    skills = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    capacity = serializers.IntegerField(min_value=1, required=False, default=1)
    location = serializers.CharField(required=False, allow_blank=True)
    location_type = serializers.ChoiceField(choices=InternshipOpportunity.LOCATION_CHOICES, required=False, default=InternshipOpportunity.LOCATION_ONSITE)
    institution_id = serializers.UUIDField(required=False, allow_null=True)
    employer_id = serializers.UUIDField(required=False, allow_null=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    supervisor_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)
    duration = serializers.CharField(required=False, allow_blank=True)
    application_deadline = serializers.DateTimeField(required=False, allow_null=True)
    is_institution_restricted = serializers.BooleanField(required=False, default=False)


class InternshipActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['shortlist', 'accept', 'start', 'reject', 'complete', 'certify'])

class InternshipEvidenceSerializer(serializers.ModelSerializer):
    student_info = serializers.SerializerMethodField()
    internship_title = serializers.SerializerMethodField()

    class Meta:
        model = InternshipEvidence
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'status', 
            'employer_review_status', 'employer_reviewed_by', 'employer_reviewed_at', 'employer_review_notes', 'employer_private_notes',
            'institution_review_status', 'institution_reviewed_by', 'institution_reviewed_at', 'institution_review_notes', 'institution_private_notes'
        ]
    
    def validate_description(self, value):
        """description: must be 10-500 characters for logbook entries."""
        evidence_type = self.initial_data.get('evidence_type', InternshipEvidence.TYPE_OTHER)
        if evidence_type == InternshipEvidence.TYPE_LOGBOOK:
            if not value or len(value.strip()) < 10:
                raise serializers.ValidationError(
                    "Logbook entry description must be at least 10 characters."
                )
            if len(value) > 500:
                raise serializers.ValidationError(
                    "Logbook entry description must not exceed 500 characters."
                )
        return value
    
    def validate_file(self, value):
        """file: max 5MB."""
        if value:
            if value.size > 5 * 1024 * 1024:  # 5MB
                raise serializers.ValidationError("File size must not exceed 5MB.")
        return value

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        
        if request and request.user.is_authenticated:
            user = request.user
            application = instance.application
            
            # 1. Students see NO private notes
            if user.is_student:
                representation.pop('employer_private_notes', None)
                representation.pop('institution_private_notes', None)
                representation.pop('private_notes', None)
            
            # 2. Employer Supervisors ONLY see Employer Private Notes
            elif str(application.employer_supervisor_id) == str(user.id):
                representation.pop('institution_private_notes', None)
                representation.pop('private_notes', None)
            
            # 3. Institution Supervisors ONLY see Institution Private Notes
            elif str(application.institution_supervisor_id) == str(user.id):
                representation.pop('employer_private_notes', None)
                representation.pop('private_notes', None)
            
            # 4. Fallback for others (admins etc) - hide both if not explicitly allowed?
            # Usually admins should see everything, but following the "private" request strictly:
            else:
                # If they are an admin but NOT one of the assigned supervisors, 
                # let's decide if they should see them. 
                # For "Most Robust Security", we hide both unless they are the owner.
                if not (user.is_employer_admin or user.is_institution_admin or user.is_system_admin):
                    representation.pop('employer_private_notes', None)
                    representation.pop('institution_private_notes', None)
                    representation.pop('private_notes', None)
                    
        return representation

    def get_student_info(self, obj):
        from edulink.apps.students.queries import get_student_by_id
        student = get_student_by_id(obj.application.student_id)
        if student:
            return {
                "id": str(student.id),
                "name": f"{student.user.first_name} {student.user.last_name}",
                "email": student.user.email
            }
        return None

    def get_internship_title(self, obj):
        return obj.application.opportunity.title


class SubmitEvidenceSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    file = serializers.FileField(required=False)
    evidence_type = serializers.ChoiceField(choices=InternshipEvidence.TYPE_CHOICES, default=InternshipEvidence.TYPE_OTHER)
    metadata = serializers.JSONField(required=False, default=dict)

class ReviewEvidenceSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[
        InternshipEvidence.STATUS_ACCEPTED, 
        InternshipEvidence.STATUS_REJECTED,
        InternshipEvidence.STATUS_REVISION_REQUIRED
    ])
    notes = serializers.CharField(required=False, allow_blank=True)
    private_notes = serializers.CharField(required=False, allow_blank=True)

class CreateIncidentSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()

class IncidentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    student_info = serializers.SerializerMethodField()
    internship_title = serializers.SerializerMethodField()
    
    class Meta:
        model = Incident
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'status', 'resolution_notes', 'resolved_at', 'resolved_by', 'reported_by', 'application']

    def get_student_info(self, obj):
        from edulink.apps.students.queries import get_student_by_id
        student = get_student_by_id(obj.application.student_id)
        if student:
            return {
                "id": str(student.id),
                "name": f"{student.user.first_name} {student.user.last_name}",
                "email": student.user.email
            }
        return None

    def get_internship_title(self, obj):
        return obj.application.opportunity.title

class ResolveIncidentSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[Incident.STATUS_RESOLVED, Incident.STATUS_DISMISSED])
    resolution_notes = serializers.CharField()

class AssignSupervisorSerializer(serializers.Serializer):
    supervisor_id = serializers.UUIDField()
    type = serializers.ChoiceField(choices=['institution', 'employer'])

class BulkAssignSupervisorSerializer(serializers.Serializer):
    institution_id = serializers.UUIDField()
    department_id = serializers.UUIDField()
    cohort_id = serializers.UUIDField(required=False, allow_null=True)

class SubmitFinalFeedbackSerializer(serializers.Serializer):
    feedback = serializers.CharField()
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False)


class InternshipApplySerializer(serializers.Serializer):
    cover_letter = serializers.CharField(
        required=False, 
        allow_blank=True, 
        default="",
        max_length=1000,
        help_text="Optional cover letter (max 1000 characters)"
    )
    
    def validate_cover_letter(self, value):
        """cover_letter: if provided, must be 50-1000 characters."""
        if value and len(value.strip()) > 0:
            cleaned = value.strip()
            if len(cleaned) < 50:
                raise serializers.ValidationError(
                    "Cover letter must be at least 50 characters if provided."
                )
            if len(cleaned) > 1000:
                raise serializers.ValidationError(
                    "Cover letter must not exceed 1000 characters."
                )
        return value


class CreateSuccessStorySerializer(serializers.Serializer):
    student_testimonial = serializers.CharField(required=False, allow_blank=True, default="")
    employer_feedback = serializers.CharField(required=False, allow_blank=True, default="")
    is_published = serializers.BooleanField(required=False, default=False)


class BulkExtendDeadlineSerializer(serializers.Serializer):
    """
    Serializer for bulk deadline extension requests.
    Allows employers to extend deadlines for multiple opportunities at once.
    """
    opportunity_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="List of opportunity IDs to extend"
    )
    new_deadline = serializers.DateTimeField(
        help_text="New application deadline (must be in future)"
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text="Reason for extension (optional, for records)"
    )
    
    def validate_opportunity_ids(self, value):
        """Ensure at least one opportunity is provided"""
        if not value:
            raise serializers.ValidationError("At least one opportunity ID must be provided.")
        if len(value) > 50:
            raise serializers.ValidationError("Cannot extend more than 50 opportunities at once.")
        return value
    
    def validate_new_deadline(self, value):
        """Ensure new deadline is in the future"""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("New deadline must be in the future.")
        return value


class DeadlineAnalyticsSerializer(serializers.Serializer):
    """
    Serializer for deadline performance analytics.
    Provides comprehensive metrics for employers about their internship opportunities.
    """
    total_opportunities = serializers.IntegerField()
    open_opportunities = serializers.IntegerField()
    closed_opportunities = serializers.IntegerField()
    opportunities_with_zero_applications = serializers.IntegerField()
    total_applications_received = serializers.IntegerField()
    total_offers_made = serializers.IntegerField()
    average_applications_per_opportunity = serializers.FloatField()
    average_days_to_deadline = serializers.FloatField()
    conversion_rate = serializers.FloatField(help_text="Percentage of applications that led to offers")
    
    # Aggregations by deadline status
    opportunities_closing_in_24h = serializers.IntegerField()
    opportunities_closing_in_48h = serializers.IntegerField()
    expired_recently = serializers.IntegerField(help_text="Closed in last 7 days")
    
    # Performance metadata
    period_start = serializers.DateTimeField()
    period_end = serializers.DateTimeField()
    generated_at = serializers.DateTimeField()


# ==================== Phase 2.4: Supervisor Assignment Serializers ====================

class SupervisorAssignmentSerializer(serializers.ModelSerializer):
    """
    Serialize supervisor assignment (read).
    Shows assignment status and timeline.
    """
    supervisor_id = serializers.UUIDField()
    assigned_by_id = serializers.UUIDField()
    application = InternshipApplicationSerializer(read_only=True)
    
    class Meta:
        model = SupervisorAssignment
        fields = [
            'id',
            'application',
            'supervisor_id',
            'assigned_by_id',
            'assignment_type',
            'status',
            'assigned_at',
            'accepted_at',
            'rejected_at',
            'rejection_reason',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'application',
            'assigned_by_id',
            'assigned_at',
            'accepted_at',
            'rejected_at',
            'created_at',
            'updated_at',
        ]


class AcceptSupervisorAssignmentSerializer(serializers.Serializer):
    """
    Accept a supervisor assignment (write).
    Supervisor confirms they will supervise this internship.
    """
    # No additional fields needed - just basic confirmation
    pass


class RejectSupervisorAssignmentSerializer(serializers.Serializer):
    """
    Reject a supervisor assignment (write).
    Supervisor declines with optional reason.
    """
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text="Optional reason for rejection"
    )
