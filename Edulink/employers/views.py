from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from .models import Employer
from .serializers import EmployerSerializer
from security.models import SecurityEvent, AuditLog
from users.serializers.employer_serializers import EmployerProfileSerializer
from internship.models.internship import Internship
from application.models import Application
from application.serializers import ApplicationSerializer
from .permissions import IsEmployerOwner

class CreateEmployerView(generics.CreateAPIView):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def perform_create(self, serializer):
        employer = serializer.save()
        
        # Log security event for employer creation
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='medium',
            description=f'New employer profile created: {employer.company_name}',
            user=self.request.user,
            ip_address=self.get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'employer_profile_created',
                'employer_id': str(employer.id),
                'company_name': employer.company_name
            }
        )
        
        # Log audit trail
        AuditLog.objects.create(
            action='create',
            user=self.request.user,
            resource_type='Employer',
            resource_id=str(employer.id),
            description=f'Created employer profile for {employer.company_name}',
            ip_address=self.get_client_ip(self.request),
            metadata={
                'company_name': employer.company_name,
                'industry': employer.industry
            }
        )

class EmployerProfileDetailView(generics.RetrieveUpdateAPIView):
    """
    View and update the profile for the currently authenticated employer.
    """
    serializer_class = EmployerProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # The related name from the User model to Employer is 'employer_company_profile'
        return self.request.user.employer_company_profile
    
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
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
    
    def perform_update(self, serializer):
        employer = serializer.save()
        
        # Log security event for employer profile update
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='low',
            description=f'Employer profile updated: {employer.company_name}',
            user=self.request.user,
            ip_address=self.get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'employer_profile_updated',
                'employer_id': str(employer.id),
                'company_name': employer.company_name
            }
        )
        
        # Log audit trail
        AuditLog.objects.create(
            action='update',
            user=self.request.user,
            resource_type='Employer',
            resource_id=str(employer.id),
            description=f'Updated employer profile for {employer.company_name}',
            ip_address=self.get_client_ip(self.request),
            metadata={
                'company_name': employer.company_name,
                'industry': employer.industry
            }
        )

class VerifyEmployerView(generics.UpdateAPIView):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer
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
        employer = self.get_object()
        employer.is_verified = True
        employer.save()
        
        # Log security event for employer verification
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='medium',
            description=f'Employer verified by admin: {employer.company_name}',
            user=request.user,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'employer_verified',
                'employer_id': str(employer.id),
                'company_name': employer.company_name,
                'verified_by': request.user.email
            }
        )
        
        # Log audit trail
        AuditLog.objects.create(
            action='update',
            user=request.user,
            resource_type='Employer',
            resource_id=str(employer.id),
            description=f'Verified employer: {employer.company_name}',
            ip_address=self.get_client_ip(request),
            metadata={
                'company_name': employer.company_name,
                'verified_by': request.user.email
            }
        )
        
        return Response(
            {"detail": "Employer verified successfully."},
            status=status.HTTP_200_OK
        )

class EmployerInternshipListView(generics.ListAPIView):
    """
    List all internships posted by the currently authenticated employer.
    """
    # serializer_class = InternshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter internships based on the employer profile linked to the user
        return Internship.objects.filter(employer=self.request.user.employer_company_profile)  # type: ignore[attr-defined]


class InternshipApplicationListView(generics.ListAPIView):
    """
    List all applications for a specific internship owned by the employer.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsEmployerOwner]

    def get_queryset(self):
        internship_id = self.kwargs.get('internship_id')
        return Application.objects.filter(internship_id=internship_id)  # type: ignore[attr-defined]

# Create your views here.
