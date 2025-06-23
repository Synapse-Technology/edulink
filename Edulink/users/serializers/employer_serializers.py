from rest_framework import serializers
from users.models.employer_profile import EmployerProfile
from users.serializers.profile_serializer import ProfileBaseSerializer

class EmployerProfileSerializer(ProfileBaseSerializer):
    class Meta(ProfileBaseSerializer.Meta):
        model = EmployerProfile
        fields = ProfileBaseSerializer.Meta.fields + [
            'company_name',
            'industry',
            'company_size',
            'location',
            'website',
            'department',
            'position',
        ]
