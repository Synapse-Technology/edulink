from rest_framework import permissions
from django.utils import timezone
from .models import Application
import sys
import os

# Add shared modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

from service_clients import UserServiceClient, InternshipServiceClient


class IsStudentOwner(permissions.BasePermission):
    """Permission to check if user is the student who owns the application"""
    
    def has_object_permission(self, request, view, obj):
        """Check if user is the student who created the application"""
        if not request.user.is_authenticated:
            return False
        
        # Check if user is the student who owns this application
        return obj.student_id == request.user.id


class IsEmployerOwner(permissions.BasePermission):
    """Permission to check if user is the employer who owns the internship"""
    
    def has_object_permission(self, request, view, obj):
        """Check if user is the employer who owns the internship"""
        if not request.user.is_authenticated:
            return False
        
        # Check if user is the employer who owns the internship
        return obj.employer_id == request.user.id


class IsReviewer(permissions.BasePermission):
    """Permission to check if user can review applications"""
    
    def has_permission(self, request, view):
        """Check if user has reviewer permissions"""
        if not request.user.is_authenticated:
            return False
        
        # Check user role via user service
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(request.user.id)
            user_role = user_data.get('role', '')
            return user_role in ['employer', 'admin', 'institution_admin']
        except:
            return False
    
    def has_object_permission(self, request, view, obj):
        """Check if user can review this specific application"""
        if not self.has_permission(request, view):
            return False
        
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(request.user.id)
            user_role = user_data.get('role', '')
            
            # Admin can review any application
            if user_role == 'admin':
                return True
            
            # Employer can review applications for their internships
            if user_role == 'employer':
                return obj.employer_id == request.user.id
            
            # Institution admin can review applications from their students
            if user_role == 'institution_admin':
                student_data = user_client.get_student_details(obj.student_id)
                return student_data.get('institution_id') == user_data.get('institution_id')
            
            return False
        except:
            return False


class CanViewApplication(permissions.BasePermission):
    """Permission to check if user can view application details"""
    
    def has_object_permission(self, request, view, obj):
        """Check if user can view this application"""
        if not request.user.is_authenticated:
            return False
        
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(request.user.id)
            user_role = user_data.get('role', '')
            
            # Admin can view any application
            if user_role == 'admin':
                return True
            
            # Student can view their own applications
            if user_role == 'student' and obj.student_id == request.user.id:
                return True
            
            # Employer can view applications for their internships
            if user_role == 'employer' and obj.employer_id == request.user.id:
                return True
            
            # Institution admin can view applications from their students
            if user_role == 'institution_admin':
                student_data = user_client.get_student_details(obj.student_id)
                return student_data.get('institution_id') == user_data.get('institution_id')
            
            # Supervisor can view applications they're supervising
            if user_role in ['supervisor', 'employer']:
                # Check if user is supervisor for this application's internship
                internship_client = InternshipServiceClient()
                internship_data = internship_client.get_internship(obj.internship_id)
                supervisors = internship_data.get('supervisors', [])
                return request.user.id in supervisors
            
            return False
        except:
            return False


class CanEditApplication(permissions.BasePermission):
    """Permission to check if user can edit application"""
    
    def has_object_permission(self, request, view, obj):
        """Check if user can edit this application"""
        if not request.user.is_authenticated:
            return False
        
        # Students can only edit their own applications in certain statuses
        if obj.student_id == request.user.id:
            editable_statuses = ['pending', 'under_review']
            return obj.status in editable_statuses
        
        # Employers and reviewers can edit applications for their internships
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(request.user.id)
            user_role = user_data.get('role', '')
            
            if user_role in ['employer', 'admin']:
                return obj.employer_id == request.user.id or user_role == 'admin'
            
            return False
        except:
            return False


