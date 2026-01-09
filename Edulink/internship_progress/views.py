from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from datetime import datetime, timedelta
from .models import LogbookEntry, SupervisorFeedback
from .serializers import LogbookEntrySerializer, SupervisorFeedbackSerializer
from application.models import Application
from users.models.student_profile import StudentProfile
from users.models.employer_profile import EmployerProfile
from users.models.institution_profile import InstitutionProfile
from internship.models.internship import Internship
from rest_framework.exceptions import PermissionDenied, ValidationError

# Create your views here.

class IsStudentOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Students can only access their own logbook entries
        if request.method in permissions.SAFE_METHODS:
            return True
        return hasattr(request.user, 'student_profile') and obj.student.user == request.user

class IsSupervisorOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        # Supervisors (institution or company) or staff
        return (
            request.user.is_staff or
            hasattr(request.user, 'employerprofile') or
            hasattr(request.user, 'institutionprofile')
        )

class LogbookEntryListCreateView(generics.ListCreateAPIView):
    """List logbook entries for the authenticated user or create a new one."""
    serializer_class = LogbookEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsStudentOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'student_profile'):
            # Students see their own logbook entries
            return LogbookEntry.objects.filter(student=user.student_profile)
        elif hasattr(user, 'employerprofile'):
            # Employers see logbook entries for their interns
            return LogbookEntry.objects.filter(internship__employer=user.employerprofile)
        elif hasattr(user, 'institutionprofile'):
            # Institution staff see logbook entries for their students
            return LogbookEntry.objects.filter(student__student_profile__institution=user.institutionprofile.institution)
        else:
            return LogbookEntry.objects.none()

    def perform_create(self, serializer):
        """Ensure the student field is set to the current user's student profile."""
        if hasattr(self.request.user, 'student_profile'):
            student = self.request.user.student_profile
            internship = serializer.validated_data['internship']
            week_number = serializer.validated_data['week_number']
            
            # Additional validation before saving
            try:
                # Check if the student has an accepted application for this internship
                application = Application.objects.get(
                    student=student.user,
                    internship=internship,
                    status='accepted'
                )
                
                # Check for duplicate entries
                if LogbookEntry.objects.filter(
                    student=student,
                    internship=internship,
                    week_number=week_number
                ).exists():
                    raise DjangoValidationError(f"Logbook entry for week {week_number} already exists.")
                
                # Validate internship timing
                current_date = timezone.now().date()
                if not (internship.start_date <= current_date <= internship.end_date):
                    raise DjangoValidationError("Logbook entries can only be submitted during the internship period.")
                
                # Calculate if this week is valid for submission
                elapsed_days = (current_date - internship.start_date).days
                elapsed_weeks = max(0, elapsed_days // 7)
                
                if week_number > elapsed_weeks + 1:
                    raise DjangoValidationError(
                        f"Cannot submit entry for week {week_number}. Only {elapsed_weeks + 1} weeks have elapsed."
                    )
                
                serializer.save(student=student)
                
            except Application.DoesNotExist:
                raise PermissionDenied("You must have an accepted application for this internship to submit logbook entries.")
            except DjangoValidationError as e:
                raise ValidationError(str(e))
        else:
            raise PermissionDenied("Only students can create logbook entries.")
    
    def create(self, request, *args, **kwargs):
        """Override create to handle validation errors gracefully."""
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )

class LogbookEntryRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = LogbookEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsStudentOrReadOnly]
    queryset = LogbookEntry.objects.all()

    def perform_update(self, serializer):
        user = self.request.user
        if not hasattr(user, 'student_profile') or serializer.instance.student.user != user:
            raise PermissionDenied("You can only update your own logbook entries.")
        serializer.save()

class SupervisorFeedbackCreateView(generics.CreateAPIView):
    serializer_class = SupervisorFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user
        log_entry = serializer.validated_data['log_entry']
        if hasattr(user, 'employerprofile'):
            serializer.save(company_supervisor=user.employerprofile)
        elif hasattr(user, 'institutionprofile'):
            serializer.save(institution_supervisor=user.institutionprofile)
        else:
            raise PermissionDenied("Only supervisors can add feedback.")

class SupervisorFeedbackListView(generics.ListAPIView):
    """List all feedback for a specific logbook entry."""
    serializer_class = SupervisorFeedbackSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        log_entry_id = self.kwargs['log_entry_id']
        log_entry = get_object_or_404(LogbookEntry, id=log_entry_id)
        
        # Check if user has permission to view this feedback
        user = self.request.user
        if hasattr(user, 'student_profile') and user.student_profile == log_entry.student:
            # Student can see their own feedback
            pass
        elif hasattr(user, 'employer_profile') or hasattr(user, 'institution_profile'):
            # Supervisors can see feedback for their students/interns
            pass
        else:
            raise PermissionDenied("You don't have permission to view this feedback.")
        
        return SupervisorFeedback.objects.filter(log_entry=log_entry)


