from rest_framework import serializers
from users.models.student_profile import StudentProfile
from users.serializers.profile_serializer import ProfileBaseSerializer

class StudentProfileSerializer(ProfileBaseSerializer):
    class Meta(ProfileBaseSerializer.Meta):
        model = StudentProfile
        fields = ProfileBaseSerializer.Meta.fields + [
            'institution_name',
            'registration_number',
            'academic_year',
            'institution',
            'national_id',
        ]