class CanManageApplicationStatus(permissions.BasePermission):
    """Permission to check if user can change application status"""
    
    def has_object_permission(self, request, view, obj):
        """Check if user can change application status"""
        if not request.user.is_authenticated:
            return False
        
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(request.user.id)
            user_role = user_data.get('role', '')
            
            # Admin can change any application status
            if user_role == 'admin':
                return True
            
            # Students can only withdraw their own applications
            if user_role == 'student' and obj.student_id == request.user.id:
                # Check if the requested status change is withdrawal
                new_status = request.data.get('status')
                return new_status == 'withdrawn' and obj.can_transition_to('withdrawn')
            
            # Employers can manage applications for their internships
            if user_role == 'employer' and obj.employer_id == request.user.id:
                return True
            
            # Institution admin can manage applications from their students
            if user_role == 'institution_admin':
                student_data = user_client.get_student_details(obj.student_id)
                return student_data.get('institution_id') == user_data.get('institution_id')
            
            return False
        except:
            return False


class CanScheduleInterview(permissions.BasePermission):
    """Permission to check if user can schedule interviews"""
    
    def has_object_permission(self, request, view, obj):
        """Check if user can schedule interview for this application"""
        if not request.user.is_authenticated:
            return False
        
        # Only applications in 'under_review' status can have interviews scheduled
        if obj.status != 'under_review':
            return False
        
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(request.user.id)
            user_role = user_data.get('role', '')
            
            # Admin can schedule any interview
            if user_role == 'admin':
                return True
            
            # Employer can schedule interviews for their internships
            if user_role == 'employer' and obj.employer_id == request.user.id:
                return True
            
            return False
        except:
            return False


class CanProvideFeedback(permissions.BasePermission):
    """Permission to check if user can provide supervisor feedback"""
    
    def has_object_permission(self, request, view, obj):
        """Check if user can provide feedback for this application"""
        if not request.user.is_authenticated:
            return False
        
        # Only applications in 'accepted' status can receive feedback
        if obj.status != 'accepted':
            return False
        
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(request.user.id)
            user_role = user_data.get('role', '')
            
            # Admin can provide any feedback
            if user_role == 'admin':
                return True
            
            # Supervisor can provide feedback
            if user_role in ['supervisor', 'employer']:
                # Check if user is supervisor for this application's internship
                internship_client = InternshipServiceClient()
                internship_data = internship_client.get_internship(obj.internship_id)
                supervisors = internship_data.get('supervisors', [])
                return request.user.id in supervisors or obj.employer_id == request.user.id
            
            return False
        except:
            return False


class CanViewApplicationStats(permissions.BasePermission):
    """Permission to check if user can view application statistics"""
    
    def has_permission(self, request, view):
        """Check if user can view application statistics"""
        if not request.user.is_authenticated:
            return False
        
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(request.user.id)
            user_role = user_data.get('role', '')
            
            # Admin, employers, and institution admins can view stats
            return user_role in ['admin', 'employer', 'institution_admin']
        except:
            return False


class IsApplicationActive(permissions.BasePermission):
    """Permission to check if application is in an active state"""
    
    def has_object_permission(self, request, view, obj):
        """Check if application is active"""
        return obj.is_active


class ServicePermissionMixin:
    """Mixin for inter-service communication permissions"""
    
    def verify_service_token(self, request):
        """Verify that request comes from another service"""
        # In a real implementation, this would verify JWT tokens or API keys
        # For now, we'll use a simple header check
        service_token = request.headers.get('X-Service-Token')
        expected_token = os.getenv('INTER_SERVICE_TOKEN', 'dev-service-token')
        return service_token == expected_token
    
    def verify_user_role(self, user_id, required_roles):
        """Verify user has required role via user service"""
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(user_id)
            user_role = user_data.get('role', '')
            return user_role in required_roles
        except:
            return False
    
    def verify_student_ownership(self, user_id, application_id):
        """Verify user owns the application as a student"""
        try:
            application = Application.objects.get(id=application_id)
            return application.student_id == user_id
        except Application.DoesNotExist:
            return False
    
    def verify_employer_ownership(self, user_id, application_id):
        """Verify user owns the internship as an employer"""
        try:
            application = Application.objects.get(id=application_id)
            return application.employer_id == user_id
        except Application.DoesNotExist:
            return False
    
    def verify_institution_membership(self, user_id, application_id):
        """Verify user is from same institution as student"""
        try:
            application = Application.objects.get(id=application_id)
            user_client = UserServiceClient()
            
            user_data = user_client.get_user(user_id)
            student_data = user_client.get_student_details(application.student_id)
            
            return user_data.get('institution_id') == student_data.get('institution_id')
        except:
            return False