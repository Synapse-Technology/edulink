# users/views/institution_views.py

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models.institution_profile import InstitutionProfile
from users.serializers.institution_serializers import InstitutionProfileSerializer
from security.models import SecurityEvent, AuditLog
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from authentication.permissions import IsInstitution
from users.models import StudentProfile
from users.serializers.student_serializer import StudentProfileSerializer

class InstitutionProfileDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = InstitutionProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        try:
            return InstitutionProfile.objects.get(user=self.request.user)  # type: ignore[attr-defined]
        except InstitutionProfile.DoesNotExist:  # type: ignore[attr-defined]
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
                {"detail": "Your institution profile has not been created yet."},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        profile = self.get_object()
        if profile is None:
            return Response(
                {"detail": "Your institution profile has not been created yet."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def perform_update(self, serializer):
        profile = serializer.save()
        
        # Log security event for institution profile update
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='low',
            description=f'Institution profile updated: {profile.first_name} {profile.last_name}',
            user=self.request.user,
            ip_address=self.get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'institution_profile_updated',
                'profile_id': str(profile.id),
                'institution_name': profile.institution.name if profile.institution else None
            }
        )
        
        # Log audit trail
        AuditLog.objects.create(
            action='update',
            user=self.request.user,
            resource_type='InstitutionProfile',
            resource_id=str(profile.id),
            description=f'Updated institution profile: {profile.first_name} {profile.last_name}',
            ip_address=self.get_client_ip(self.request),
            metadata={
                'first_name': profile.first_name,
                'last_name': profile.last_name,
                'institution_name': profile.institution.name if profile.institution else None
            }
        )

class InstitutionStudentsView(ListAPIView):
    """
    Allows an institution admin to view all students from their institution.
    """
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsInstitution]

    def get_queryset(self):
        institution = self.request.user.institutionprofile.institution
        return StudentProfile.objects.filter(institution=institution)

class InstitutionAnalyticsView(APIView):
    """
    Allows an institution admin to access analytics for their institution only.
    """
    permission_classes = [IsAuthenticated, IsInstitution]

    def get(self, request):
        institution = self.request.user.institutionprofile.institution
        total_students = institution.studentprofile_set.count()
        accepted_apps = institution.studentprofile_set.filter(application__status='accepted').distinct().count()
        placement_rate = (accepted_apps / total_students) * 100 if total_students else 0
        return Response({
            "total_students": total_students,
            "accepted_applications": accepted_apps,
            "placement_rate": placement_rate,
        })
