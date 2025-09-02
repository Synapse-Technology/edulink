from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
import logging
import uuid

from .models import (
    RegistrationRequest, 
    RegistrationRequestLog, 
    RegistrationRequestAttachment,
    RegistrationStatus,
    UserRole,
    RiskLevel
)
from .serializers import (
    RegistrationRequestCreateSerializer,
    RegistrationRequestSerializer,
    RegistrationRequestUpdateSerializer,
    RegistrationRequestLogSerializer,
    RegistrationRequestAttachmentSerializer,
    EmailVerificationSerializer,
    DomainVerificationSerializer,
    ApprovalActionSerializer,
    BulkActionSerializer,
    RegistrationStatsSerializer
)
from .services import (
    RegistrationService,
    EmailVerificationService,
    DomainVerificationService,
    InstitutionalVerificationService,
    RiskAssessmentService
)
from .permissions import IsAdminUser, IsOwnerOrAdmin, IsInstitutionAdmin
from .filters import RegistrationRequestFilter
from rest_framework import viewsets
from rest_framework.decorators import action

logger = logging.getLogger('registration_requests')


class RegistrationRequestPagination(PageNumberPagination):
    """Custom pagination for registration requests."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class CreateRegistrationRequestView(generics.CreateAPIView):
    """Create a new registration request."""
    
    serializer_class = RegistrationRequestCreateSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        """Create registration request with risk assessment."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract metadata
        metadata = {
            'ip_address': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'referrer': request.META.get('HTTP_REFERER', ''),
        }
        
        # Create registration request
        registration_request = RegistrationService.create_registration_request(
            validated_data=serializer.validated_data,
            password=request.data.get('password'),
            metadata=metadata
        )
        
        # Log the creation
        RegistrationRequestLog.objects.create(
            registration_request=registration_request,
            action='created',
            new_status=registration_request.status,
            performed_by='system',
            notes='Registration request created'
        )
        
        # Send email verification
        logger.info(f"About to send verification email to {registration_request.email}")
        try:
            result = EmailVerificationService.send_verification_email(registration_request)
            logger.info(f"Email verification result: {result}")
        except Exception as e:
            logger.error(f"Error sending verification email: {str(e)}")
        logger.info(f"Finished sending verification email to {registration_request.email}")
        
        response_serializer = RegistrationRequestSerializer(registration_request)
        return Response(
            {
                'message': 'Registration request created successfully. Please check your email for verification.',
                'registration_request': response_serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    
    def get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RegistrationRequestListView(generics.ListAPIView):
    """List registration requests (admin only)."""
    
    serializer_class = RegistrationRequestSerializer
    permission_classes = [IsAdminUser]
    pagination_class = RegistrationRequestPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = RegistrationRequestFilter
    search_fields = ['email', 'first_name', 'last_name', 'organization_name', 'request_number']
    ordering_fields = ['created_at', 'updated_at', 'risk_score', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get filtered queryset."""
        queryset = RegistrationRequest.objects.all()
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by role if provided
        role_filter = self.request.query_params.get('role')
        if role_filter:
            queryset = queryset.filter(role=role_filter)
        
        # Filter by risk level if provided
        risk_filter = self.request.query_params.get('risk_level')
        if risk_filter:
            queryset = queryset.filter(risk_level=risk_filter)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        return queryset


class RegistrationRequestDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve and update registration request details."""
    
    queryset = RegistrationRequest.objects.all()
    permission_classes = [IsOwnerOrAdmin]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on request method."""
        if self.request.method == 'GET':
            return RegistrationRequestSerializer
        return RegistrationRequestUpdateSerializer
    
    def update(self, request, *args, **kwargs):
        """Update registration request with logging."""
        instance = self.get_object()
        old_status = instance.status
        
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Perform update
        updated_instance = serializer.save()
        
        # Log the update
        RegistrationRequestLog.objects.create(
            registration_request=updated_instance,
            action='updated',
            old_status=old_status,
            new_status=updated_instance.status,
            performed_by=request.user.email if request.user.is_authenticated else 'system',
            notes=f"Updated by {request.user.email if request.user.is_authenticated else 'system'}"
        )
        
        return Response(RegistrationRequestSerializer(updated_instance).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_email(request):
    """Verify email address using token."""
    serializer = EmailVerificationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    token = serializer.validated_data['token']
    
    try:
        registration_request = EmailVerificationService.verify_email(token)
        
        return Response({
            'message': 'Email verified successfully.',
            'registration_request': RegistrationRequestSerializer(registration_request).data
        })
    
    except Exception as e:
        logger.error(f"Email verification failed: {str(e)}")
        return Response(
            {'error': 'Email verification failed.'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def verify_domain(request):
    """Verify organization domain."""
    serializer = DomainVerificationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    registration_request_id = serializer.validated_data['registration_request_id']
    verification_method = serializer.validated_data['verification_method']
    verification_details = serializer.validated_data.get('verification_details', {})
    
    try:
        registration_request = get_object_or_404(RegistrationRequest, id=registration_request_id)
        
        # Perform domain verification
        result = DomainVerificationService.verify_domain(
            registration_request,
            verification_method,
            verification_details
        )
        
        if result['verified']:
            return Response({
                'message': 'Domain verified successfully.',
                'registration_request': RegistrationRequestSerializer(registration_request).data
            })
        else:
            return Response(
                {'error': result.get('error', 'Domain verification failed.')},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    except Exception as e:
        logger.error(f"Domain verification failed: {str(e)}")
        return Response(
            {'error': 'Domain verification failed.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def verify_institution(request, pk):
    """Verify institution with CUE/TVETA."""
    registration_request = get_object_or_404(RegistrationRequest, pk=pk)
    
    try:
        result = InstitutionalVerificationService.verify_institution(registration_request)
        
        if result['verified']:
            return Response({
                'message': 'Institution verified successfully.',
                'verification_details': result['details'],
                'registration_request': RegistrationRequestSerializer(registration_request).data
            })
        else:
            return Response(
                {
                    'error': result.get('error', 'Institution verification failed.'),
                    'details': result.get('details', {})
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    except Exception as e:
        logger.error(f"Institution verification failed: {str(e)}")
        return Response(
            {'error': 'Institution verification failed.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def approve_reject_request(request, pk):
    """Approve or reject a registration request."""
    registration_request = get_object_or_404(RegistrationRequest, pk=pk)
    serializer = ApprovalActionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    action = serializer.validated_data['action']
    notes = serializer.validated_data.get('notes', '')
    reason = serializer.validated_data.get('reason', '')
    
    try:
        if action == 'approve':
            result = RegistrationService.approve_registration_request(
                registration_request,
                approved_by=request.user.email,
                notes=notes
            )
            message = 'Registration request approved successfully.'
        else:
            result = RegistrationService.reject_registration_request(
                registration_request,
                rejected_by=request.user.email,
                reason=reason,
                notes=notes
            )
            message = 'Registration request rejected.'
        
        return Response({
            'message': message,
            'registration_request': RegistrationRequestSerializer(registration_request).data,
            'user_account_created': result.get('user_account_created', False)
        })
    
    except Exception as e:
        logger.error(f"Approval/rejection failed: {str(e)}")
        return Response(
            {'error': f'{action.title()} failed.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def bulk_action(request):
    """Perform bulk actions on registration requests."""
    serializer = BulkActionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    request_ids = serializer.validated_data['request_ids']
    action = serializer.validated_data['action']
    notes = serializer.validated_data.get('notes', '')
    reason = serializer.validated_data.get('reason', '')
    reviewer = serializer.validated_data.get('reviewer', '')
    
    try:
        registration_requests = RegistrationRequest.objects.filter(id__in=request_ids)
        results = []
        
        for registration_request in registration_requests:
            try:
                if action == 'approve':
                    result = RegistrationService.approve_registration_request(
                        registration_request,
                        approved_by=request.user.email,
                        notes=notes
                    )
                elif action == 'reject':
                    result = RegistrationService.reject_registration_request(
                        registration_request,
                        rejected_by=request.user.email,
                        reason=reason,
                        notes=notes
                    )
                elif action == 'assign_reviewer':
                    registration_request.assigned_reviewer = reviewer
                    registration_request.review_started_at = timezone.now()
                    registration_request.save()
                    result = {'success': True}
                
                results.append({
                    'id': str(registration_request.id),
                    'success': True,
                    'result': result
                })
            
            except Exception as e:
                results.append({
                    'id': str(registration_request.id),
                    'success': False,
                    'error': str(e)
                })
        
        return Response({
            'message': f'Bulk {action} completed.',
            'results': results
        })
    
    except Exception as e:
        logger.error(f"Bulk action failed: {str(e)}")
        return Response(
            {'error': 'Bulk action failed.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def registration_stats(request):
    """Get registration statistics."""
    try:
        # Basic counts
        total_requests = RegistrationRequest.objects.count()
        pending_requests = RegistrationRequest.objects.filter(
            status__in=[
                RegistrationStatus.PENDING,
                RegistrationStatus.EMAIL_VERIFICATION_SENT,
                RegistrationStatus.EMAIL_VERIFIED,
                RegistrationStatus.DOMAIN_VERIFICATION_PENDING,
                RegistrationStatus.INSTITUTIONAL_VERIFICATION_PENDING
            ]
        ).count()
        approved_requests = RegistrationRequest.objects.filter(
            status=RegistrationStatus.APPROVED
        ).count()
        rejected_requests = RegistrationRequest.objects.filter(
            status=RegistrationStatus.REJECTED
        ).count()
        under_review = RegistrationRequest.objects.filter(
            status=RegistrationStatus.UNDER_REVIEW
        ).count()
        
        # Breakdown by role
        by_role = dict(
            RegistrationRequest.objects.values('role').annotate(
                count=Count('id')
            ).values_list('role', 'count')
        )
        
        # Breakdown by institution type
        by_institution_type = dict(
            RegistrationRequest.objects.filter(
                role=UserRole.INSTITUTION_ADMIN
            ).values('organization_type').annotate(
                count=Count('id')
            ).values_list('organization_type', 'count')
        )
        
        # Breakdown by risk level
        by_risk_level = dict(
            RegistrationRequest.objects.values('risk_level').annotate(
                count=Count('id')
            ).values_list('risk_level', 'count')
        )
        
        # Recent activity (last 10 logs)
        recent_logs = RegistrationRequestLog.objects.select_related(
            'registration_request'
        ).order_by('-created_at')[:10]
        
        recent_activity = [
            {
                'id': log.id,
                'action': log.action,
                'request_number': log.registration_request.request_number,
                'email': log.registration_request.email,
                'performed_by': log.performed_by,
                'created_at': log.created_at
            }
            for log in recent_logs
        ]
        
        stats = {
            'total_requests': total_requests,
            'pending_requests': pending_requests,
            'approved_requests': approved_requests,
            'rejected_requests': rejected_requests,
            'under_review': under_review,
            'by_role': by_role,
            'by_institution_type': by_institution_type,
            'by_risk_level': by_risk_level,
            'recent_activity': recent_activity
        }
        
        serializer = RegistrationStatsSerializer(stats)
        return Response(serializer.data)
    
    except Exception as e:
        logger.error(f"Stats generation failed: {str(e)}")
        return Response(
            {'error': 'Failed to generate statistics.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_email_availability(request):
    """Check if email is available for registration."""
    email = request.query_params.get('email')
    
    if not email:
        return Response(
            {'error': 'Email parameter is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    exists = RegistrationRequest.objects.filter(
        email=email.lower(),
        status__in=[
            RegistrationStatus.PENDING,
            RegistrationStatus.EMAIL_VERIFICATION_SENT,
            RegistrationStatus.EMAIL_VERIFIED,
            RegistrationStatus.UNDER_REVIEW,
            RegistrationStatus.APPROVED
        ]
    ).exists()
    
    return Response({
        'email': email,
        'available': not exists,
        'message': 'Email is available' if not exists else 'Email is already registered'
    })


class RegistrationRequestLogListView(generics.ListAPIView):
    """List logs for a specific registration request."""
    
    serializer_class = RegistrationRequestLogSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        """Get logs for the specified registration request."""
        registration_request_id = self.kwargs['pk']
        return RegistrationRequestLog.objects.filter(
            registration_request_id=registration_request_id
        ).order_by('-created_at')


class RegistrationRequestAttachmentListView(generics.ListCreateAPIView):
    """List and create attachments for a registration request."""
    
    serializer_class = RegistrationRequestAttachmentSerializer
    permission_classes = [IsOwnerOrAdmin]
    
    def get_queryset(self):
        """Get attachments for the specified registration request."""
        registration_request_id = self.kwargs['pk']
        return RegistrationRequestAttachment.objects.filter(
            registration_request_id=registration_request_id
        ).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create attachment with registration request association."""
        registration_request_id = self.kwargs['pk']
        registration_request = get_object_or_404(RegistrationRequest, pk=registration_request_id)
        
        serializer.save(
            registration_request=registration_request,
            uploaded_by=self.request.user.email if self.request.user.is_authenticated else 'anonymous'
        )


# ViewSets for router
class RegistrationRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for registration requests."""
    
    serializer_class = RegistrationRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = RegistrationRequestPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = RegistrationRequestFilter
    search_fields = ['email', 'first_name', 'last_name', 'institution_name']
    ordering_fields = ['created_at', 'updated_at', 'status']
    ordering = ['-created_at']
    
    def get_permissions(self):
        """Override permissions for create action to allow any user."""
        if self.action == 'create':
            return [permissions.AllowAny()]
        return super().get_permissions()
    
    def get_queryset(self):
        """Get registration requests based on user permissions."""
        user = self.request.user
        if user.is_staff:
            return RegistrationRequest.objects.all()
        return RegistrationRequest.objects.filter(email=user.email)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return RegistrationRequestCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return RegistrationRequestUpdateSerializer
        return RegistrationRequestSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new registration request with email verification."""
        logger.info(f"Creating registration request for email: {request.data.get('email')}")
        
        # Create the serializer and validate
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create the instance using serializer (which handles field mapping)
        registration_request = serializer.save()
        
        # Generate email verification token using service method
        import secrets
        registration_request.email_verification_token = secrets.token_urlsafe(32)
        registration_request.save()
        logger.info(f"Registration request created with ID: {registration_request.id} and token: {registration_request.email_verification_token}")
        
        # Send email verification
        logger.info(f"About to send verification email to {registration_request.email}")
        try:
            result = EmailVerificationService.send_verification_email(registration_request)
            logger.info(f"Email verification result: {result}")
        except Exception as e:
            logger.error(f"Error sending verification email: {str(e)}")
        logger.info(f"Finished sending verification email to {registration_request.email}")
        
        # Serialize the created instance for response
        response_serializer = self.get_serializer(registration_request)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class RegistrationRequestLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for registration request logs."""
    
    serializer_class = RegistrationRequestLogSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        """Get logs for registration requests."""
        return RegistrationRequestLog.objects.all().order_by('-created_at')


class RegistrationRequestAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for registration request attachments."""
    
    serializer_class = RegistrationRequestAttachmentSerializer
    permission_classes = [IsOwnerOrAdmin]
    
    def get_queryset(self):
        """Get attachments for registration requests."""
        return RegistrationRequestAttachment.objects.all().order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create attachment with user association."""
        serializer.save(
            uploaded_by=self.request.user.email if self.request.user.is_authenticated else 'anonymous'
        )


# Additional views referenced in URLs
class EmailVerificationView(generics.GenericAPIView):
    """View for email verification."""
    
    serializer_class = EmailVerificationSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'token'
    
    def post(self, request, token=None):
        """Verify email address using token."""
        try:
            # If token is in URL path, use it; otherwise get from request data
            verification_token = token or request.data.get('token')
            
            if not verification_token:
                return Response(
                    {'error': 'Verification token is required.', 'error_type': 'missing_token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if token exists and get more specific error information
            try:
                # First check if token exists at all
                registration_request = RegistrationRequest.objects.get(
                    email_verification_token=verification_token
                )
                
                # Check if already verified
                if registration_request.email_verified or registration_request.status == RegistrationStatus.EMAIL_VERIFIED:
                    return Response({
                        'error': 'This email has already been verified.',
                        'error_type': 'already_verified',
                        'registration_request_id': str(registration_request.id),
                        'request_number': registration_request.request_number,
                        'status': registration_request.status
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if expired
                if registration_request.is_expired:
                    return Response({
                        'error': 'This verification link has expired. Please request a new verification email.',
                        'error_type': 'expired',
                        'registration_request_id': str(registration_request.id),
                        'request_number': registration_request.request_number,
                        'expires_at': registration_request.expires_at.isoformat() if registration_request.expires_at else None
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if in wrong status
                if registration_request.status != RegistrationStatus.EMAIL_VERIFICATION_SENT:
                    return Response({
                        'error': f'Email verification is not available for this request. Current status: {registration_request.get_status_display()}',
                        'error_type': 'invalid_status',
                        'registration_request_id': str(registration_request.id),
                        'request_number': registration_request.request_number,
                        'status': registration_request.status
                    }, status=status.HTTP_400_BAD_REQUEST)
                
            except RegistrationRequest.DoesNotExist:
                return Response({
                    'error': 'Invalid verification token. This link may be incorrect or the registration request may have been removed.',
                    'error_type': 'invalid_token'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify the email using the service
            registration_request = EmailVerificationService.verify_email(verification_token)
            
            return Response({
                'message': 'Email verified successfully.',
                'registration_request_id': str(registration_request.id),
                'request_number': registration_request.request_number,
                'status': registration_request.status,
                'next_step': 'Your registration will now proceed to the next verification step.'
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            logger.error(f"Email verification failed: {str(e)}")
            error_message = str(e)
            error_type = 'expired' if 'expired' in error_message.lower() else 'validation_error'
            return Response(
                {'error': error_message, 'error_type': error_type},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error during email verification: {str(e)}")
            return Response(
                {'error': 'An unexpected error occurred during email verification. Please try again later.', 'error_type': 'server_error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DomainVerificationView(generics.GenericAPIView):
    """View for domain verification."""
    
    serializer_class = DomainVerificationSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Verify domain."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Implement domain verification logic here
        return Response({'message': 'Domain verification initiated'})


class InstitutionalVerificationView(generics.GenericAPIView):
    """View for institutional verification."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Verify institution."""
        # Implement institutional verification logic here
        return Response({'message': 'Institutional verification initiated'})


class ApprovalActionView(generics.GenericAPIView):
    """View for approval actions."""
    
    serializer_class = ApprovalActionSerializer
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        """Process approval action."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Implement approval action logic here
        return Response({'message': 'Approval action processed'})


class BulkActionView(generics.GenericAPIView):
    """View for bulk actions."""
    
    serializer_class = BulkActionSerializer
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        """Process bulk action."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Implement bulk action logic here
        return Response({'message': 'Bulk action processed'})


class RegistrationStatsView(generics.GenericAPIView):
    """View for registration statistics."""
    
    serializer_class = RegistrationStatsSerializer
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Get registration statistics."""
        # Implement statistics logic here
        stats = {
            'total_requests': RegistrationRequest.objects.count(),
            'pending_requests': RegistrationRequest.objects.filter(status=RegistrationStatus.PENDING).count(),
            'approved_requests': RegistrationRequest.objects.filter(status=RegistrationStatus.APPROVED).count(),
        }
        return Response(stats)


class EmailAvailabilityView(generics.GenericAPIView):
    """View for checking email availability."""
    
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        """Check if email is available."""
        email = request.query_params.get('email')
        if not email:
            return Response({'error': 'Email parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        exists = RegistrationRequest.objects.filter(
            email=email,
            status__in=[
                RegistrationStatus.PENDING,
                RegistrationStatus.UNDER_REVIEW,
                RegistrationStatus.APPROVED
            ]
        ).exists()
        
        return Response({
            'email': email,
            'available': not exists,
            'message': 'Email is available' if not exists else 'Email is already registered'
        })


class RegistrationStatusView(generics.GenericAPIView):
    """View for checking registration status by reference number."""
    
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, reference_number):
        """Get registration status by reference number."""
        try:
            registration_request = RegistrationRequest.objects.get(
                request_number=reference_number
            )
            
            return Response({
                'reference_number': reference_number,
                'status': registration_request.status,
                'status_display': registration_request.get_status_display(),
                'organization_name': registration_request.organization_name,
                'role': registration_request.role,
                'role_display': registration_request.get_role_display(),
                'email_verified': registration_request.email_verified,
                'domain_verified': registration_request.domain_verified,
                'institutional_verified': registration_request.institutional_verified,
                'created_at': registration_request.created_at,
                'updated_at': registration_request.updated_at
            })
            
        except RegistrationRequest.DoesNotExist:
            return Response(
                {'error': 'Registration request not found with this reference number'},
                status=status.HTTP_404_NOT_FOUND
            )