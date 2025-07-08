from rest_framework import serializers
from users.models.institution_profile import InstitutionProfile
from users.serializers.profile_serializer import ProfileBaseSerializer


class InstitutionProfileSerializer(ProfileBaseSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    institution_type = serializers.CharField(source='institution.institution_type', read_only=True)
    registration_number = serializers.CharField(source='institution.registration_number', read_only=True)

    class Meta(ProfileBaseSerializer.Meta):
        model = InstitutionProfile
        fields = ProfileBaseSerializer.Meta.fields + [
            'institution_name',
            'institution_type',
            'registration_number',
            'position'
        ]
