from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from .serializers import (
    StudentRegistrationSerializer,
    LoginSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    PasswordChangeSerializer,
    InviteSerializer,
    InvitedUserRegisterSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
    TwoFALoginSerializer,
    VerifyOTPSerializer,
)
from users.models import UserRole, StudentProfile
from institutions.models import Institution
from django.db import transaction
from .models import Invite
from .permissions import IsStudent, IsEmployer, IsInstitution, IsAdmin

# Security app imports
from security.models import LoginHistory, SecurityLog
from security.views import get_client_ip

User = get_user_model()

class StudentRegistrationView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = StudentRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    user = serializer.save()
                    
                    # Log security event
                    SecurityLog.objects.create(
                        user=user,
                        action='REGISTER',
                        description='New student registration',
                        ip_address=get_client_ip(request)
                    )
                    
                    return Response({
                        'message': 'Registration successful. Please check your email to verify your account.',
                        'user': {
                            'email': user.email,
                            'role': 'student'
                        }
                    }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        # If login successful, log the event
        if response.status_code == 200:
            try:
                user = User.objects.get(email=request.data.get('email'))
                ip_address = get_client_ip(request)
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                
                # Log login history
                LoginHistory.objects.create(
                    user=user,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                # Log security event
                SecurityLog.objects.create(
                    user=user,
                    action='LOGIN',
                    description='User logged in successfully',
                    ip_address=ip_address
                )
            except User.DoesNotExist:
                pass  # User not found, skip logging
        
        return response

class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"detail": "Password reset link sent."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]

    def post(self, request, uidb64, token):
        data = {
            'uidb64': uidb64,
            'token': token,
            'new_password': request.data.get('new_password')
        }
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response({"detail": "Password has been reset."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if user.check_password(serializer.validated_data['old_password']):
                user.set_password(serializer.validated_data['new_password'])
                user.save()
                
                # Log security event
                SecurityLog.objects.create(
                    user=user,
                    action='PASSWORD_CHANGE',
                    description='User changed their password',
                    ip_address=get_client_ip(request)
                )
                
                return Response({
                    'message': 'Password changed successfully.'
                }, status=status.HTTP_200_OK)
            return Response({
                'error': 'Current password is incorrect.'
            }, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class InviteCreateView(generics.CreateAPIView):
    queryset = Invite.objects.all()
    serializer_class = InviteSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

# Public endpoint: Anyone can register (Students only)
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

class InviteRegisterView(generics.CreateAPIView):
    serializer_class = InvitedUserRegisterSerializer
    permission_classes = [AllowAny]

class TwoFALoginView(generics.GenericAPIView):
    serializer_class = TwoFALoginSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=200)
        return Response(serializer.errors, status=400)

class VerifyOTPView(generics.GenericAPIView):
    serializer_class = VerifyOTPSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=200)
        return Response(serializer.errors, status=400)
   
# Login endpoint
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        # If login successful, log the event
        if response.status_code == 200:
            try:
                user = User.objects.get(email=request.data.get('email'))
                ip_address = get_client_ip(request)
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                
                # Log login history
                LoginHistory.objects.create(
                    user=user,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                # Log security event
                SecurityLog.objects.create(
                    user=user,
                    action='LOGIN',
                    description='User logged in successfully',
                    ip_address=ip_address
                )
            except User.DoesNotExist:
                pass  # User not found, skip logging
        
        return response

# Authenticated users only: Update their own password
class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

# STUDENT-only: Submit an application
class SubmitApplicationView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        return Response({"message": "Application submitted!"})

# STUDENT-only: View their own applications
class ViewOwnApplicationsView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        return Response({"applications": ["Internship 1", "Internship 2"]})

# EMPLOYER-only: Create an internship
class CreateInternshipView(APIView):
    permission_classes = [IsAuthenticated, IsEmployer]

    def post(self, request):
        return Response({"message": "Internship created!"})

# EMPLOYER-only: View applications to their internships
class ViewOwnInternshipApplicationsView(APIView):
    permission_classes = [IsAuthenticated, IsEmployer]

    def get(self, request):
        return Response({"applications": ["John Doe", "Jane Doe"]})

# INSTITUTION ADMIN-only: View institution's registered students
class ViewInstitutionStudentsView(APIView):
    permission_classes = [IsAuthenticated, IsInstitution]

    def get(self, request):
        return Response({"students": ["Alice", "Bob"]})

# INSTITUTION ADMIN-only: Generate analytics reports
class GenerateAnalyticsReportView(APIView):
    permission_classes = [IsAuthenticated, IsInstitution]

    def get(self, request):
        return Response({"report": "Student placement analytics"})

# ADMIN-only: View all users (SuperAdmin)
class ViewAllUsersView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({"users": ["Admin", "Student", "Employer", "Institution"]})
