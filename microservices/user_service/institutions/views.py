from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.cache import cache
from django.utils import timezone
from django.db.models import Q, Count, Avg
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
import requests
import logging

from .models import (
    Institution, InstitutionDepartment, InstitutionProgram,
    InstitutionSettings, InstitutionInvitation, UniversityRegistrationCode
)
from .serializers import (
    InstitutionSerializer, InstitutionListSerializer,
    InstitutionDepartmentSerializer, InstitutionProgramSerializer,
    InstitutionSettingsSerializer, InstitutionInvitationSerializer,
    InstitutionStatsSerializer, InstitutionVerificationSerializer,
    InstitutionSearchSerializer, UniversityRegistrationCodeSerializer,
    UniversityRegistrationCodeValidationSerializer, UniversityRegistrationCodeUsageSerializer
)
from utils.permissions import IsInstitutionAdmin, IsSystemAdmin
from utils.pagination import StandardResultsSetPagination
from utils.filters import InstitutionFilter

logger = logging.getLogger(__name__)


class InstitutionListCreateView(generics.ListCreateAPIView):
    """
    List all institutions or create a new institution.
    """
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = InstitutionFilter
    search_fields = ['name', 'email', 'city', 'country']
    ordering_fields = ['name', 'established_year', 'created_at', 'student_count']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return InstitutionListSerializer
        return InstitutionSerializer

    def get_queryset(self):
        queryset = Institution.objects.select_related().prefetch_related(
            'departments', 'programs'
        ).annotate(
            student_count=Count('students', distinct=True),
            admin_count=Count('admins', distinct=True)
        )
        
        # Filter by status for non-admin users
        if not self.request.user.is_staff:
            queryset = queryset.filter(status='ACTIVE')
            
        return queryset

    def perform_create(self, serializer):
        institution = serializer.save()
        
        # Clear cache
        cache.delete('institutions_stats')
        
        # Send notification to admin
        try:
            requests.post(
                'http://notification-service:8000/api/notifications/send/',
                json={
                    'recipient_type': 'admin',
                    'notification_type': 'institution_created',
                    'title': 'New Institution Created',
                    'message': f'Institution "{institution.name}" has been created and requires verification.',
                    'data': {
                        'institution_id': institution.id,
                        'institution_name': institution.name
                    }
                },
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to send institution creation notification: {e}")


class InstitutionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete an institution.
    """
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Institution.objects.select_related().prefetch_related(
            'departments', 'programs', 'settings'
        ).annotate(
            student_count=Count('students', distinct=True),
            admin_count=Count('admins', distinct=True)
        )
        return queryset

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsInstitutionAdmin()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        old_status = self.get_object().status
        institution = serializer.save()
        
        # Clear cache
        cache.delete('institutions_stats')
        cache.delete(f'institution_{institution.id}')
        
        # If status changed to verified, notify
        if old_status != 'VERIFIED' and institution.status == 'VERIFIED':
            try:
                requests.post(
                    'http://notification-service:8000/api/notifications/send/',
                    json={
                        'recipient_id': institution.contact_email,
                        'notification_type': 'institution_verified',
                        'title': 'Institution Verified',
                        'message': f'Your institution "{institution.name}" has been verified and is now active.',
                        'data': {'institution_id': institution.id}
                    },
                    timeout=5
                )
            except Exception as e:
                logger.error(f"Failed to send verification notification: {e}")

    def perform_destroy(self, instance):
        # Clear cache
        cache.delete('institutions_stats')
        cache.delete(f'institution_{instance.id}')
        
        # Notify related services
        try:
            requests.post(
                'http://internship-service:8000/api/institutions/deleted/',
                json={'institution_id': instance.id},
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to notify internship service: {e}")
        
        instance.delete()


class InstitutionDepartmentListCreateView(generics.ListCreateAPIView):
    """
    List departments for an institution or create a new department.
    """
    serializer_class = InstitutionDepartmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        institution_id = self.kwargs['institution_id']
        return InstitutionDepartment.objects.filter(
            institution_id=institution_id
        ).select_related('institution')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsInstitutionAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        institution_id = self.kwargs['institution_id']
        institution = get_object_or_404(Institution, id=institution_id)
        serializer.save(institution=institution)


class InstitutionDepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete an institution department.
    """
    serializer_class = InstitutionDepartmentSerializer
    permission_classes = [IsInstitutionAdmin]

    def get_queryset(self):
        institution_id = self.kwargs['institution_id']
        return InstitutionDepartment.objects.filter(
            institution_id=institution_id
        ).select_related('institution').prefetch_related('programs')


class InstitutionProgramListCreateView(generics.ListCreateAPIView):
    """
    List programs for an institution/department or create a new program.
    """
    serializer_class = InstitutionProgramSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code', 'degree_type', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        institution_id = self.kwargs['institution_id']
        department_id = self.kwargs.get('department_id')
        
        queryset = InstitutionProgram.objects.filter(
            institution_id=institution_id
        ).select_related('institution', 'department')
        
        if department_id:
            queryset = queryset.filter(department_id=department_id)
            
        return queryset

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsInstitutionAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        institution_id = self.kwargs['institution_id']
        department_id = self.kwargs.get('department_id')
        
        institution = get_object_or_404(Institution, id=institution_id)
        department = None
        if department_id:
            department = get_object_or_404(
                InstitutionDepartment, 
                id=department_id, 
                institution=institution
            )
        
        serializer.save(institution=institution, department=department)


class InstitutionProgramDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete an institution program.
    """
    serializer_class = InstitutionProgramSerializer
    permission_classes = [IsInstitutionAdmin]

    def get_queryset(self):
        institution_id = self.kwargs['institution_id']
        return InstitutionProgram.objects.filter(
            institution_id=institution_id
        ).select_related('institution', 'department')


class InstitutionSettingsView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update institution settings.
    """
    serializer_class = InstitutionSettingsSerializer
    permission_classes = [IsInstitutionAdmin]

    def get_object(self):
        institution_id = self.kwargs['institution_id']
        institution = get_object_or_404(Institution, id=institution_id)
        settings, created = InstitutionSettings.objects.get_or_create(
            institution=institution
        )
        return settings

    def perform_update(self, serializer):
        settings = serializer.save()
        
        # Clear cache
        cache.delete(f'institution_settings_{settings.institution.id}')
        
        # Notify internship service about settings changes
        try:
            requests.post(
                'http://internship-service:8000/api/institutions/settings-updated/',
                json={
                    'institution_id': settings.institution.id,
                    'settings': {
                        'min_internship_duration': settings.min_internship_duration,
                        'max_internship_duration': settings.max_internship_duration,
                        'allow_remote_internships': settings.allow_remote_internships,
                        'require_supervisor_approval': settings.require_supervisor_approval
                    }
                },
                timeout=5
            )
        except Exception as e:
            logger.error(f"Failed to notify internship service: {e}")


class InstitutionInvitationListCreateView(generics.ListCreateAPIView):
    """
    List institution invitations or create a new invitation.
    """
    queryset = InstitutionInvitation.objects.all()
    serializer_class = InstitutionInvitationSerializer
    permission_classes = [IsSystemAdmin]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['institution_name', 'contact_email']
    ordering_fields = ['institution_name', 'created_at', 'expires_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return InstitutionInvitation.objects.select_related('created_by')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InstitutionInvitationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete an institution invitation.
    """
    queryset = InstitutionInvitation.objects.all()
    serializer_class = InstitutionInvitationSerializer
    permission_classes = [IsSystemAdmin]

    def get_queryset(self):
        return InstitutionInvitation.objects.select_related('created_by')


@api_view(['POST'])
@permission_classes([AllowAny])
def use_institution_invitation(request, token):
    """
    Use an institution invitation token to create an institution.
    """
    try:
        invitation = InstitutionInvitation.objects.get(
            token=token,
            is_used=False,
            expires_at__gt=timezone.now()
        )
    except InstitutionInvitation.DoesNotExist:
        return Response(
            {'error': 'Invalid or expired invitation token'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = InstitutionSerializer(data=request.data)
    if serializer.is_valid():
        with transaction.atomic():
            # Create institution
            institution = serializer.save(
                name=invitation.institution_name,
                contact_email=invitation.contact_email,
                status='PENDING'
            )
            
            # Mark invitation as used
            invitation.use_invitation(institution)
            
            # Clear cache
            cache.delete('institutions_stats')
            
            # Send welcome notification
            try:
                requests.post(
                    'http://notification-service:8000/api/notifications/send/',
                    json={
                        'recipient_id': institution.contact_email,
                        'notification_type': 'institution_welcome',
                        'title': 'Welcome to EduLink',
                        'message': f'Welcome to EduLink! Your institution "{institution.name}" has been successfully registered.',
                        'data': {'institution_id': institution.id}
                    },
                    timeout=5
                )
            except Exception as e:
                logger.error(f"Failed to send welcome notification: {e}")
            
            return Response(
                InstitutionSerializer(institution).data,
                status=status.HTTP_201_CREATED
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def institution_stats(request):
    """
    Get institution statistics.
    """
    # Try to get from cache first
    cache_key = 'institutions_stats'
    stats = cache.get(cache_key)
    
    if stats is None:
        stats = {
            'total_institutions': Institution.objects.count(),
            'active_institutions': Institution.objects.filter(status='ACTIVE').count(),
            'pending_institutions': Institution.objects.filter(status='PENDING').count(),
            'verified_institutions': Institution.objects.filter(status='VERIFIED').count(),
            'suspended_institutions': Institution.objects.filter(status='SUSPENDED').count(),
            'institutions_by_type': dict(
                Institution.objects.values_list('type').annotate(count=Count('id'))
            ),
            'institutions_by_country': dict(
                Institution.objects.values_list('country').annotate(count=Count('id'))[:10]
            ),
            'total_departments': InstitutionDepartment.objects.count(),
            'total_programs': InstitutionProgram.objects.count(),
            'avg_departments_per_institution': Institution.objects.annotate(
                dept_count=Count('departments')
            ).aggregate(avg=Avg('dept_count'))['avg'] or 0,
            'avg_programs_per_institution': Institution.objects.annotate(
                prog_count=Count('programs')
            ).aggregate(avg=Avg('prog_count'))['avg'] or 0
        }
        
        # Cache for 1 hour
        cache.set(cache_key, stats, 3600)
    
    serializer = InstitutionStatsSerializer(stats)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsSystemAdmin])
def verify_institution(request, pk):
    """
    Verify an institution.
    """
    institution = get_object_or_404(Institution, pk=pk)
    
    if institution.status == 'VERIFIED':
        return Response(
            {'error': 'Institution is already verified'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    institution.status = 'VERIFIED'
    institution.verified_at = timezone.now()
    institution.verified_by = request.user
    institution.save()
    
    # Clear cache
    cache.delete('institutions_stats')
    cache.delete(f'institution_{institution.id}')
    
    # Send verification notification
    try:
        requests.post(
            'http://notification-service:8000/api/notifications/send/',
            json={
                'recipient_id': institution.contact_email,
                'notification_type': 'institution_verified',
                'title': 'Institution Verified',
                'message': f'Congratulations! Your institution "{institution.name}" has been verified.',
                'data': {'institution_id': institution.id}
            },
            timeout=5
        )
    except Exception as e:
        logger.error(f"Failed to send verification notification: {e}")
    
    serializer = InstitutionVerificationSerializer({
        'institution_id': institution.id,
        'status': institution.status,
        'verified_at': institution.verified_at,
        'verified_by': institution.verified_by.username if institution.verified_by else None
    })
    
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsSystemAdmin])
def unverify_institution(request, pk):
    """
    Unverify an institution.
    """
    institution = get_object_or_404(Institution, pk=pk)
    
    if institution.status != 'VERIFIED':
        return Response(
            {'error': 'Institution is not verified'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    institution.status = 'PENDING'
    institution.verified_at = None
    institution.verified_by = None
    institution.save()
    
    # Clear cache
    cache.delete('institutions_stats')
    cache.delete(f'institution_{institution.id}')
    
    # Send notification
    try:
        requests.post(
            'http://notification-service:8000/api/notifications/send/',
            json={
                'recipient_id': institution.contact_email,
                'notification_type': 'institution_unverified',
                'title': 'Institution Verification Removed',
                'message': f'The verification status of your institution "{institution.name}" has been removed.',
                'data': {'institution_id': institution.id}
            },
            timeout=5
        )
    except Exception as e:
        logger.error(f"Failed to send unverification notification: {e}")
    
    serializer = InstitutionVerificationSerializer({
        'institution_id': institution.id,
        'status': institution.status,
        'verified_at': institution.verified_at,
        'verified_by': None
    })
    
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_institutions(request):
    """
    Search institutions with advanced filters.
    """
    serializer = InstitutionSearchSerializer(data=request.query_params)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    queryset = Institution.objects.filter(status='ACTIVE')
    
    # Apply filters
    if data.get('query'):
        query = data['query']
        queryset = queryset.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(city__icontains=query) |
            Q(country__icontains=query)
        )
    
    if data.get('type'):
        queryset = queryset.filter(type=data['type'])
    
    if data.get('country'):
        queryset = queryset.filter(country=data['country'])
    
    if data.get('city'):
        queryset = queryset.filter(city__icontains=data['city'])
    
    if data.get('established_year_min'):
        queryset = queryset.filter(established_year__gte=data['established_year_min'])
    
    if data.get('established_year_max'):
        queryset = queryset.filter(established_year__lte=data['established_year_max'])
    
    # Annotate with counts
    queryset = queryset.annotate(
        student_count=Count('students', distinct=True),
        program_count=Count('programs', distinct=True)
    )
    
    # Apply ordering
    ordering = data.get('ordering', 'name')
    if ordering in ['name', '-name', 'established_year', '-established_year', 'student_count', '-student_count']:
        queryset = queryset.order_by(ordering)
    
    # Paginate results
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(queryset, request)
    
    if page is not None:
        serializer = InstitutionListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = InstitutionListSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_university_code(request):
    """
    Validate a university registration code.
    Used by Auth Service during student registration.
    """
    serializer = UniversityRegistrationCodeValidationSerializer(data=request.data)
    
    if serializer.is_valid():
        reg_code = serializer.validated_data['registration_code_obj']
        
        return Response({
            'success': True,
            'message': 'Registration code is valid',
            'data': {
                'code': reg_code.code,
                'institution': {
                    'id': str(reg_code.institution.id),
                    'name': reg_code.institution.name,
                    'email': reg_code.institution.email,
                    'is_verified': reg_code.institution.is_verified
                },
                'allowed_years': reg_code.allowed_years,
                'allowed_courses': reg_code.allowed_courses,
                'remaining_uses': reg_code.remaining_uses
            }
        }, status=status.HTTP_200_OK)
    
    return Response({
        'success': False,
        'message': 'Invalid registration code',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def use_university_code(request):
    """
    Use a university registration code.
    Called by Auth Service after successful student registration.
    """
    serializer = UniversityRegistrationCodeUsageSerializer(data=request.data)
    
    if serializer.is_valid():
        reg_code = serializer.validated_data['registration_code_obj']
        
        try:
            # Use the code (increment usage count)
            reg_code.use_code()
            
            logger.info(
                f"University registration code used: {reg_code.code} "
                f"for institution {reg_code.institution.name} "
                f"(uses: {reg_code.current_uses}/{reg_code.max_uses or 'unlimited'})"
            )
            
            return Response({
                'success': True,
                'message': 'Registration code used successfully',
                'data': {
                    'code': reg_code.code,
                    'current_uses': reg_code.current_uses,
                    'remaining_uses': reg_code.remaining_uses
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Failed to use registration code {reg_code.code}: {e}")
            return Response({
                'success': False,
                'message': 'Failed to use registration code',
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'success': False,
        'message': 'Invalid request data',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


class UniversityRegistrationCodeListCreateView(generics.ListCreateAPIView):
    """
    List and create university registration codes.
    Only accessible by institution admins.
    """
    serializer_class = UniversityRegistrationCodeSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'description']
    ordering_fields = ['code', 'created_at', 'valid_from', 'valid_until']
    ordering = ['-created_at']
    
    def get_queryset(self):
        # Filter by user's institution
        user_institution_id = getattr(self.request.user, 'institution_id', None)
        if user_institution_id:
            return UniversityRegistrationCode.objects.filter(
                institution_id=user_institution_id
            ).select_related('institution')
        return UniversityRegistrationCode.objects.none()
    
    def perform_create(self, serializer):
        # Set the institution and creator
        user_institution_id = getattr(self.request.user, 'institution_id', None)
        if not user_institution_id:
            raise serializers.ValidationError("User must be associated with an institution")
        
        serializer.save(
            institution_id=user_institution_id,
            created_by=self.request.user.id
        )


class UniversityRegistrationCodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a university registration code.
    Only accessible by institution admins.
    """
    serializer_class = UniversityRegistrationCodeSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]
    
    def get_queryset(self):
        # Filter by user's institution
        user_institution_id = getattr(self.request.user, 'institution_id', None)
        if user_institution_id:
            return UniversityRegistrationCode.objects.filter(
                institution_id=user_institution_id
            ).select_related('institution')
        return UniversityRegistrationCode.objects.none()