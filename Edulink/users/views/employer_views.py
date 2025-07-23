# users/views/employer_views.py

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models.employer_profile import EmployerProfile
from users.serializers.employer_serializers import EmployerProfileSerializer
from security.models import SecurityEvent, AuditLog

class EmployerProfileDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = EmployerProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        try:
            return EmployerProfile.objects.get(user=self.request.user)
        except EmployerProfile.DoesNotExist:
            return None
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def get(self, request, *args, **kwargs):
        profile = self.get_object()
        if profile is None:
            return Response(
                {"detail": "Your employer profile has not been created yet."},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        profile = self.get_object()
        if profile is None:
            return Response(
                {"detail": "Your employer profile has not been created yet."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def perform_update(self, serializer):
        profile = serializer.save()
        
        # Log security event for employer profile update
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='low',
            description=f'Employer profile updated: {profile.first_name} {profile.last_name}',
            user=self.request.user,
            ip_address=self.get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'employer_profile_updated',
                'profile_id': str(profile.id),
                'employer_name': profile.employer.company_name if profile.employer else None
            }
        )
        
        # Log audit trail
        AuditLog.objects.create(
            action='update',
            user=self.request.user,
            model_name='EmployerProfile',
            object_id=str(profile.id),
            description=f'Updated employer profile: {profile.first_name} {profile.last_name}',
            ip_address=self.get_client_ip(self.request),
            metadata={
                'first_name': profile.first_name,
                'last_name': profile.last_name,
                'employer_name': profile.employer.company_name if profile.employer else None
            }
        )
