from rest_framework import serializers
from users.models.employer_profile import EmployerProfile
from users.serializers.profile_serializer import ProfileBaseSerializer


class EmployerProfileSerializer(ProfileBaseSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta(ProfileBaseSerializer.Meta):
        model = EmployerProfile
        fields = ProfileBaseSerializer.Meta.fields + [
            'email',
            'company_name',
            'industry',
            'company_size',
            'location',
            'website',
            'department',
            'position',
        ]
