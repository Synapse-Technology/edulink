from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta
import logging

from .models import StudentProfile, EmployerProfile, InstitutionProfile, ProfileInvitation
from .serializers import (
    StudentProfileSerializer, StudentProfileListSerializer,
    EmployerProfileSerializer, EmployerProfileListSerializer,
    InstitutionProfileSerializer, ProfileInvitationSerializer,
    ProfileStatsSerializer, ProfileCompletionSerializer
)
from user_service.utils import ServiceClient, send_profile_update_notification

logger = logging.getLogger(__name__)


class StudentProfileListCreateView(generics.ListCreateAPIView):
    """List and create student profiles."""
    
    queryset = StudentProfile.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return StudentProfileListSerializer
        return StudentProfileSerializer
    
    def get_queryset(self):
        queryset = StudentProfile.objects.select_related().all()
        
        # Filter by institution
        institution_id = self.request.query_params.get('institution_id')
        if institution_id:
            queryset = queryset.filter(institution_id=institution_id)
        
        # Filter by verification status
        is_verified = self.request.query_params.get('is_verified')
        if is_verified is not None:
            queryset = queryset.filter(is_verified=is_verified.lower() == 'true')
        
        # Filter by internship status
        internship_status = self.request.query_params.get('internship_status')
        if internship_status:
            queryset = queryset.filter(internship_status=internship_status)
        
        # Search by name or registration number
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(registration_number__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        profile = serializer.save()
        
        # Send notification about profile creation
        try:
            send_profile_update_notification(
                profile.user_id,
                'profile_created',
                {'profile_type': 'student'}
            )
        except Exception as e:
            logger.error(f"Failed to send profile creation notification: {e}")


class StudentProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete student profile."""
    
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'user_id'
    
    def perform_update(self, serializer):
        old_completion = self.get_object().profile_completion_score
        profile = serializer.save()
        new_completion = profile.profile_completion_score
        
        # Send notification if completion score improved significantly
        if new_completion - old_completion >= 10:
            try:
                send_profile_update_notification(
                    profile.user_id,
                    'profile_completion_improved',
                    {
                        'old_score': old_completion,
                        'new_score': new_completion
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send profile update notification: {e}")


class EmployerProfileListCreateView(generics.ListCreateAPIView):
    """List and create employer profiles."""
    
    queryset = EmployerProfile.objects.select_related('company', 'department').all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return EmployerProfileListSerializer
        return EmployerProfileSerializer
    
    def get_queryset(self):
        queryset = EmployerProfile.objects.select_related('company', 'department').all()
        
        # Filter by company
        company_id = self.request.query_params.get('company_id')
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        
        # Filter by department
        department_id = self.request.query_params.get('department_id')
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        
        # Filter by industry (through company)
        industry = self.request.query_params.get('industry')
        if industry:
            queryset = queryset.filter(company__industry__icontains=industry)
        
        # Filter by location (through company)
        location = self.request.query_params.get('location')
        if location:
            queryset = queryset.filter(company__location__icontains=location)
        
        # Filter by company size (through company)
        company_size = self.request.query_params.get('company_size')
        if company_size:
            queryset = queryset.filter(company__size=company_size)
        
        # Filter by verification status
        is_verified = self.request.query_params.get('is_verified')
        if is_verified is not None:
            queryset = queryset.filter(is_verified=is_verified.lower() == 'true')
        
        # Search by company name or contact name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(company__name__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        profile = serializer.save()
        
        # Send notification about profile creation
        try:
            send_profile_update_notification(
                profile.user_id,
                'profile_created',
                {'profile_type': 'employer'}
            )
        except Exception as e:
            logger.error(f"Failed to send profile creation notification: {e}")


class EmployerProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete employer profile."""
    
    queryset = EmployerProfile.objects.select_related('company', 'department').all()
    serializer_class = EmployerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'user_id'
    
    def perform_update(self, serializer):
        old_completion = self.get_object().profile_completion_score
        profile = serializer.save()
        new_completion = profile.profile_completion_score
        
        # Send notification if completion score improved significantly
        if new_completion - old_completion >= 10:
            try:
                send_profile_update_notification(
                    profile.user_id,
                    'profile_completion_improved',
                    {
                        'old_score': old_completion,
                        'new_score': new_completion
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send profile update notification: {e}")


class InstitutionProfileListCreateView(generics.ListCreateAPIView):
    """List and create institution profiles."""
    
    queryset = InstitutionProfile.objects.all()
    serializer_class = InstitutionProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = InstitutionProfile.objects.all()
        
        # Filter by institution
        institution_id = self.request.query_params.get('institution_id')
        if institution_id:
            queryset = queryset.filter(institution_id=institution_id)
        
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        profile = serializer.save()
        
        # Send notification about profile creation
        try:
            send_profile_update_notification(
                profile.user_id,
                'profile_created',
                {'profile_type': 'institution'}
            )
        except Exception as e:
            logger.error(f"Failed to send profile creation notification: {e}")


class InstitutionProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete institution profile."""
    
    queryset = InstitutionProfile.objects.all()
    serializer_class = InstitutionProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'user_id'


class ProfileInvitationListCreateView(generics.ListCreateAPIView):
    """List and create profile invitations."""
    
    queryset = ProfileInvitation.objects.all()
    serializer_class = ProfileInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = ProfileInvitation.objects.all()
        
        # Filter by profile type
        profile_type = self.request.query_params.get('profile_type')
        if profile_type:
            queryset = queryset.filter(profile_type=profile_type)
        
        # Filter by status
        is_used = self.request.query_params.get('is_used')
        if is_used is not None:
            queryset = queryset.filter(is_used=is_used.lower() == 'true')
        
        # Filter by expiration
        show_expired = self.request.query_params.get('show_expired', 'false')
        if show_expired.lower() != 'true':
            queryset = queryset.filter(expires_at__gt=timezone.now())
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        invitation = serializer.save()
        
        # Send invitation email
        try:
            service_client = ServiceClient()
            service_client.post(
                'notification',
                '/api/notifications/send-invitation/',
                {
                    'email': invitation.email,
                    'invitation_token': invitation.token,
                    'profile_type': invitation.profile_type,
                    'expires_at': invitation.expires_at.isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Failed to send invitation email: {e}")


class ProfileInvitationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete profile invitation."""
    
    queryset = ProfileInvitation.objects.all()
    serializer_class = ProfileInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def use_invitation(request, token):
    """Use an invitation token to create a profile."""
    try:
        invitation = get_object_or_404(
            ProfileInvitation,
            token=token,
            is_used=False,
            expires_at__gt=timezone.now()
        )
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'User ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark invitation as used
        invitation.is_used = True
        invitation.used_at = timezone.now()
        invitation.save()
        
        # Create appropriate profile based on invitation type
        profile_data = {
            'user_id': user_id,
            'first_name': request.data.get('first_name', ''),
            'last_name': request.data.get('last_name', ''),
            'phone_number': request.data.get('phone_number', '')
        }
        
        if invitation.profile_type == 'student':
            profile_data['institution_id'] = invitation.institution_id
            serializer = StudentProfileSerializer(data=profile_data)
        elif invitation.profile_type == 'employer':
            profile_data['company_id'] = request.data.get('company_id')
            profile_data['department_id'] = request.data.get('department_id')
            serializer = EmployerProfileSerializer(data=profile_data)
        elif invitation.profile_type == 'institution':
            profile_data['institution_id'] = invitation.institution_id
            serializer = InstitutionProfileSerializer(data=profile_data)
        else:
            return Response(
                {'error': 'Invalid profile type'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if serializer.is_valid():
            profile = serializer.save()
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
        else:
            # Revert invitation usage if profile creation fails
            invitation.is_used = False
            invitation.used_at = None
            invitation.save()
            
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
    
    except Exception as e:
        logger.error(f"Error using invitation: {e}")
        return Response(
            {'error': 'Failed to use invitation'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class ProfileStatsView(APIView):
    """Get profile statistics."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Check cache first
        cache_key = 'profile_stats'
        cached_stats = cache.get(cache_key)
        
        if cached_stats:
            return Response(cached_stats)
        
        # Calculate stats
        stats = {
            'total_students': StudentProfile.objects.count(),
            'total_employers': EmployerProfile.objects.count(),
            'total_institutions': InstitutionProfile.objects.count(),
            'verified_students': StudentProfile.objects.filter(is_verified=True).count(),
            'verified_employers': EmployerProfile.objects.filter(is_verified=True).count(),
            'active_profiles': (
                StudentProfile.objects.filter(is_active=True).count() +
                EmployerProfile.objects.filter(is_active=True).count() +
                InstitutionProfile.objects.filter(is_active=True).count()
            ),
            'recent_registrations': (
                StudentProfile.objects.filter(
                    created_at__gte=timezone.now() - timedelta(days=30)
                ).count() +
                EmployerProfile.objects.filter(
                    created_at__gte=timezone.now() - timedelta(days=30)
                ).count()
            )
        }
        
        # Calculate average completion score
        all_profiles = list(StudentProfile.objects.all()) + list(EmployerProfile.objects.all())
        if all_profiles:
            avg_completion = sum(p.profile_completion_score for p in all_profiles) / len(all_profiles)
            stats['avg_completion_score'] = round(avg_completion, 2)
        else:
            stats['avg_completion_score'] = 0.0
        
        # Cache for 1 hour
        cache.set(cache_key, stats, 3600)
        
        serializer = ProfileStatsSerializer(stats)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def profile_completion(request, user_id):
    """Get profile completion details for a user."""
    try:
        # Try to find the profile in each type
        profile = None
        profile_type = None
        
        try:
            profile = StudentProfile.objects.get(user_id=user_id)
            profile_type = 'student'
        except StudentProfile.DoesNotExist:
            try:
                profile = EmployerProfile.objects.get(user_id=user_id)
                profile_type = 'employer'
            except EmployerProfile.DoesNotExist:
                try:
                    profile = InstitutionProfile.objects.get(user_id=user_id)
                    profile_type = 'institution'
                except InstitutionProfile.DoesNotExist:
                    return Response(
                        {'error': 'Profile not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
        
        # Get completion details
        completion_data = {
            'profile_type': profile_type,
            'completion_score': profile.profile_completion_score,
            'missing_fields': profile.get_missing_fields(),
            'suggestions': profile.get_completion_suggestions()
        }
        
        serializer = ProfileCompletionSerializer(completion_data)
        return Response(serializer.data)
    
    except Exception as e:
        logger.error(f"Error getting profile completion: {e}")
        return Response(
            {'error': 'Failed to get profile completion'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_profile(request, user_id):
    """Verify a user profile (admin only)."""
    try:
        profile_type = request.data.get('profile_type')
        
        if profile_type == 'student':
            profile = get_object_or_404(StudentProfile, user_id=user_id)
        elif profile_type == 'employer':
            profile = get_object_or_404(EmployerProfile, user_id=user_id)
        else:
            return Response(
                {'error': 'Invalid profile type'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        profile.is_verified = True
        profile.save()
        
        # Send verification notification
        try:
            send_profile_update_notification(
                profile.user_id,
                'profile_verified',
                {'profile_type': profile_type}
            )
        except Exception as e:
            logger.error(f"Failed to send verification notification: {e}")
        
        return Response(
            {'message': 'Profile verified successfully'},
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        logger.error(f"Error verifying profile: {e}")
        return Response(
            {'error': 'Failed to verify profile'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )