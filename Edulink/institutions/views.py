from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from users.serializers.institution_serializers import InstitutionProfileSerializer
from users.models.student_profile import StudentProfile
from users.serializers.student_serializer import StudentProfileSerializer
from application.models import Application
from application.serializers import ApplicationSerializer, ApplicationStatusUpdateSerializer
from .models import Institution
from .serializers import InstitutionSerializer
from django.utils import timezone
from security.models import SecurityEvent, AuditLog
from .permissions import IsInstitutionAdmin

class CreateInstitutionView(generics.CreateAPIView):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAuthenticated]  # Can tighten later if needed
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def perform_create(self, serializer):
        institution = serializer.save()
        
        # Log security event for institution creation
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='medium',
            description=f'New institution created: {institution.name}',
            user=self.request.user,
            ip_address=self.get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'institution_created',
                'institution_id': str(institution.id),
                'institution_name': institution.name,
                'institution_type': institution.institution_type
            }
        )
        
        # Log audit trail
        AuditLog.objects.create(
            action='create',
            user=self.request.user,
            model_name='Institution',
            object_id=str(institution.id),
            description=f'Created institution: {institution.name}',
            ip_address=self.get_client_ip(self.request),
            metadata={
                'institution_name': institution.name,
                'institution_type': institution.institution_type,
                'registration_number': institution.registration_number
            }
        )

class InstitutionProfileDetailView(generics.RetrieveUpdateAPIView):
    """
    View and update the profile for the currently authenticated institution admin.
    """
    serializer_class = InstitutionProfileSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def get_object(self):
        return self.request.user.institution_profile
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def perform_update(self, serializer):
        institution = serializer.save()
        
        # Log security event for institution update
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='low',
            description=f'Institution updated: {institution.name}',
            user=self.request.user,
            ip_address=self.get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'institution_updated',
                'institution_id': str(institution.id),
                'institution_name': institution.name
            }
        )
        
        # Log audit trail
        AuditLog.objects.create(
            action='update',
            user=self.request.user,
            model_name='Institution',
            object_id=str(institution.id),
            description=f'Updated institution: {institution.name}',
            ip_address=self.get_client_ip(self.request),
            metadata={
                'institution_name': institution.name,
                'institution_type': institution.institution_type
            }
        )

class VerifyInstitutionView(generics.UpdateAPIView):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAdminUser]
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def patch(self, request, *args, **kwargs):
        institution = self.get_object()
        institution.is_verified = True
        institution.verified_at = timezone.now()
        institution.save()
        
        # Log security event for institution verification
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='medium',
            description=f'Institution verified by admin: {institution.name}',
            user=request.user,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'institution_verified',
                'institution_id': str(institution.id),
                'institution_name': institution.name,
                'verified_by': request.user.email
            }
        )
        
        # Log audit trail
        AuditLog.objects.create(
            action='update',
            user=request.user,
            model_name='Institution',
            object_id=str(institution.id),
            description=f'Verified institution: {institution.name}',
            ip_address=self.get_client_ip(request),
            metadata={
                'institution_name': institution.name,
                'verified_at': institution.verified_at.isoformat(),
                'verified_by': request.user.email
            }
        )
        
        return Response(
            {"detail": "Institution verified successfully."},
            status=status.HTTP_200_OK
        )


class InstitutionStudentListView(generics.ListAPIView):
    """
    List all students associated with the institution of the authenticated admin.
    """
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def get_queryset(self):
        institution = self.request.user.institution_profile.institution
        return StudentProfile.objects.filter(institution=institution)  # type: ignore[attr-defined]


class InstitutionApplicationListView(generics.ListAPIView):
    """
    List all internship applications from students of the authenticated admin's institution.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def get_queryset(self):
        institution = self.request.user.institution_profile.institution
        return Application.objects.filter(student__institution=institution)  # type: ignore[attr-defined]


class ApplicationStatusUpdateView(generics.UpdateAPIView):
    """
    Approve or reject a specific internship application.
    Accessible only by the institution admin to which the student applicant belongs.
    """
    serializer_class = ApplicationStatusUpdateSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]
    lookup_field = 'id'

    def get_queryset(self):
        """
        Ensure that the admin can only update applications from their own institution.
        """
        institution = self.request.user.institution_profile.institution
        return Application.objects.filter(student__institution=institution)  # type: ignore[attr-defined]
