from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import render
from django.http import HttpResponse
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


class InstitutionDashboardStatsView(generics.RetrieveAPIView):
    """
    API endpoint to get dashboard statistics for the institution.
    """
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]
    
    def get(self, request, *args, **kwargs):
        institution = request.user.institution_profile.institution
        
        # Get dashboard statistics
        total_students = StudentProfile.objects.filter(institution=institution).count()
        verified_students = StudentProfile.objects.filter(
            institution=institution, 
            is_verified=True
        ).count()
        
        active_internships = Application.objects.filter(
            student__institution=institution,
            status='approved'
        ).count()
        
        pending_applications = Application.objects.filter(
            student__institution=institution,
            status='pending'
        ).count()
        
        # Recent activity (last 10 activities)
        recent_applications = Application.objects.filter(
            student__institution=institution
        ).order_by('-created_at')[:10]
        
        recent_activity = []
        for app in recent_applications:
            recent_activity.append({
                'type': 'application',
                'description': f"{app.student.user.get_full_name()} applied for {app.internship.title}",
                'timestamp': app.created_at,
                'status': app.status
            })
        
        data = {
            'stats': {
                'total_students': total_students,
                'verified_students': verified_students,
                'active_internships': active_internships,
                'pending_applications': pending_applications,
                'certificates_issued': 0,  # Placeholder - implement when certificate model exists
                'avg_completion_time': '10wks'  # Placeholder - calculate from actual data
            },
            'recent_activity': recent_activity,
            'institution_name': institution.name
        }
        
        return Response(data, status=status.HTTP_200_OK)


def institution_dashboard_view(request):
    """
    Simple view to serve the API-based dashboard HTML
    Redirects to login if user is not authenticated or not an institution admin
    """
    from django.shortcuts import redirect
    
    # Check if user is authenticated and is an institution admin
    if not request.user.is_authenticated:
        return redirect('/institutions/login/')
    
    if request.user.role != 'institution':
        return HttpResponse('Access denied. Institution admin access required.', status=403)
    
    return render(request, 'institution_dashboard/api_dashboard.html')


def institution_login_view(request):
    """
    Simple view to serve the institution login page
    """
    from django.http import FileResponse
    from django.conf import settings
    import os
    
    # Serve the static login.html file from Edulink_website folder
    login_file_path = os.path.join(settings.BASE_DIR, '..', 'Edulink_website', 'login.html')
    
    if os.path.exists(login_file_path):
        return FileResponse(open(login_file_path, 'rb'), content_type='text/html')
    else:
        return HttpResponse('Login page not found', status=404)


class InstitutionDepartmentsView(generics.ListCreateAPIView):
    """
    API endpoint to list and create departments for the institution.
    """
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]
    
    def get_queryset(self):
        institution = self.request.user.institution_profile.institution
        # This would need a Department model - for now return empty
        return []
    
    def get(self, request, *args, **kwargs):
        # Mock department data until Department model is created
        departments = [
            {
                'id': 1,
                'name': 'Computer Science',
                'courses': ['Software Engineering', 'Data Science', 'Cybersecurity'],
                'supervisors': ['Dr. John Doe', 'Prof. Jane Smith'],
                'student_count': 45
            },
            {
                'id': 2,
                'name': 'Business Administration',
                'courses': ['Marketing', 'Finance', 'Human Resources'],
                'supervisors': ['Dr. Mary Johnson', 'Prof. Robert Brown'],
                'student_count': 38
            }
        ]
        return Response({'departments': departments}, status=status.HTTP_200_OK)
    
    def post(self, request, *args, **kwargs):
        # Handle department creation
        data = request.data
        department_name = data.get('name')
        courses = data.get('courses', [])
        supervisors = data.get('supervisors', [])
        
        # Mock response - in real implementation, create Department model instance
        new_department = {
            'id': 999,  # Mock ID
            'name': department_name,
            'courses': courses,
            'supervisors': supervisors,
            'student_count': 0
        }
        
        return Response({
             'message': 'Department created successfully',
             'department': new_department
         }, status=status.HTTP_201_CREATED)


class InstitutionInternshipsView(generics.ListAPIView):
    """
    API endpoint to list internships related to the institution.
    """
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]
    
    def get(self, request, *args, **kwargs):
        institution = request.user.institution_profile.institution
        
        # Get internships where students from this institution have applied
        applications = Application.objects.filter(
            student__institution=institution
        ).select_related('internship', 'student__user')
        
        internships_data = []
        internship_ids = set()
        
        for app in applications:
            if app.internship.id not in internship_ids:
                internship_ids.add(app.internship.id)
                
                # Count applications for this internship from this institution
                app_count = Application.objects.filter(
                    internship=app.internship,
                    student__institution=institution
                ).count()
                
                approved_count = Application.objects.filter(
                    internship=app.internship,
                    student__institution=institution,
                    status='approved'
                ).count()
                
                internships_data.append({
                    'id': app.internship.id,
                    'title': app.internship.title,
                    'company': app.internship.employer.company_name,
                    'location': app.internship.location,
                    'duration': app.internship.duration,
                    'applications_count': app_count,
                    'approved_count': approved_count,
                    'status': app.internship.status,
                    'deadline': app.internship.application_deadline,
                    'created_at': app.internship.created_at
                })
        
        return Response({
             'internships': internships_data,
             'total_count': len(internships_data)
         }, status=status.HTTP_200_OK)


class InstitutionReportsView(generics.RetrieveAPIView):
    """
    API endpoint to get reports and analytics for the institution.
    """
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]
    
    def get(self, request, *args, **kwargs):
        institution = request.user.institution_profile.institution
        
        # Get application statistics by status
        application_stats = {
            'pending': Application.objects.filter(
                student__institution=institution, status='pending'
            ).count(),
            'approved': Application.objects.filter(
                student__institution=institution, status='approved'
            ).count(),
            'rejected': Application.objects.filter(
                student__institution=institution, status='rejected'
            ).count()
        }
        
        # Get monthly application trends (last 6 months)
        from django.utils import timezone
        from datetime import timedelta
        import calendar
        
        monthly_trends = []
        for i in range(6):
            month_start = timezone.now().replace(day=1) - timedelta(days=30*i)
            month_end = month_start.replace(day=calendar.monthrange(month_start.year, month_start.month)[1])
            
            count = Application.objects.filter(
                student__institution=institution,
                created_at__range=[month_start, month_end]
            ).count()
            
            monthly_trends.append({
                'month': month_start.strftime('%B %Y'),
                'applications': count
            })
        
        monthly_trends.reverse()  # Show oldest to newest
        
        # Student performance metrics
        total_students = StudentProfile.objects.filter(institution=institution).count()
        active_students = Application.objects.filter(
            student__institution=institution,
            status='approved'
        ).values('student').distinct().count()
        
        performance_metrics = {
            'total_students': total_students,
            'active_students': active_students,
            'placement_rate': round((active_students / total_students * 100) if total_students > 0 else 0, 2)
        }
        
        data = {
            'application_stats': application_stats,
            'monthly_trends': monthly_trends,
            'performance_metrics': performance_metrics,
            'generated_at': timezone.now()
        }
        
        return Response(data, status=status.HTTP_200_OK)
