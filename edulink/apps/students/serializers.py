from rest_framework import serializers
from .models import Student, StudentInstitutionAffiliation


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = [
            'id', 'user_id', 'institution_id', 'email', 'registration_number', 'is_verified', 
            'course_of_study', 'current_year', 'skills',
            'profile_picture', 'cv', 'admission_letter', 'id_document',
            'trust_level', 'trust_points',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['trust_level', 'trust_points']


class TrustTierSerializer(serializers.Serializer):
    student_id = serializers.UUIDField()
    score = serializers.IntegerField()
    tier_level = serializers.IntegerField()
    tier_name = serializers.CharField()


class StudentTrustTierSerializer(serializers.Serializer):
    student = StudentSerializer()
    trust_tier = TrustTierSerializer()


class StudentInstitutionAffiliationSerializer(serializers.ModelSerializer):
    institution_name = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()
    student_registration_number = serializers.SerializerMethodField()
    student_trust_level = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    cohort_name = serializers.SerializerMethodField()
    supervisor_name = serializers.SerializerMethodField()
    supervisor_email = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentInstitutionAffiliation
        fields = [
            'id', 'student_id', 'institution_id', 'status', 'claimed_via',
            'reviewed_by', 'review_notes', 'institution_name', 'student_email', 'student_registration_number', 'student_trust_level',
            'department_id', 'cohort_id', 'raw_department_input', 'raw_cohort_input',
            'department_name', 'cohort_name', 'supervisor_name', 'supervisor_email',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['department_name', 'cohort_name', 'student_trust_level', 'supervisor_name', 'supervisor_email']
    
    def get_institution_name(self, obj):
        from edulink.apps.institutions.queries import get_institution_by_id
        try:
            institution = get_institution_by_id(institution_id=obj.institution_id)
            return institution.name
        except:
            return None
    
    def get_student_email(self, obj):
        # Use students_map from context if available to avoid N+1
        students_map = self.context.get('students_map')
        if students_map:
            student = students_map.get(str(obj.student_id))
            return student.email if student else None
            
        try:
            student = Student.objects.get(id=obj.student_id)
            return student.email
        except:
            return None
    
    def get_student_registration_number(self, obj):
        # Use students_map from context if available to avoid N+1
        students_map = self.context.get('students_map')
        if students_map:
            student = students_map.get(str(obj.student_id))
            return student.registration_number if student else None
            
        try:
            student = Student.objects.get(id=obj.student_id)
            return student.registration_number
        except:
            return None

    def get_student_trust_level(self, obj):
        # Use students_map from context if available to avoid N+1
        students_map = self.context.get('students_map')
        if students_map:
            student = students_map.get(str(obj.student_id))
            return student.trust_level if student else 0

        try:
            student = Student.objects.get(id=obj.student_id)
            return student.trust_level
        except:
            return 0

    def get_department_name(self, obj):
        if not obj.department_id:
            return None
        try:
            from edulink.apps.institutions.queries import get_department_by_id
            return get_department_by_id(department_id=obj.department_id).name
        except:
            return None

    def get_cohort_name(self, obj):
        if not obj.cohort_id:
            return None
        try:
            from edulink.apps.institutions.queries import get_cohort_by_id
            return get_cohort_by_id(cohort_id=obj.cohort_id).name
        except:
            return None

    def get_supervisor_name(self, obj):
        from edulink.apps.internships.queries import get_supervisor_for_student
        supervisor = get_supervisor_for_student(student_id=obj.student_id)
        return supervisor["name"] if supervisor else None

    def get_supervisor_email(self, obj):
        from edulink.apps.internships.queries import get_supervisor_for_student
        supervisor = get_supervisor_for_student(student_id=obj.student_id)
        return supervisor["email"] if supervisor else None


class StudentDocumentUploadSerializer(serializers.Serializer):
    document_type = serializers.CharField()
    file_name = serializers.CharField()
    file = serializers.FileField()


class StudentActivityLogSerializer(serializers.Serializer):
    activity_type = serializers.CharField()
    description = serializers.CharField()


class StudentAffiliationClaimSerializer(serializers.Serializer):
    institution_id = serializers.UUIDField()
    claimed_via = serializers.ChoiceField(choices=['domain', 'manual'], default='manual')


class StudentActivityApproveSerializer(serializers.Serializer):
    supervisor_id = serializers.UUIDField()
    activity_id = serializers.CharField()


class StudentInternshipCertifySerializer(serializers.Serializer):
    certificate_id = serializers.CharField(required=False)