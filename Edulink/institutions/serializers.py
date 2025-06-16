from rest_framework import serializers
from .models import Institution

class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = [
            'id',
            'name',
            'institution_type',
            'registration_number',
            'email',
            'phone_number',
            'website',
            'address',
            'is_verified',
            'verified_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['is_verified', 'verified_at', 'created_at', 'updated_at']
