from rest_framework import serializers
from django.contrib.auth import get_user_model
from users.models.employer_profile import EmployerProfile
from users.serializers.profile_serializer import ProfileBaseSerializer

User = get_user_model()


class EmployerSerializer(ProfileBaseSerializer):
    """Serializer for EmployerProfile model."""
    
    email = serializers.EmailField(source='user.email', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    
    class Meta(ProfileBaseSerializer.Meta):
        model = EmployerProfile
        fields = ProfileBaseSerializer.Meta.fields + [
            'email',
            'user_role',
            'company_name',
            'company_description',
            'website',
            'industry',
            'company_size',
            'location',
            'department',
            'position',
            'is_verified',
        ]
        read_only_fields = ProfileBaseSerializer.Meta.read_only_fields + ['is_verified']


class EmployerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating EmployerProfile profiles."""
    
    email = serializers.EmailField(source='user.email')
    password = serializers.CharField(source='user.password', write_only=True)
    role = serializers.CharField(source='user.role', default='employer')
    
    class Meta:
        model = EmployerProfile
        fields = [
            'email',
            'password',
            'role',
            'first_name',
            'last_name',
            'phone_number',
            'company_name',
            'company_description',
            'website',
            'industry',
            'company_size',
            'location',
            'department',
            'position',
        ]
    
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        password = user_data.pop('password')
        
        # Create user with email as username
        user = User.objects.create_user(
            email=user_data['email'],
            password=password,
            role=user_data.get('role', 'employer')
        )
        
        # Create employer profile
        employer = EmployerProfile.objects.create(user=user, **validated_data)
        return employer