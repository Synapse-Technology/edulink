from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.db.models import Q, Count, Avg, F
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
import sys
import os

# Add shared modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

from .models import (
    Application,
    ApplicationDocument,
    SupervisorFeedback,
    ApplicationNote,
    ApplicationStatusHistory
)
from .serializers import (
    ApplicationListSerializer,
    ApplicationDetailSerializer,
    ApplicationCreateSerializer,
    ApplicationStatusUpdateSerializer,
    ApplicationDocumentSerializer,
    SupervisorFeedbackSerializer,
    ApplicationNoteSerializer,
    ApplicationStatsSerializer
)
from .permissions import (
    IsStudentOwner,
    IsEmployerOwner,
    IsReviewer,
    CanViewApplication,
    CanEditApplication,
    CanManageApplicationStatus,
    CanScheduleInterview,
    CanProvideFeedback,
    CanViewApplicationStats,
    IsApplicationActive,
    ServicePermissionMixin
)
from .filters import ApplicationFilter
from event_publisher import EventPublisher
from service_clients import UserServiceClient, InternshipServiceClient


class ApplicationViewSet(viewsets.ModelViewSet, ServicePermissionMixin):
    """ViewSet for managing applications"""
    
    queryset = Application.objects.all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ApplicationFilter
    search_fields = ['cover_letter', 'review_notes', 'interview_notes']
    ordering_fields = ['application_date', 'status_changed_at', 'priority_score']
    ordering = ['-application_date']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return ApplicationListSerializer
        elif self.action == 'create':
            return ApplicationCreateSerializer
        elif self.action in ['update_status', 'partial_update_status']:
            return ApplicationStatusUpdateSerializer
        return ApplicationDetailSerializer
    
    def get_permissions(self):
        """Return appropriate permissions based on action"""
        if self.action == 'list':
            permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'create':
            permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'retrieve':
            permission_classes = [permissions.IsAuthenticated, CanViewApplication]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [permissions.IsAuthenticated, CanEditApplication]
        elif self.action == 'destroy':
            permission_classes = [permissions.IsAuthenticated, IsStudentOwner]
        elif self.action in ['update_status', 'partial_update_status']:
            permission_classes = [permissions.IsAuthenticated, CanManageApplicationStatus]
        elif self.action == 'schedule_interview':
            permission_classes = [permissions.IsAuthenticated, CanScheduleInterview]
        elif self.action == 'withdraw':
            permission_classes = [permissions.IsAuthenticated, IsStudentOwner]
        elif self.action in ['my_applications', 'employer_applications']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'stats':
            permission_classes = [permissions.IsAuthenticated, CanViewApplicationStats]
        else:
            permission_classes = [permissions.IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role and permissions"""
        user = self.request.user
        if not user.is_authenticated:
            return Application.objects.none()
        
        # Get user role from user service
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(user.id)
            user_role = user_data.get('role', '')
        except:
            user_role = ''
        
        queryset = Application.objects.all()
        
        # Filter based on user role
        if user_role == 'admin':
            # Admin can see all applications
            pass
        elif user_role == 'student':
            # Students can only see their own applications
            queryset = queryset.filter(student_id=user.id)
        elif user_role == 'employer':
            # Employers can see applications for their internships
            queryset = queryset.filter(employer_id=user.id)
        elif user_role == 'institution_admin':
            # Institution admins can see applications from their students
            try:
                institution_id = user_data.get('institution_id')
                # Get student IDs from the same institution
                student_ids = user_client.get_institution_students(institution_id)
                queryset = queryset.filter(student_id__in=student_ids)
            except:
                queryset = Application.objects.none()
        else:
            queryset = Application.objects.none()
        
        return queryset.select_related().prefetch_related(
            'documents', 'notes', 'status_history'
        )
    
    def perform_create(self, serializer):
        """Create application and publish event"""
        application = serializer.save()
        
        # Publish application created event
        self.publish_event('application.created', {
            'application_id': application.id,
            'student_id': application.student_id,
            'internship_id': application.internship_id,
            'employer_id': application.employer_id,
            'status': application.status,
            'application_date': application.application_date.isoformat()
        })
    
    def perform_update(self, serializer):
        """Update application and publish event"""
        old_instance = self.get_object()
        application = serializer.save()
        
        # Publish application updated event
        self.publish_event('application.updated', {
            'application_id': application.id,
            'student_id': application.student_id,
            'internship_id': application.internship_id,
            'old_status': old_instance.status,
            'new_status': application.status,
            'updated_by': self.request.user.id
        })
    
    def perform_destroy(self, instance):
        """Delete application and publish event"""
        application_data = {
            'application_id': instance.id,
            'student_id': instance.student_id,
            'internship_id': instance.internship_id,
            'status': instance.status
        }
        
        super().perform_destroy(instance)
        
        # Publish application deleted event
        self.publish_event('application.deleted', application_data)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update application status"""
        application = self.get_object()
        serializer = ApplicationStatusUpdateSerializer(
            application, data=request.data, partial=True, context={'request': request}
        )
        
        if serializer.is_valid():
            old_status = application.status
            updated_application = serializer.save()
            
            # Publish status change event
            self.publish_event('application.status_changed', {
                'application_id': updated_application.id,
                'student_id': updated_application.student_id,
                'internship_id': updated_application.internship_id,
                'old_status': old_status,
                'new_status': updated_application.status,
                'changed_by': request.user.id,
                'reason': request.data.get('reason', '')
            })
            
            return Response(ApplicationDetailSerializer(updated_application).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def schedule_interview(self, request, pk=None):
        """Schedule interview for application"""
        application = self.get_object()
        
        interview_date = request.data.get('interview_date')
        interview_location = request.data.get('interview_location', '')
        interview_type = request.data.get('interview_type', 'in_person')
        interview_notes = request.data.get('interview_notes', '')
        
        if not interview_date:
            return Response(
                {'error': 'Interview date is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            interview_datetime = timezone.datetime.fromisoformat(interview_date.replace('Z', '+00:00'))
        except ValueError:
            return Response(
                {'error': 'Invalid interview date format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update application with interview details
        application.interview_date = interview_datetime
        application.interview_location = interview_location
        application.interview_type = interview_type
        application.interview_notes = interview_notes
        application.status = 'interview_scheduled'
        application.save()
        
        # Create status history
        ApplicationStatusHistory.objects.create(
            application=application,
            from_status='under_review',
            to_status='interview_scheduled',
            changed_by_id=request.user.id,
            reason='Interview scheduled'
        )
        
        # Publish interview scheduled event
        self.publish_event('application.interview_scheduled', {
            'application_id': application.id,
            'student_id': application.student_id,
            'internship_id': application.internship_id,
            'interview_date': interview_datetime.isoformat(),
            'interview_type': interview_type,
            'scheduled_by': request.user.id
        })
        
        return Response(ApplicationDetailSerializer(application).data)
    
    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        """Withdraw application"""
        application = self.get_object()
        
        if not application.can_transition_to('withdrawn'):
            return Response(
                {'error': 'Cannot withdraw application in current status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = application.status
        application.status = 'withdrawn'
        application.save()
        
        # Create status history
        ApplicationStatusHistory.objects.create(
            application=application,
            from_status=old_status,
            to_status='withdrawn',
            changed_by_id=request.user.id,
            reason='Withdrawn by student'
        )
        
        # Publish withdrawal event
        self.publish_event('application.withdrawn', {
            'application_id': application.id,
            'student_id': application.student_id,
            'internship_id': application.internship_id,
            'withdrawn_by': request.user.id
        })
        
        return Response(ApplicationDetailSerializer(application).data)
    
    @action(detail=False, methods=['get'])
    def my_applications(self, request):
        """Get current user's applications"""
        applications = self.get_queryset().filter(student_id=request.user.id)
        
        # Apply filters
        filtered_applications = self.filter_queryset(applications)
        
        page = self.paginate_queryset(filtered_applications)
        if page is not None:
            serializer = ApplicationListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = ApplicationListSerializer(filtered_applications, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def employer_applications(self, request):
        """Get applications for employer's internships"""
        applications = self.get_queryset().filter(employer_id=request.user.id)
        
        # Apply filters
        filtered_applications = self.filter_queryset(applications)
        
        page = self.paginate_queryset(filtered_applications)
        if page is not None:
            serializer = ApplicationListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = ApplicationListSerializer(filtered_applications, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get application statistics"""
        queryset = self.get_queryset()
        
        # Basic counts
        total_applications = queryset.count()
        status_counts = queryset.values('status').annotate(count=Count('id'))
        
        # Status-specific counts
        pending_applications = queryset.filter(status='pending').count()
        reviewed_applications = queryset.filter(status='reviewed').count()
        interview_scheduled = queryset.filter(status='interview_scheduled').count()
        accepted_applications = queryset.filter(status='accepted').count()
        rejected_applications = queryset.filter(status='rejected').count()
        withdrawn_applications = queryset.filter(status='withdrawn').count()
        
        # Group by internship and employer
        by_internship = queryset.values('internship_id').annotate(count=Count('id'))
        by_employer = queryset.values('employer_id').annotate(count=Count('id'))
        
        # Monthly statistics
        from django.db.models.functions import TruncMonth
        by_month = queryset.annotate(
            month=TruncMonth('application_date')
        ).values('month').annotate(count=Count('id')).order_by('month')
        
        # Calculate rates
        acceptance_rate = (accepted_applications / total_applications * 100) if total_applications > 0 else 0
        interview_rate = (interview_scheduled / total_applications * 100) if total_applications > 0 else 0
        
        # Average processing times (simplified)
        reviewed_apps = queryset.filter(reviewed_at__isnull=False)
        avg_time_to_review = 0
        avg_time_to_decision = 0
        
        if reviewed_apps.exists():
            # Calculate average time from application to review
            time_diffs = [(app.reviewed_at - app.application_date).days for app in reviewed_apps]
            avg_time_to_review = sum(time_diffs) / len(time_diffs)
        
        final_status_apps = queryset.filter(status__in=['accepted', 'rejected'])
        if final_status_apps.exists():
            # Calculate average time from application to final decision
            time_diffs = [(app.status_changed_at - app.application_date).days for app in final_status_apps]
            avg_time_to_decision = sum(time_diffs) / len(time_diffs)
        
        stats_data = {
            'total_applications': total_applications,
            'pending_applications': pending_applications,
            'reviewed_applications': reviewed_applications,
            'interview_scheduled': interview_scheduled,
            'accepted_applications': accepted_applications,
            'rejected_applications': rejected_applications,
            'withdrawn_applications': withdrawn_applications,
            'by_status': {item['status']: item['count'] for item in status_counts},
            'by_internship': {item['internship_id']: item['count'] for item in by_internship},
            'by_employer': {item['employer_id']: item['count'] for item in by_employer},
            'by_month': [{
                'month': item['month'].strftime('%Y-%m'),
                'count': item['count']
            } for item in by_month],
            'average_time_to_review': avg_time_to_review,
            'average_time_to_decision': avg_time_to_decision,
            'acceptance_rate': acceptance_rate,
            'interview_rate': interview_rate
        }
        
        serializer = ApplicationStatsSerializer(stats_data)
        return Response(serializer.data)
    
    def publish_event(self, event_type, data):
        """Publish event to message queue"""
        try:
            publisher = EventPublisher()
            publisher.publish(event_type, data)
        except Exception as e:
            # Log error but don't fail the request
            print(f"Failed to publish event {event_type}: {str(e)}")


class ApplicationDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing application documents"""
    
    queryset = ApplicationDocument.objects.all()
    serializer_class = ApplicationDocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter documents based on application access"""
        user = self.request.user
        if not user.is_authenticated:
            return ApplicationDocument.objects.none()
        
        # Get applications user can access
        application_viewset = ApplicationViewSet()
        application_viewset.request = self.request
        accessible_applications = application_viewset.get_queryset()
        
        return ApplicationDocument.objects.filter(
            application__in=accessible_applications
        )
    
    def perform_create(self, serializer):
        """Create document with application validation"""
        application_id = self.request.data.get('application')
        
        # Verify user can access this application
        try:
            application = Application.objects.get(id=application_id)
            # Check if user can edit this application
            if not (application.student_id == self.request.user.id or 
                   application.employer_id == self.request.user.id):
                raise PermissionError("Cannot add documents to this application")
            
            serializer.save(application=application)
        except Application.DoesNotExist:
            raise ValidationError("Invalid application ID")


class SupervisorFeedbackViewSet(viewsets.ModelViewSet):
    """ViewSet for managing supervisor feedback"""
    
    queryset = SupervisorFeedback.objects.all()
    serializer_class = SupervisorFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated, CanProvideFeedback]
    
    def get_queryset(self):
        """Filter feedback based on supervisor permissions"""
        user = self.request.user
        if not user.is_authenticated:
            return SupervisorFeedback.objects.none()
        
        # Get applications user can provide feedback for
        application_viewset = ApplicationViewSet()
        application_viewset.request = self.request
        accessible_applications = application_viewset.get_queryset().filter(status='accepted')
        
        return SupervisorFeedback.objects.filter(
            application__in=accessible_applications
        )
    
    def perform_create(self, serializer):
        """Create feedback with application validation"""
        application_id = self.request.data.get('application')
        
        try:
            application = Application.objects.get(id=application_id, status='accepted')
            serializer.save(application=application)
            
            # Publish feedback created event
            self.publish_event('application.feedback_created', {
                'application_id': application.id,
                'student_id': application.student_id,
                'internship_id': application.internship_id,
                'supervisor_id': self.request.user.id,
                'rating': serializer.instance.rating
            })
        except Application.DoesNotExist:
            raise ValidationError("Invalid application or application not accepted")
    
    def publish_event(self, event_type, data):
        """Publish event to message queue"""
        try:
            publisher = EventPublisher()
            publisher.publish(event_type, data)
        except Exception as e:
            print(f"Failed to publish event {event_type}: {str(e)}")


class ApplicationNoteViewSet(viewsets.ModelViewSet):
    """ViewSet for managing application notes"""
    
    queryset = ApplicationNote.objects.all()
    serializer_class = ApplicationNoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter notes based on application access"""
        user = self.request.user
        if not user.is_authenticated:
            return ApplicationNote.objects.none()
        
        # Get applications user can access
        application_viewset = ApplicationViewSet()
        application_viewset.request = self.request
        accessible_applications = application_viewset.get_queryset()
        
        queryset = ApplicationNote.objects.filter(
            application__in=accessible_applications
        )
        
        # Students can only see non-internal notes
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(user.id)
            user_role = user_data.get('role', '')
            if user_role == 'student':
                queryset = queryset.filter(is_internal=False)
        except:
            queryset = queryset.filter(is_internal=False)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create note with application validation"""
        application_id = self.request.data.get('application')
        
        try:
            application = Application.objects.get(id=application_id)
            # Verify user can access this application
            if not (application.student_id == self.request.user.id or 
                   application.employer_id == self.request.user.id):
                raise PermissionError("Cannot add notes to this application")
            
            serializer.save(application=application)
        except Application.DoesNotExist:
            raise ValidationError("Invalid application ID")