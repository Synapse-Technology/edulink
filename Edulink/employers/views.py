from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from django.utils import timezone
from django.shortcuts import get_object_or_404
from users.models.employer_profile import EmployerProfile
from users.serializers.employer_serializers import EmployerProfileSerializer
from security.models import SecurityEvent, AuditLog
from internship.models.internship import Internship
from internship.serializers import InternshipSerializer
from application.models import Application
from application.serializers import ApplicationSerializer
from institutions.models import Institution
from .models import (
    CompanySettings, OpportunityImage, VisibilityControl, 
    ApplicationRequirement, CustomApplicationQuestion
)
from .serializers import (
    CompanySettingsSerializer, OpportunityImageSerializer,
    VisibilityControlSerializer, ApplicationRequirementSerializer,
    CustomApplicationQuestionSerializer
)
from .permissions import IsEmployerOwner

class CreateEmployerView(generics.CreateAPIView):
    queryset = EmployerProfile.objects.all()
    serializer_class = EmployerProfileSerializer
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
        # The related name from the User model to Employer is 'employer_profile'
        try:
            return self.request.user.employer_profile
        except AttributeError:
            from rest_framework.exceptions import NotFound
            raise NotFound("Employer profile not found for this user.")
    
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
    queryset = EmployerProfile.objects.all()
    serializer_class = EmployerProfileSerializer
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
    serializer_class = InternshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter internships based on the employer profile linked to the user
        try:
            return Internship.objects.filter(employer=self.request.user.employer_profile)  # type: ignore[attr-defined]
        except AttributeError:
            # Return empty queryset if user doesn't have an employer profile
            return Internship.objects.none()


class InternshipApplicationListView(generics.ListAPIView):
    """
    List all applications for a specific internship owned by the employer.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsEmployerOwner]

    def get_queryset(self):
        internship_id = self.kwargs.get('internship_id')
        return Application.objects.filter(internship_id=internship_id)  # type: ignore[attr-defined]


class CompanySettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing company settings including logo."""
    
    serializer_class = CompanySettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return company settings for the current employer."""
        try:
            employer_profile = self.request.user.employer_profile
            return CompanySettings.objects.filter(employer_profile=employer_profile)
        except AttributeError:
            return CompanySettings.objects.none()
    
    def perform_create(self, serializer):
        """Create company settings for the current employer."""
        employer_profile = self.request.user.employer_profile
        serializer.save(employer_profile=employer_profile)
        
        # Log security event
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='low',
            description=f'Company settings created for {employer_profile.company_name}',
            user=self.request.user,
            ip_address=self.get_client_ip(self.request),
            metadata={'action': 'company_settings_created'}
        )
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class OpportunityImageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing opportunity images."""
    
    serializer_class = OpportunityImageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return opportunity images for internships owned by the current employer."""
        try:
            employer_profile = self.request.user.employer_profile
            internship_ids = Internship.objects.filter(
                employer=employer_profile
            ).values_list('id', flat=True)
            return OpportunityImage.objects.filter(internship_id__in=internship_ids)
        except AttributeError:
            return OpportunityImage.objects.none()


class VisibilityControlViewSet(viewsets.ModelViewSet):
    """ViewSet for managing opportunity visibility controls."""
    
    serializer_class = VisibilityControlSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return visibility controls for internships owned by the current employer."""
        try:
            employer_profile = self.request.user.employer_profile
            internship_ids = Internship.objects.filter(
                employer=employer_profile
            ).values_list('id', flat=True)
            return VisibilityControl.objects.filter(internship_id__in=internship_ids)
        except AttributeError:
            return VisibilityControl.objects.none()
    
    @action(detail=False, methods=['get'])
    def available_institutions(self, request):
        """Get list of available institutions for restriction."""
        institutions = Institution.objects.filter(is_verified=True).values(
            'id', 'name', 'institution_type'
        )
        return Response(list(institutions))


class ApplicationRequirementViewSet(viewsets.ModelViewSet):
    """ViewSet for managing application requirements."""
    
    serializer_class = ApplicationRequirementSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return application requirements for internships owned by the current employer."""
        try:
            employer_profile = self.request.user.employer_profile
            internship_ids = Internship.objects.filter(
                employer=employer_profile
            ).values_list('id', flat=True)
            return ApplicationRequirement.objects.filter(internship_id__in=internship_ids)
        except AttributeError:
            return ApplicationRequirement.objects.none()


class CustomApplicationQuestionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing custom application questions."""
    
    serializer_class = CustomApplicationQuestionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return custom questions for application requirements owned by the current employer."""
        try:
            employer_profile = self.request.user.employer_profile
            internship_ids = Internship.objects.filter(
                employer=employer_profile
            ).values_list('id', flat=True)
            requirement_ids = ApplicationRequirement.objects.filter(
                internship_id__in=internship_ids
            ).values_list('id', flat=True)
            return CustomApplicationQuestion.objects.filter(
                application_requirement_id__in=requirement_ids
            )
        except AttributeError:
            return CustomApplicationQuestion.objects.none()


class EnhancedInternshipCreateView(generics.CreateAPIView):
    """Enhanced view for creating internships with new features."""
    
    serializer_class = InternshipSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Create internship with enhanced features."""
        employer_profile = self.request.user.employer_profile
        internship = serializer.save(employer=employer_profile)
        
        # Create related objects based on request data
        self._create_visibility_control(internship)
        self._create_application_requirement(internship)
        self._create_opportunity_image(internship)
        
        # Log security event
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='medium',
            description=f'Enhanced internship created: {internship.title}',
            user=self.request.user,
            ip_address=self.get_client_ip(self.request),
            metadata={
                'action': 'enhanced_internship_created',
                'internship_id': str(internship.id)
            }
        )
    
    def _create_visibility_control(self, internship):
        """Create visibility control for the internship."""
        visibility_data = self.request.data.get('visibility_control', {})
        visibility_type = visibility_data.get('visibility_type', 'public')
        restricted_institutions = visibility_data.get('restricted_institutions', [])
        
        visibility_control = VisibilityControl.objects.create(
            internship=internship,
            visibility_type=visibility_type
        )
        
        if visibility_type == 'restricted' and restricted_institutions:
            institutions = Institution.objects.filter(id__in=restricted_institutions)
            visibility_control.restricted_institutions.set(institutions)
    
    def _create_application_requirement(self, internship):
        """Create application requirement for the internship."""
        app_req_data = self.request.data.get('application_requirement', {})
        require_cover_letter = app_req_data.get('require_cover_letter', False)
        enable_custom_questions = app_req_data.get('enable_custom_questions', False)
        
        app_requirement = ApplicationRequirement.objects.create(
            internship=internship,
            require_cover_letter=require_cover_letter,
            enable_custom_questions=enable_custom_questions
        )
        
        # Create custom questions if enabled
        if enable_custom_questions:
            custom_questions = app_req_data.get('custom_questions', [])
            for i, question_data in enumerate(custom_questions):
                CustomApplicationQuestion.objects.create(
                    application_requirement=app_requirement,
                    question_text=question_data.get('question_text', ''),
                    question_type=question_data.get('question_type', 'text'),
                    is_required=question_data.get('is_required', True),
                    order=i,
                    choices=question_data.get('choices', [])
                )
    
    def _create_opportunity_image(self, internship):
        """Create opportunity image if provided."""
        image_file = self.request.FILES.get('opportunity_image')
        alt_text = self.request.data.get('opportunity_image_alt_text', '')
        
        if image_file:
            OpportunityImage.objects.create(
                internship=internship,
                image=image_file,
                alt_text=alt_text
            )
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
