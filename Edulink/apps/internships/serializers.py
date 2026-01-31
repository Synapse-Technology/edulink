from rest_framework import serializers
from .models import InternshipOpportunity, InternshipApplication, InternshipEvidence, Incident, SuccessStory, OpportunityStatus, ApplicationStatus

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
    
    class Meta:
        model = InternshipOpportunity
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'status', 
            'institution_id', 'employer_id'
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

class InternshipApplicationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    student_info = serializers.SerializerMethodField()
    employer_details = serializers.SerializerMethodField()
    institution_supervisor_details = serializers.SerializerMethodField()
    employer_supervisor_details = serializers.SerializerMethodField()
    logbook_count = serializers.SerializerMethodField()
    can_complete = serializers.SerializerMethodField()
    can_feedback = serializers.SerializerMethodField()
    
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

    def get_can_feedback(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # Supervisors can submit feedback if the internship is ongoing, completed or certified
        is_assigned = str(obj.employer_supervisor_id) == str(request.user.id) or \
                      str(obj.institution_supervisor_id) == str(request.user.id)
        
        return is_assigned and obj.status in [ApplicationStatus.ONGOING, ApplicationStatus.COMPLETED, ApplicationStatus.CERTIFIED]

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
