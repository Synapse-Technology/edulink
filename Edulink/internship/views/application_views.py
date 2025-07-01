from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from ..models.application import Application
from ..models.internship import Internship
from ..serializers.application_serializers import (
    ApplicationSerializer,
    ApplicationCreateSerializer,
    ApplicationStatusUpdateSerializer,
    ApplicationListSerializer,
)
from ..permissions.role_permissions import (
    CanApplyToInternship,
    CanManageApplication,
)


class ApplicationCreateView(generics.CreateAPIView):
    """
    Create a new application for an internship.
    Only students can apply, and only to eligible internships.
    """
    serializer_class = ApplicationCreateSerializer
    permission_classes = [IsAuthenticated, CanApplyToInternship]

    def perform_create(self, serializer):
        """Set the student automatically"""
        serializer.save(student=self.request.user.student_profile)

    def create(self, request, *args, **kwargs):
        """Create application with validation"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'message': 'Application submitted successfully',
            'application': serializer.data
        }, status=status.HTTP_201_CREATED)


class ApplicationDetailView(generics.RetrieveAPIView):
    """
    Retrieve a specific application.
    Accessible by the student who applied or the employer who posted the internship.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, CanManageApplication]
    queryset = Application.objects.select_related(
        'student', 'student__user', 'internship', 'internship__employer'
    )


class ApplicationUpdateView(generics.UpdateAPIView):
    """
    Update an application (mainly for students to update cover letter or withdraw).
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, CanManageApplication]
    queryset = Application.objects.all()

    def get_serializer_class(self):
        """Use different serializer based on user role"""
        if hasattr(self.request.user, 'employer_profile'):
            return ApplicationStatusUpdateSerializer
        return ApplicationSerializer


class ApplicationStatusUpdateView(generics.UpdateAPIView):
    """
    Update application status (for employers and institution admins).
    """
    serializer_class = ApplicationStatusUpdateSerializer
    permission_classes = [IsAuthenticated, CanManageApplication]
    queryset = Application.objects.all()

    def update(self, request, *args, **kwargs):
        """Update application status with proper validation"""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Application status updated successfully',
            'application': ApplicationSerializer(instance).data
        })


class StudentApplicationListView(generics.ListAPIView):
    """
    List applications submitted by the currently authenticated student.
    """
    serializer_class = ApplicationListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'internship__category']

    def get_queryset(self):
        """Filter applications by the authenticated student"""
        return Application.objects.filter(
            student=self.request.user.student_profile
        ).select_related(
            'internship', 'internship__employer', 'internship__employer__user'
        ).order_by('-application_date')


class EmployerApplicationListView(generics.ListAPIView):
    """
    List applications for internships posted by the currently authenticated employer.
    """
    serializer_class = ApplicationListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'internship__category']

    def get_queryset(self):
        """Filter applications by the authenticated employer's internships"""
        return Application.objects.filter(
            internship__employer=self.request.user.employer_profile
        ).select_related(
            'student', 'student__user', 'internship'
        ).order_by('-application_date')


class InternshipApplicationListView(generics.ListAPIView):
    """
    List all applications for a specific internship.
    Accessible by the employer who posted the internship.
    """
    serializer_class = ApplicationListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']

    def get_queryset(self):
        """Filter applications by specific internship"""
        internship_id = self.kwargs.get('internship_id')
        return Application.objects.filter(
            internship_id=internship_id,
            internship__employer=self.request.user.employer_profile
        ).select_related(
            'student', 'student__user'
        ).order_by('-application_date')


class ApplicationWithdrawView(generics.UpdateAPIView):
    """
    Allow students to withdraw their application.
    """
    serializer_class = ApplicationStatusUpdateSerializer
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.all()

    def get_queryset(self):
        """Only allow students to withdraw their own applications"""
        return Application.objects.filter(student=self.request.user.student_profile)

    def update(self, request, *args, **kwargs):
        """Withdraw the application"""
        instance = self.get_object()
        
        # Check if application can be withdrawn
        if instance.status in ['accepted', 'rejected']:
            return Response({
                'error': 'Cannot withdraw an application that has been accepted or rejected'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        instance.status = 'withdrawn'
        instance.save()
        
        return Response({
            'message': 'Application withdrawn successfully',
            'application': ApplicationSerializer(instance).data
        })


class ApplicationStatisticsView(generics.GenericAPIView):
    """
    Get statistics for applications (for employers and students).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return application statistics based on user role"""
        if hasattr(request.user, 'employer_profile'):
            return self._get_employer_statistics(request)
        elif hasattr(request.user, 'student_profile'):
            return self._get_student_statistics(request)
        else:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    def _get_employer_statistics(self, request):
        """Get statistics for employer's internships"""
        applications = Application.objects.filter(
            internship__employer=request.user.employer_profile
        )
        
        stats = {
            'total_applications': applications.count(),
            'pending_applications': applications.filter(status='pending').count(),
            'accepted_applications': applications.filter(status='accepted').count(),
            'rejected_applications': applications.filter(status='rejected').count(),
            'total_internships': Internship.objects.filter(
                employer=request.user.employer_profile
            ).count(),
            'verified_internships': Internship.objects.filter(
                employer=request.user.employer_profile,
                is_verified=True
            ).count(),
        }
        
        return Response(stats)

    def _get_student_statistics(self, request):
        """Get statistics for student's applications"""
        applications = Application.objects.filter(
            student=request.user.student_profile
        )
        
        stats = {
            'total_applications': applications.count(),
            'pending_applications': applications.filter(status='pending').count(),
            'accepted_applications': applications.filter(status='accepted').count(),
            'rejected_applications': applications.filter(status='rejected').count(),
            'withdrawn_applications': applications.filter(status='withdrawn').count(),
        }
        
        return Response(stats)
