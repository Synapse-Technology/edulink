from django.shortcuts import render, get_object_or_404
from django.db.models import Q, Avg, Count
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta

from users.models import (
    SupervisorProfile, 
    CompanySupervisorProfile, 
    InstitutionSupervisorProfile,
    SupervisorAssignment,
    StudentProfile
)
from users.roles import RoleChoices
from internship.models import Internship
from application.models import Application
from internship_progress.models import LogbookEntry, SupervisorFeedback
from institutions.models import Institution, Department
from users.models import EmployerProfile
from security.models import SecurityEvent

User = get_user_model()


class SupervisorDashboardAPIView(APIView):
    """API view for supervisor dashboard data"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Check if user is a supervisor
        if user.role not in [RoleChoices.COMPANY_SUPERVISOR, RoleChoices.INSTITUTION_SUPERVISOR]:
            return Response(
                {'error': 'Access denied. User is not a supervisor.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            supervisor_profile = user.profile
            if not supervisor_profile:
                return Response(
                    {'error': 'Supervisor profile not found.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get supervisor assignments
            assignments = SupervisorAssignment.objects.filter(
                supervisor=supervisor_profile,
                is_active=True
            ).select_related('student', 'internship')
            
            # Get recent logbook entries for review
            recent_entries = LogbookEntry.objects.filter(
                application__internship__supervisor_assignments__supervisor=supervisor_profile,
                application__internship__supervisor_assignments__is_active=True
            ).order_by('-created_at')[:10]
            
            # Calculate statistics
            total_students = assignments.count()
            pending_reviews = LogbookEntry.objects.filter(
                application__internship__supervisor_assignments__supervisor=supervisor_profile,
                application__internship__supervisor_assignments__is_active=True,
                supervisor_feedback__isnull=True
            ).count()
            
            # Get feedback statistics
            feedback_stats = SupervisorFeedback.objects.filter(
                logbook_entry__application__internship__supervisor_assignments__supervisor=supervisor_profile
            ).aggregate(
                avg_rating=Avg('rating'),
                total_feedback=Count('id')
            )
            
            dashboard_data = {
                'supervisor_info': {
                    'id': supervisor_profile.id,
                    'name': supervisor_profile.get_full_name(),
                    'type': supervisor_profile.supervisor_type,
                    'specialization': supervisor_profile.specialization,
                    'max_students': supervisor_profile.max_students,
                    'current_students': supervisor_profile.current_students,
                    'available_slots': supervisor_profile.available_slots,
                    'average_rating': float(supervisor_profile.average_rating),
                    'is_available': supervisor_profile.is_available
                },
                'statistics': {
                    'total_students': total_students,
                    'pending_reviews': pending_reviews,
                    'average_feedback_rating': float(feedback_stats['avg_rating'] or 0),
                    'total_feedback_given': feedback_stats['total_feedback'] or 0
                },
                'recent_entries': [
                    {
                        'id': entry.id,
                        'student_name': entry.application.student.get_full_name(),
                        'week_number': entry.week_number,
                        'submission_date': entry.created_at.isoformat(),
                        'has_feedback': hasattr(entry, 'supervisor_feedback'),
                        'internship_title': entry.application.internship.title
                    }
                    for entry in recent_entries
                ],
                'assignments': [
                    {
                        'id': assignment.id,
                        'student': {
                            'id': assignment.student.id,
                            'name': assignment.student.get_full_name(),
                            'email': assignment.student.user.email,
                            'registration_number': assignment.student.registration_number
                        },
                        'internship': {
                            'id': assignment.internship.id,
                            'title': assignment.internship.title,
                            'company': assignment.internship.company.company_name,
                            'start_date': assignment.internship.start_date.isoformat() if assignment.internship.start_date else None,
                            'end_date': assignment.internship.end_date.isoformat() if assignment.internship.end_date else None
                        },
                        'assignment_type': assignment.assignment_type,
                        'assigned_date': assignment.assigned_date.isoformat()
                    }
                    for assignment in assignments
                ]
            }
            
            # Dashboard access logged (security logging disabled for now)
            
            return Response(dashboard_data)
            
        except Exception as e:
            # Error logged (security logging disabled for now)
            return Response(
                {'error': 'An error occurred while fetching dashboard data.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupervisorLogbookReviewAPIView(APIView):
    """API view for reviewing student logbook entries"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get logbook entries for review"""
        user = request.user
        
        if user.role not in [RoleChoices.COMPANY_SUPERVISOR, RoleChoices.INSTITUTION_SUPERVISOR]:
            return Response(
                {'error': 'Access denied.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            supervisor_profile = user.profile
            
            # Get logbook entries for this supervisor's students
            entries = LogbookEntry.objects.filter(
                application__internship__supervisor_assignments__supervisor=supervisor_profile,
                application__internship__supervisor_assignments__is_active=True
            ).select_related(
                'application__student',
                'application__internship'
            ).prefetch_related('supervisor_feedback').order_by('-created_at')
            
            # Filter by status if provided
            status_filter = request.GET.get('status')
            if status_filter == 'pending':
                entries = entries.filter(supervisor_feedback__isnull=True)
            elif status_filter == 'reviewed':
                entries = entries.filter(supervisor_feedback__isnull=False)
            
            # Filter by student if provided
            student_id = request.GET.get('student_id')
            if student_id:
                entries = entries.filter(application__student__id=student_id)
            
            entries_data = []
            for entry in entries:
                feedback = getattr(entry, 'supervisor_feedback', None)
                entries_data.append({
                    'id': entry.id,
                    'week_number': entry.week_number,
                    'week_start_date': entry.week_start_date.isoformat(),
                    'week_end_date': entry.week_end_date.isoformat(),
                    'activities': entry.activities,
                    'challenges': entry.challenges,
                    'learning_outcomes': entry.learning_outcomes,
                    'hours_worked': entry.hours_worked,
                    'submission_date': entry.created_at.isoformat(),
                    'student': {
                        'id': entry.application.student.id,
                        'name': entry.application.student.get_full_name(),
                        'email': entry.application.student.user.email
                    },
                    'internship': {
                        'id': entry.application.internship.id,
                        'title': entry.application.internship.title,
                        'company': entry.application.internship.company.company_name
                    },
                    'feedback': {
                        'id': feedback.id,
                        'rating': feedback.rating,
                        'comments': feedback.comments,
                        'suggestions': feedback.suggestions,
                        'created_at': feedback.created_at.isoformat()
                    } if feedback else None
                })
            
            return Response({
                'entries': entries_data,
                'total_count': len(entries_data)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error fetching logbook entries: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Submit feedback for a logbook entry"""
        user = request.user
        
        if user.role not in [RoleChoices.COMPANY_SUPERVISOR, RoleChoices.INSTITUTION_SUPERVISOR]:
            return Response(
                {'error': 'Access denied.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            supervisor_profile = user.profile
            entry_id = request.data.get('entry_id')
            rating = request.data.get('rating')
            comments = request.data.get('comments', '')
            suggestions = request.data.get('suggestions', '')
            
            # Validate required fields
            if not entry_id or not rating:
                return Response(
                    {'error': 'Entry ID and rating are required.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the logbook entry
            entry = get_object_or_404(
                LogbookEntry,
                id=entry_id,
                application__internship__supervisor_assignments__supervisor=supervisor_profile,
                application__internship__supervisor_assignments__is_active=True
            )
            
            # Check if feedback already exists
            feedback, created = SupervisorFeedback.objects.get_or_create(
                logbook_entry=entry,
                defaults={
                    'company_supervisor': supervisor_profile if user.role == RoleChoices.COMPANY_SUPERVISOR else None,
                    'institution_supervisor': supervisor_profile if user.role == RoleChoices.INSTITUTION_SUPERVISOR else None,
                    'rating': rating,
                    'comments': comments,
                    'suggestions': suggestions
                }
            )
            
            if not created:
                # Update existing feedback
                feedback.rating = rating
                feedback.comments = comments
                feedback.suggestions = suggestions
                feedback.save()
            
            return Response({
                'message': 'Feedback submitted successfully.',
                'feedback': {
                    'id': feedback.id,
                    'rating': feedback.rating,
                    'comments': feedback.comments,
                    'suggestions': feedback.suggestions,
                    'created_at': feedback.created_at.isoformat()
                }
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error submitting feedback: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupervisorStudentsAPIView(APIView):
    """API view for managing supervisor's assigned students"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get list of assigned students"""
        user = request.user
        
        if user.role not in [RoleChoices.COMPANY_SUPERVISOR, RoleChoices.INSTITUTION_SUPERVISOR]:
            return Response(
                {'error': 'Access denied.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            supervisor_profile = user.profile
            
            # Get active assignments
            assignments = SupervisorAssignment.objects.filter(
                supervisor=supervisor_profile,
                is_active=True
            ).select_related(
                'student__user',
                'internship__company'
            )
            
            students_data = []
            for assignment in assignments:
                student = assignment.student
                
                # Get recent logbook entries
                recent_entries = LogbookEntry.objects.filter(
                    application__student=student,
                    application__internship=assignment.internship
                ).order_by('-created_at')[:5]
                
                students_data.append({
                    'assignment_id': assignment.id,
                    'student': {
                        'id': student.id,
                        'name': student.get_full_name(),
                        'email': student.user.email,
                        'phone': student.phone_number,
                        'registration_number': student.registration_number,
                        'institution': student.institution.name if student.institution else None
                    },
                    'internship': {
                        'id': assignment.internship.id,
                        'title': assignment.internship.title,
                        'company': assignment.internship.company.company_name,
                        'start_date': assignment.internship.start_date.isoformat() if assignment.internship.start_date else None,
                        'end_date': assignment.internship.end_date.isoformat() if assignment.internship.end_date else None
                    },
                    'assignment_type': assignment.assignment_type,
                    'assigned_date': assignment.assigned_date.isoformat(),
                    'recent_entries_count': recent_entries.count(),
                    'last_entry_date': recent_entries.first().created_at.isoformat() if recent_entries.exists() else None
                })
            
            return Response({
                'students': students_data,
                'total_count': len(students_data)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error fetching students: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupervisorProfileAPIView(APIView):
    """API view for supervisor profile management"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get supervisor profile"""
        user = request.user
        
        if user.role not in [RoleChoices.COMPANY_SUPERVISOR, RoleChoices.INSTITUTION_SUPERVISOR]:
            return Response(
                {'error': 'Access denied.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            supervisor_profile = user.profile
            if not supervisor_profile:
                return Response(
                    {'error': 'Supervisor profile not found.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            profile_data = {
                'id': supervisor_profile.id,
                'first_name': supervisor_profile.first_name,
                'last_name': supervisor_profile.last_name,
                'email': user.email,
                'phone_number': supervisor_profile.phone_number,
                'title': supervisor_profile.title,
                'specialization': supervisor_profile.specialization,
                'years_of_experience': supervisor_profile.years_of_experience,
                'office_phone': supervisor_profile.office_phone,
                'office_location': supervisor_profile.office_location,
                'max_students': supervisor_profile.max_students,
                'current_students': supervisor_profile.current_students,
                'is_available': supervisor_profile.is_available,
                'availability_notes': supervisor_profile.availability_notes,
                'average_rating': float(supervisor_profile.average_rating),
                'total_ratings': supervisor_profile.total_ratings,
                'supervisor_type': supervisor_profile.supervisor_type
            }
            
            # Add type-specific information
            if user.role == RoleChoices.COMPANY_SUPERVISOR:
                company_profile = supervisor_profile
                profile_data.update({
                    'employer': {
                        'id': company_profile.employer.id,
                        'company_name': company_profile.employer.company_name
                    },
                    'department': company_profile.department,
                    'job_title': company_profile.job_title,
                    'employee_id': company_profile.employee_id,
                    'supervision_areas': company_profile.supervision_areas
                })
            elif user.role == RoleChoices.INSTITUTION_SUPERVISOR:
                institution_profile = supervisor_profile
                profile_data.update({
                    'institution': {
                        'id': institution_profile.institution.id,
                        'name': institution_profile.institution.name
                    },
                    'department': {
                        'id': institution_profile.department.id,
                        'name': institution_profile.department.name
                    } if institution_profile.department else None,
                    'academic_rank': institution_profile.academic_rank,
                    'highest_qualification': institution_profile.highest_qualification,
                    'research_interests': institution_profile.research_interests,
                    'courses_taught': institution_profile.courses_taught
                })
            
            return Response(profile_data)
            
        except Exception as e:
            return Response(
                {'error': f'Error fetching profile: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request):
        """Update supervisor profile"""
        user = request.user
        
        if user.role not in [RoleChoices.COMPANY_SUPERVISOR, RoleChoices.INSTITUTION_SUPERVISOR]:
            return Response(
                {'error': 'Access denied.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            supervisor_profile = user.profile
            if not supervisor_profile:
                return Response(
                    {'error': 'Supervisor profile not found.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update common fields
            updateable_fields = [
                'first_name', 'last_name', 'phone_number', 'title', 
                'specialization', 'years_of_experience', 'office_phone', 
                'office_location', 'max_students', 'is_available', 
                'availability_notes'
            ]
            
            for field in updateable_fields:
                if field in request.data:
                    setattr(supervisor_profile, field, request.data[field])
            
            # Update type-specific fields
            if user.role == RoleChoices.COMPANY_SUPERVISOR:
                company_fields = ['department', 'job_title', 'employee_id', 'supervision_areas']
                for field in company_fields:
                    if field in request.data:
                        setattr(supervisor_profile, field, request.data[field])
            
            elif user.role == RoleChoices.INSTITUTION_SUPERVISOR:
                institution_fields = ['academic_rank', 'highest_qualification', 'research_interests', 'courses_taught']
                for field in institution_fields:
                    if field in request.data:
                        setattr(supervisor_profile, field, request.data[field])
            
            supervisor_profile.save()
            
            return Response({'message': 'Profile updated successfully.'})
            
        except Exception as e:
            return Response(
                {'error': f'Error updating profile: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def supervisor_analytics(request):
    """Get analytics data for supervisor"""
    user = request.user
    
    if user.role not in [RoleChoices.COMPANY_SUPERVISOR, RoleChoices.INSTITUTION_SUPERVISOR]:
        return Response(
            {'error': 'Access denied.'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        supervisor_profile = user.profile
        
        # Get date range (default to last 30 days)
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        # Get assignments in date range
        assignments = SupervisorAssignment.objects.filter(
            supervisor=supervisor_profile,
            assigned_date__gte=start_date,
            assigned_date__lte=end_date
        )
        
        # Get logbook entries and feedback
        logbook_entries = LogbookEntry.objects.filter(
            application__internship__supervisor_assignments__supervisor=supervisor_profile,
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        feedback_given = SupervisorFeedback.objects.filter(
            logbook_entry__application__internship__supervisor_assignments__supervisor=supervisor_profile,
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        # Calculate analytics
        analytics_data = {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'assignments': {
                'total': assignments.count(),
                'active': assignments.filter(is_active=True).count()
            },
            'logbook_activity': {
                'entries_received': logbook_entries.count(),
                'feedback_given': feedback_given.count(),
                'pending_reviews': logbook_entries.filter(supervisor_feedback__isnull=True).count()
            },
            'feedback_stats': {
                'average_rating': feedback_given.aggregate(avg=Avg('rating'))['avg'] or 0,
                'total_feedback': feedback_given.count()
            },
            'student_performance': {
                'total_students': assignments.values('student').distinct().count(),
                'active_students': assignments.filter(is_active=True).values('student').distinct().count()
            }
        }
        
        return Response(analytics_data)
        
    except Exception as e:
        return Response(
            {'error': f'Error generating analytics: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