class InternshipProgressCalculationView(generics.RetrieveAPIView):
    """Calculate and return comprehensive internship progress for a student."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """Calculate internship progress based on current internship status."""
        try:
            # Check if user has student_profile
            if not hasattr(request.user, 'student_profile'):
                return Response({
                    'error': 'User does not have a student profile',
                    'progress_percentage': 0,
                    'status': 'no_profile'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            student = request.user.student_profile
            progress_data = self._calculate_comprehensive_progress(student)
            return Response(progress_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': 'Failed to calculate progress',
                'details': str(e),
                'progress_percentage': 0,
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _calculate_comprehensive_progress(self, student):
        """Calculate comprehensive internship progress."""
        # Get current accepted internship
        current_internship = self._get_current_internship(student)
        
        if not current_internship:
            return self._get_pre_internship_progress(student)
        
        # Calculate progress for active internship
        return self._get_active_internship_progress(student, current_internship)
    
    def _get_current_internship(self, student):
        """Get the student's current active internship."""
        accepted_applications = Application.objects.filter(
            student=student.user,
            status='accepted'
        ).select_related('internship')
        
        current_date = timezone.now().date()
        
        for app in accepted_applications:
            internship = app.internship
            if (internship.start_date <= current_date <= internship.end_date):
                return internship
        
        return None
    
    def _get_pre_internship_progress(self, student):
        """Calculate progress for students without active internship."""
        applications = Application.objects.filter(student=student.user)
        total_applications = applications.count()
        accepted_applications = applications.filter(status='accepted').count()
        
        # Progress based on application milestones
        if total_applications == 0:
            progress_percentage = 0
            status_message = "Start applying for internships"
            phase = "application"
        elif accepted_applications == 0:
            progress_percentage = min(25, (total_applications / 10) * 25)  # Max 25% for applications
            status_message = f"Applied to {total_applications} internships - keep applying!"
            phase = "application"
        else:
            # Has acceptance but internship hasn't started yet
            next_internship = self._get_next_internship(student)
            if next_internship:
                days_until_start = (next_internship.start_date - timezone.now().date()).days
                progress_percentage = 30
                status_message = f"Internship starts in {days_until_start} days"
                phase = "pre_internship"
            else:
                progress_percentage = 25
                status_message = "Internship accepted - awaiting start date"
                phase = "pre_internship"
        
        return {
            'progress_percentage': round(progress_percentage, 1),
            'status': status_message,
            'phase': phase,
            'current_internship': None,
            'total_applications': total_applications,
            'accepted_applications': accepted_applications,
            'logbook_entries': 0,
            'weeks_completed': 0,
            'total_weeks': 0,
            'completion_rate': 0,
            'last_updated': timezone.now().isoformat()
        }
    
    def _get_next_internship(self, student):
        """Get the next upcoming internship for the student."""
        accepted_applications = Application.objects.filter(
            student=student.user,
            status='accepted'
        ).select_related('internship')
        
        current_date = timezone.now().date()
        
        upcoming_internships = [
            app.internship for app in accepted_applications
            if app.internship.start_date > current_date
        ]
        
        if upcoming_internships:
            return min(upcoming_internships, key=lambda x: x.start_date)
        
        return None
    
    def _get_active_internship_progress(self, student, internship):
        """Calculate progress for active internship."""
        # Calculate total internship duration in weeks
        total_days = (internship.end_date - internship.start_date).days
        total_weeks = max(1, total_days // 7)  # Minimum 1 week
        
        # Calculate elapsed weeks
        current_date = timezone.now().date()
        elapsed_days = (current_date - internship.start_date).days
        elapsed_weeks = max(0, elapsed_days // 7)
        
        # Get logbook entries for this internship
        logbook_entries = LogbookEntry.objects.filter(
            student=student,
            internship=internship
        )
        
        total_entries = logbook_entries.count()
        reviewed_entries = logbook_entries.filter(status='reviewed').count()
        
        # Calculate progress percentage
        # Base progress on time elapsed (60%) + logbook completion (40%)
        time_progress = min(100, (elapsed_weeks / total_weeks) * 100)
        
        expected_entries = min(elapsed_weeks, total_weeks)
        logbook_progress = 0
        if expected_entries > 0:
            logbook_progress = (total_entries / expected_entries) * 100
        
        # Weighted progress calculation
        progress_percentage = (time_progress * 0.6) + (min(logbook_progress, 100) * 0.4)
        
        # Determine status message
        if elapsed_weeks >= total_weeks:
            status_message = "Internship completed!"
            phase = "completed"
        elif total_entries < expected_entries:
            missing_entries = expected_entries - total_entries
            status_message = f"Submit {missing_entries} pending logbook entries"
            phase = "active"
        elif reviewed_entries < total_entries:
            pending_review = total_entries - reviewed_entries
            status_message = f"{pending_review} entries pending supervisor review"
            phase = "active"
        else:
            status_message = f"Week {elapsed_weeks + 1} of {total_weeks} - on track!"
            phase = "active"
        
        return {
            'progress_percentage': round(progress_percentage, 1),
            'status': status_message,
            'phase': phase,
            'current_internship': {
                'id': internship.id,
                'title': internship.title,
                'company': internship.employer.company_name,
                'start_date': internship.start_date.isoformat(),
                'end_date': internship.end_date.isoformat(),
            },
            'total_applications': Application.objects.filter(student=student.user).count(),
            'accepted_applications': Application.objects.filter(student=student.user, status='accepted').count(),
            'logbook_entries': total_entries,
            'weeks_completed': elapsed_weeks,
            'total_weeks': total_weeks,
            'completion_rate': round((reviewed_entries / max(1, expected_entries)) * 100, 1),
            'entries_pending_review': total_entries - reviewed_entries,
            'expected_entries': expected_entries,
            'last_updated': timezone.now().isoformat()
        }
