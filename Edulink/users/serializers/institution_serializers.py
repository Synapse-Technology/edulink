from rest_framework import serializers
from users.models.institution_profile import InstitutionProfile
from users.serializers.profile_serializer import ProfileBaseSerializer

class InstitutionProfileSerializer(ProfileBaseSerializer):
    class Meta(ProfileBaseSerializer.Meta):
        model = InstitutionProfile
        fields = ProfileBaseSerializer.Meta.fields + [
            'institution_name',
            'institution_type',
            'registration_number',
            'contact_email',
            'contact_phone',
            'verification_status',
        ]
