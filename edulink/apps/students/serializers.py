from rest_framework import serializers
from .models import Student, StudentInstitutionAffiliation
from urllib.parse import urlparse


def _build_storage_file_url(field_file, request=None):
    """Build URL from the field storage backend without hardcoding MEDIA_URL."""
    if not field_file:
        return None

    try:
        url = field_file.url
    except Exception:
        return None

    if not request or not url:
        return url

    parsed = urlparse(url)
    if parsed.scheme and parsed.netloc:
        return url

    return request.build_absolute_uri(url)


class StudentSerializer(serializers.ModelSerializer):
    # Construct full URL for profile picture
    profile_picture_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'id', 'user_id', 'institution_id', 'email', 'registration_number', 'is_verified', 
            'course_of_study', 'current_year', 'skills',
            'profile_picture', 'profile_picture_url', 'cv', 'admission_letter', 'id_document',
            'trust_level', 'trust_points',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['trust_level', 'trust_points', 'profile_picture', 'profile_picture_url', 'cv', 'admission_letter', 'id_document']
    
    def get_profile_picture_url(self, obj):
        """Return profile picture URL from the configured storage backend."""
        request = self.context.get('request')
        return _build_storage_file_url(obj.profile_picture, request=request)

    def to_representation(self, instance):
        """Resolve all student file fields through the configured storage backend."""
        data = super().to_representation(instance)
        request = self.context.get('request')

        for file_field in ['cv', 'admission_letter', 'id_document', 'profile_picture']:
            data[file_field] = _build_storage_file_url(getattr(instance, file_field, None), request=request)

        return data
    
    def validate_registration_number(self, value):
        """registration_number is required for profile completion."""
        if not value:
            raise serializers.ValidationError("Registration number is required.")
        return value
    
    def validate_course_of_study(self, value):
        """course_of_study is required for profile completion."""
        if not value or not value.strip():
            raise serializers.ValidationError("Course of study is required.")
        return value
    
    def validate_current_year(self, value):
        """current_year must be in valid range if provided."""
        if value:
            try:
                year = int(value)
                if year < 1 or year > 8:
                    raise serializers.ValidationError("Current year must be between 1 and 8.")
            except (ValueError, TypeError):
                raise serializers.ValidationError("Current year must be a valid number.")
        return value
    
    def validate_skills(self, value):
        """skills list must be non-empty for profile completion."""
        if isinstance(value, list) and not value:
            raise serializers.ValidationError("You must add at least one skill.")
        return value


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
        # Use institutions_map from context if available to avoid N+1
        institutions_map = self.context.get('institutions_map')
        if institutions_map:
            institution = institutions_map.get(str(obj.institution_id))
            return institution.name if institution else None
        
        # Fallback (in case context not set)
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