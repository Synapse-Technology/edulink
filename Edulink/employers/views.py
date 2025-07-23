from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from .models import Employer
from .serializers import EmployerSerializer
from security.models import SecurityEvent, AuditLog

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
            model_name='Employer',
            object_id=str(employer.id),
            description=f'Created employer profile for {employer.company_name}',
            ip_address=self.get_client_ip(self.request),
            metadata={
                'company_name': employer.company_name,
                'industry': employer.industry
            }
        )

class EmployerDetailView(generics.RetrieveUpdateAPIView):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return Employer.objects.get(user=self.request.user)
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
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
            model_name='Employer',
            object_id=str(employer.id),
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
        employer.verified_at = timezone.now()
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
            model_name='Employer',
            object_id=str(employer.id),
            description=f'Verified employer: {employer.company_name}',
            ip_address=self.get_client_ip(request),
            metadata={
                'company_name': employer.company_name,
                'verified_at': employer.verified_at.isoformat(),
                'verified_by': request.user.email
            }
        )
        
        return Response(
            {"detail": "Employer verified successfully."},
            status=status.HTTP_200_OK
        )


# Create your views here.
