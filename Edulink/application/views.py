from rest_framework import generics, status, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from .models import Application
from .serializers import (
    ApplicationSerializer,
    ApplicationCreateSerializer,
    SupervisorFeedbackSerializer,
    ApplicationStatusUpdateSerializer,
    ApplicationListSerializer,
    ApplicationStatisticsSerializer,
)
from .validators import ApplicationValidator, InternshipValidator
from internship.models.internship import Internship
from dashboards.models import StudentActivityLog
from notifications.models import Notification
import logging

logger = logging.getLogger(__name__)


class ApplyToInternshipView(generics.CreateAPIView):
    serializer_class = ApplicationCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """Create application with comprehensive validation"""
        internship = serializer.validated_data['internship']
        user = self.request.user
        
        try:
            # Comprehensive validation
            ApplicationValidator.validate_internship_eligibility(user, internship)
            ApplicationValidator.validate_duplicate_application(user, internship)
            ApplicationValidator.validate_application_limit(user, internship)
            ApplicationValidator.validate_internship_requirements(user, internship)
            
            # Save the application
            application = serializer.save(student=user)
            
            # Log activity for streaks
            student_profile = getattr(user, 'student_profile', None)
            if student_profile:
                StudentActivityLog.objects.get_or_create(
                    student=student_profile,
                    activity_date=timezone.now().date(),
                    activity_type='applied_internship'
                )
            
            # Create notification
            try:
                Notification.objects.create(
                    user=internship.employer.user,
                    title="New Application Received",
                    message=f"New application from {user.get_full_name()} for {internship.title}",
                    notification_type='application_received'
                )
            except Exception as e:
                logger.error(f"Failed to create notification: {e}")
                
        except ValidationError as e:
            # Convert Django ValidationError to DRF ValidationError
            from rest_framework.exceptions import ValidationError as DRFValidationError
            raise DRFValidationError(e.messages if hasattr(e, 'messages') else str(e))

    def create(self, request, *args, **kwargs):
        internship = get_object_or_404(Internship, pk=request.data.get("internship_id"))
        # type: ignore[attr-defined]
        if Application.objects.filter(
            student=request.user, internship=internship
        ).exists():
            return Response(
                {"detail": "You have already applied to this internship."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)


class StudentApplicationListView(generics.ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Application.objects.filter(student=self.request.user)  # type: ignore[attr-defined]


class ApplicationDetailView(generics.RetrieveAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.all()  # type: ignore[attr-defined]


class SupervisorFeedbackView(generics.CreateAPIView):
    serializer_class = SupervisorFeedbackSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()


class EmployerApplicationListView(generics.ListAPIView):
    serializer_class = ApplicationListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, "employer_profile"):
            return Application.objects.none()
        
        queryset = Application.objects.filter(
            internship__employer=user.employer_profile  # type: ignore[attr-defined]
        ).select_related('internship', 'student').order_by('-application_date')
        
        # Support for recent applications (limit parameter)
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                queryset = queryset[:limit]
            except ValueError:
                pass
                
        return queryset


class InternshipApplicationListView(generics.ListAPIView):
    serializer_class = ApplicationListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        internship_id = self.kwargs.get("internship_id")
        return Application.objects.filter(internship_id=internship_id)  # type: ignore[attr-defined]


class ApplicationStatusUpdateView(generics.UpdateAPIView):
    serializer_class = ApplicationStatusUpdateSerializer
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.all()  # type: ignore[attr-defined]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')
        
        # Validate status transition
        if new_status:
            try:
                ApplicationValidator.validate_application_status_transition(
                    instance, new_status, request.user
                )
            except ValidationError as e:
                from rest_framework.exceptions import ValidationError as DRFValidationError
                raise DRFValidationError(e.messages if hasattr(e, 'messages') else str(e))
        
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Store old status for comparison
        old_status = instance.status
        self.perform_update(serializer)
        
        # Set status-specific timestamps
        if new_status and new_status != old_status:
            if new_status == 'under_review':
                instance.reviewed_at = timezone.now()
            elif new_status == 'accepted':
                instance.accepted_at = timezone.now()
            elif new_status == 'rejected':
                instance.rejected_at = timezone.now()
            instance.save()
            
            # Create status change notification
            try:
                Notification.objects.create(
                    user=instance.student,
                    title="Application Status Updated",
                    message=f"Your application for {instance.internship.title} has been {new_status.replace('_', ' ')}",
                    notification_type='application_status_change'
                )
            except Exception as e:
                logger.error(f"Failed to create status change notification: {e}")
        
        return Response(
            {
                "message": "Application status updated",
                "application": ApplicationSerializer(instance).data,
            }
        )


class ApplicationWithdrawView(generics.UpdateAPIView):
    serializer_class = ApplicationStatusUpdateSerializer
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.all()  # type: ignore[attr-defined]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status in ["accepted", "rejected"]:
            return Response(
                {
                    "error": "Cannot withdraw an application that has been accepted or rejected"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.status = "withdrawn"
        instance.save()
        return Response(
            {
                "message": "Application withdrawn successfully",
                "application": ApplicationSerializer(instance).data,
            }
        )


class ApplicationStatisticsView(generics.GenericAPIView):
    serializer_class = ApplicationStatisticsSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if hasattr(request.user, "employer_profile"):
            applications = Application.objects.filter(
                internship__employer=request.user.employer_profile  # type: ignore[attr-defined]
            )  # type: ignore[attr-defined]
            stats = {
                "total_applications": applications.count(),
                "pending_applications": applications.filter(status="pending").count(),
                "accepted_applications": applications.filter(status="accepted").count(),
                "rejected_applications": applications.filter(status="rejected").count(),
                "withdrawn_applications": applications.filter(
                    status="withdrawn"
                ).count(),
                # type: ignore[attr-defined]
                "total_internships": Internship.objects.filter(
                    employer=request.user.employer_profile  # type: ignore[attr-defined]
                ).count(),
                # type: ignore[attr-defined]
                "verified_internships": Internship.objects.filter(
                    employer=request.user.employer_profile, is_verified=True  # type: ignore[attr-defined]
                ).count(),
            }
        elif hasattr(request.user, "student_profile"):
            applications = Application.objects.filter(
                student=request.user  # type: ignore[attr-defined]
            )  # type: ignore[attr-defined]
            stats = {
                "total_applications": applications.count(),
                "pending_applications": applications.filter(status="pending").count(),
                "accepted_applications": applications.filter(status="accepted").count(),
                "rejected_applications": applications.filter(status="rejected").count(),
                "withdrawn_applications": applications.filter(
                    status="withdrawn"
                ).count(),
            }
        else:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        return Response(stats)


class InstitutionApplicationListView(generics.ListAPIView):
    serializer_class = ApplicationListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, "institution_profile"):
            institution = self.request.user.institution_profile.institution  # type: ignore[attr-defined]
            return Application.objects.filter(student__student_profile__institution=institution)  # type: ignore[attr-defined]
        return Application.objects.none()  # type: ignore[attr-defined]


class RecentApplicationsView(generics.ListAPIView):
    """API endpoint for recent applications with enhanced data for dashboard"""
    serializer_class = ApplicationListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, "employer_profile"):
            return Application.objects.none()
        
        # Get recent applications with related data
        queryset = Application.objects.filter(
            internship__employer=user.employer_profile
        ).select_related(
            'internship', 'student'
        ).order_by('-application_date')
        
        # Default limit to 10 recent applications
        limit = int(self.request.query_params.get('limit', 10))
        return queryset[:limit]
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Enhanced data structure for dashboard
        recent_applications = []
        for app in queryset:
            recent_applications.append({
                'id': app.id,
                'student_name': f"{app.student.first_name} {app.student.last_name}",
                'student_email': app.student.email,
                'internship_title': app.internship.title,
                'internship_id': app.internship.id,
                'status': app.status,
                'application_date': app.application_date,
                'created_at': app.application_date,
                'applied_on': app.application_date,
                'cover_letter_excerpt': app.cover_letter[:100] + '...' if app.cover_letter and len(app.cover_letter) > 100 else app.cover_letter,
                'resume': app.resume.url if app.resume else None,
                'is_active': app.is_active
            })
        
        return Response({
            'results': recent_applications,
            'count': len(recent_applications)
        })
