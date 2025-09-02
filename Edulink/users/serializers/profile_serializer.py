from rest_framework import serializers
from users.models.profile_base import ProfileBase


class ProfileBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileBase
        # We include all common fields defined in the abstract base
        fields = [
            'first_name',
            'last_name',
            'phone_number',
            'profile_picture',
            'phone_verified',
            'is_active',
            'last_login_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['phone_verified',
                            'is_active', 'last_login_at', 'created_at', 'updated_at']
