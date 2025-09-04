# users/views/admin_views.py

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from django.utils import timezone
from rest_framework.generics import ListAPIView, CreateAPIView, RetrieveUpdateDestroyAPIView, ListCreateAPIView
from authentication.permissions import IsAdmin
from authentication.models import User
from users.models import InstitutionProfile, EmployerProfile, StudentProfile
from users.serializers import UserSerializer, InstitutionProfileSerializer, EmployerProfileSerializer, StudentProfileSerializer
from security.models import SecurityLog
from security.serializers import SecurityLogSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from Edulink.utils.error_handlers import APIErrorHandler, APIResponseMixin

from users.models.institution_profile import InstitutionProfile
from users.models.employer_profile import EmployerProfile
from users.serializers.institution_serializers import InstitutionProfileSerializer
from users.serializers.employer_serializers import EmployerProfileSerializer
from security.models import SecurityEvent, AuditLog


class CreateInstitutionProfileView(generics.CreateAPIView):
    serializer_class = InstitutionProfileSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        user_id = request.data.get("user")
        if not user_id:
            return Response({"detail": "User ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        if InstitutionProfile.objects.filter(user_id=user_id).exists():  # type: ignore[attr-defined]
            return Response({"detail": "Institution profile already exists for this user."}, status=status.HTTP_400_BAD_REQUEST)

        response = super().create(request, *args, **kwargs)
        
        # Log security event for profile creation
        if response.status_code == status.HTTP_201_CREATED:
            ip_address = self.get_client_ip(request)
            SecurityEvent.objects.create(
                event_type='profile_created',
                user=request.user,
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'profile_type': 'institution',
                    'target_user_id': user_id,
                    'created_by': request.user.email
                }
            )
            
            # Log audit trail
            AuditLog.objects.create(
                user=request.user,
                action='CREATE_INSTITUTION_PROFILE',
                resource_type='InstitutionProfile',
                resource_id=response.data.get('id'),
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={'target_user_id': user_id}
            )
        
        return response
    
    def get_client_ip(self, request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class CreateEmployerProfileView(generics.CreateAPIView):
    serializer_class = EmployerProfileSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        user_id = request.data.get("user")
        if not user_id:
            return Response({"detail": "User ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        if EmployerProfile.objects.filter(user_id=user_id).exists():  # type: ignore[attr-defined]
            return Response({"detail": "Employer profile already exists for this user."}, status=status.HTTP_400_BAD_REQUEST)

        response = super().create(request, *args, **kwargs)
        
        # Log security event for profile creation
        if response.status_code == status.HTTP_201_CREATED:
            ip_address = self.get_client_ip(request)
            SecurityEvent.objects.create(
                event_type='profile_created',
                user=request.user,
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'profile_type': 'employer',
                    'target_user_id': user_id,
                    'created_by': request.user.email
                }
            )
            
            # Log audit trail
            AuditLog.objects.create(
                user=request.user,
                action='CREATE_EMPLOYER_PROFILE',
                resource_type='EmployerProfile',
                resource_id=response.data.get('id'),
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={'target_user_id': user_id}
            )
        
        return response
    
    def get_client_ip(self, request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class AllUsersView(ListAPIView):
    """
    Allows super admin to view all users.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class AllInstitutionsView(ListAPIView):
    """
    Allows super admin to view all institutions.
    """
    queryset = InstitutionProfile.objects.all()
    serializer_class = InstitutionProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class AllEmployersView(ListAPIView):
    """
    Allows super admin to view all employers.
    """
    queryset = EmployerProfile.objects.all()
    serializer_class = EmployerProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class AllStudentsView(ListAPIView):
    """
    Allows super admin to view all students.
    """
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class SecurityLogListView(ListAPIView):
    """
    Allows super admin to view all security logs.
    """
    queryset = SecurityLog.objects.all()
    serializer_class = SecurityLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

# CRUD for User
class UserCreateView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class UserDetailView(RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

# CRUD for Institution
class InstitutionCreateView(CreateAPIView):
    queryset = InstitutionProfile.objects.all()
    serializer_class = InstitutionProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class InstitutionDetailView(RetrieveUpdateDestroyAPIView):
    queryset = InstitutionProfile.objects.all()
    serializer_class = InstitutionProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

# CRUD for Employer
class EmployerCreateView(CreateAPIView):
    queryset = EmployerProfile.objects.all()
    serializer_class = EmployerProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class EmployerDetailView(RetrieveUpdateDestroyAPIView):
    queryset = EmployerProfile.objects.all()
    serializer_class = EmployerProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

# CRUD for Student
class StudentCreateView(CreateAPIView):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class StudentDetailView(RetrieveUpdateDestroyAPIView):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

# Role Management
class UserRoleUpdateView(APIView, APIResponseMixin):
    permission_classes = [IsAuthenticated, IsAdmin]
    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return APIErrorHandler.handle_not_found('User not found')
        
        new_role = request.data.get('role')
        if new_role not in [choice[0] for choice in user._meta.get_field('role').choices]:
            return APIErrorHandler.handle_bad_request('Invalid role')
        
        user.role = new_role
        user.save()
        return self.success_response(
            data={'role': user.role},
            message='Role updated successfully'
        )

# System Analytics
class SystemAnalyticsView(APIView, APIResponseMixin):
    permission_classes = [IsAuthenticated, IsAdmin]
    def get(self, request):
        try:
            analytics_data = {
                "total_users": User.objects.count(),
                "total_students": StudentProfile.objects.count(),
                "total_employers": EmployerProfile.objects.count(),
                "total_institutions": InstitutionProfile.objects.count(),
            }
            return self.success_response(
                data=analytics_data,
                message='System analytics retrieved successfully'
            )
        except Exception as e:
            return APIErrorHandler.handle_server_error('Failed to retrieve system analytics')

# Impersonation
class ImpersonateUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    def post(self, request, pk):
        user = User.objects.get(pk=pk)
        refresh = RefreshToken.for_user(user)
        return Response({
            'impersonated_user': user.email,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })

# Institution/Employer Verification
class InstitutionVerifyView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    def post(self, request, pk):
        institution = InstitutionProfile.objects.get(pk=pk)
        institution.is_verified = True
        institution.save()
        return Response({'message': 'Institution verified'})

class EmployerVerifyView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    def post(self, request, pk):
        employer = EmployerProfile.objects.get(pk=pk)
        employer.is_verified = True
        employer.save()
        return Response({'message': 'Employer verified'})

# System Settings (model/serializer assumed to exist)
from users.models import SystemSetting
from users.serializers import SystemSettingSerializer
class SystemSettingListCreateView(ListCreateAPIView):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
class SystemSettingDetailView(RetrieveUpdateDestroyAPIView):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

