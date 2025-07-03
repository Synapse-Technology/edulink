from rest_framework import serializers
from users.models.student_profile import StudentProfile
from users.serializers.profile_serializer import ProfileBaseSerializer

class StudentProfileSerializer(ProfileBaseSerializer):
    class Meta(ProfileBaseSerializer.Meta):
        model = StudentProfile
        fields = ProfileBaseSerializer.Meta.fields + [
            'institution',
            'course',
            'national_id',
            'admission_number',
            'academic_year',
            'skills',
            'interests',
            'career_goals',
            'internship_status',
        ]
