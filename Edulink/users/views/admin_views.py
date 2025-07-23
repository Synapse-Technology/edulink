# users/views/admin_views.py

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.utils import timezone

from users.models.institution_profile import InstitutionProfile
from users.models.employer_profile import EmployerProfile
from users.serializers.institution_serializers import InstitutionProfileSerializer
from users.serializers.employer_serializers import EmployerProfileSerializer
from security.models import SecurityEvent, AuditLog

class CreateInstitutionProfileView(generics.CreateAPIView):
    serializer_class = InstitutionProfileSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        user_id = request.data.get("user")
        if not user_id:
            return Response({"detail": "User ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        if InstitutionProfile.objects.filter(user_id=user_id).exists():
            return Response({"detail": "Institution profile already exists for this user."}, status=status.HTTP_400_BAD_REQUEST)

        response = super().create(request, *args, **kwargs)
        
        # Log security event for profile creation
        if response.status_code == status.HTTP_201_CREATED:
            ip_address = self.get_client_ip(request)
            SecurityEvent.objects.create(
                event_type='profile_created',
                user=request.user,
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'profile_type': 'institution',
                    'target_user_id': user_id,
                    'created_by': request.user.email
                }
            )
            
            # Log audit trail
            AuditLog.objects.create(
                user=request.user,
                action='CREATE_INSTITUTION_PROFILE',
                resource_type='InstitutionProfile',
                resource_id=response.data.get('id'),
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={'target_user_id': user_id}
            )
        
        return response
    
    def get_client_ip(self, request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class CreateEmployerProfileView(generics.CreateAPIView):
    serializer_class = EmployerProfileSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        user_id = request.data.get("user")
        if not user_id:
            return Response({"detail": "User ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        if EmployerProfile.objects.filter(user_id=user_id).exists():
            return Response({"detail": "Employer profile already exists for this user."}, status=status.HTTP_400_BAD_REQUEST)

        response = super().create(request, *args, **kwargs)
        
        # Log security event for profile creation
        if response.status_code == status.HTTP_201_CREATED:
            ip_address = self.get_client_ip(request)
            SecurityEvent.objects.create(
                event_type='profile_created',
                user=request.user,
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'profile_type': 'employer',
                    'target_user_id': user_id,
                    'created_by': request.user.email
                }
            )
            
            # Log audit trail
            AuditLog.objects.create(
                user=request.user,
                action='CREATE_EMPLOYER_PROFILE',
                resource_type='EmployerProfile',
                resource_id=response.data.get('id'),
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={'target_user_id': user_id}
            )
        
        return response
    
    def get_client_ip(self, request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
