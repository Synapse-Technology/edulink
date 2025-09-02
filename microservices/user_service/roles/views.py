from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from django.core.cache import cache
from django.db import transaction
from datetime import timedelta
import logging

from .models import UserRole, RolePermission, RoleAssignmentHistory, RoleInvitation, RoleChoices
from .serializers import (
    UserRoleSerializer, UserRoleListSerializer, RolePermissionSerializer,
    RoleAssignmentHistorySerializer, RoleInvitationSerializer,
    UserRoleStatsSerializer, UserPermissionsSerializer,
    RoleAssignmentRequestSerializer, BulkRoleAssignmentSerializer
)
from user_service.utils import ServiceClient

logger = logging.getLogger(__name__)


class UserRoleListCreateView(generics.ListCreateAPIView):
    """List and create user roles."""
    
    queryset = UserRole.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserRoleListSerializer
        return UserRoleSerializer
    
    def get_queryset(self):
        queryset = UserRole.objects.select_related().all()
        
        # Filter by user ID
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by institution
        institution_id = self.request.query_params.get('institution_id')
        if institution_id:
            queryset = queryset.filter(institution_id=institution_id)
        
        # Filter by employer
        employer_id = self.request.query_params.get('employer_id')
        if employer_id:
            queryset = queryset.filter(employer_id=employer_id)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by validity (active and not expired)
        is_valid = self.request.query_params.get('is_valid')
        if is_valid is not None and is_valid.lower() == 'true':
            queryset = queryset.filter(
                is_active=True
            ).filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
            )
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        role = serializer.save()
        
        # Create history record
        RoleAssignmentHistory.objects.create(
            user_id=role.user_id,
            role=role.role,
            action='assigned',
            institution_id=role.institution_id,
            employer_id=role.employer_id,
            performed_by_user_id=self.request.user.id if hasattr(self.request.user, 'id') else None,
            new_data={
                'permissions': role.permissions,
                'metadata': role.metadata,
                'expires_at': role.expires_at.isoformat() if role.expires_at else None
            }
        )
        
        logger.info(f"Role {role.role} assigned to user {role.user_id}")


class UserRoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete user role."""
    
    queryset = UserRole.objects.all()
    serializer_class = UserRoleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_update(self, serializer):
        old_role = self.get_object()
        old_data = {
            'permissions': old_role.permissions,
            'metadata': old_role.metadata,
            'is_active': old_role.is_active,
            'expires_at': old_role.expires_at.isoformat() if old_role.expires_at else None
        }
        
        role = serializer.save()
        
        # Create history record
        RoleAssignmentHistory.objects.create(
            user_id=role.user_id,
            role=role.role,
            action='updated',
            institution_id=role.institution_id,
            employer_id=role.employer_id,
            performed_by_user_id=self.request.user.id if hasattr(self.request.user, 'id') else None,
            previous_data=old_data,
            new_data={
                'permissions': role.permissions,
                'metadata': role.metadata,
                'is_active': role.is_active,
                'expires_at': role.expires_at.isoformat() if role.expires_at else None
            }
        )
        
        logger.info(f"Role {role.role} updated for user {role.user_id}")
    
    def perform_destroy(self, instance):
        # Create history record before deletion
        RoleAssignmentHistory.objects.create(
            user_id=instance.user_id,
            role=instance.role,
            action='removed',
            institution_id=instance.institution_id,
            employer_id=instance.employer_id,
            performed_by_user_id=self.request.user.id if hasattr(self.request.user, 'id') else None,
            previous_data={
                'permissions': instance.permissions,
                'metadata': instance.metadata,
                'is_active': instance.is_active
            }
        )
        
        logger.info(f"Role {instance.role} removed from user {instance.user_id}")
        instance.delete()


class RolePermissionListCreateView(generics.ListCreateAPIView):
    """List and create role permissions."""
    
    queryset = RolePermission.objects.all()
    serializer_class = RolePermissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = RolePermission.objects.all()
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__icontains=category)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search by name or description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        
        return queryset.order_by('category', 'name')


class RolePermissionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete role permission."""
    
    queryset = RolePermission.objects.all()
    serializer_class = RolePermissionSerializer
    permission_classes = [permissions.IsAuthenticated]


class RoleAssignmentHistoryListView(generics.ListAPIView):
    """List role assignment history."""
    
    queryset = RoleAssignmentHistory.objects.all()
    serializer_class = RoleAssignmentHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = RoleAssignmentHistory.objects.all()
        
        # Filter by user ID
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        return queryset.order_by('-created_at')


class RoleInvitationListCreateView(generics.ListCreateAPIView):
    """List and create role invitations."""
    
    queryset = RoleInvitation.objects.all()
    serializer_class = RoleInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = RoleInvitation.objects.all()
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by used status
        is_used = self.request.query_params.get('is_used')
        if is_used is not None:
            queryset = queryset.filter(is_used=is_used.lower() == 'true')
        
        # Filter by validity
        is_valid = self.request.query_params.get('is_valid')
        if is_valid is not None and is_valid.lower() == 'true':
            queryset = queryset.filter(
                is_used=False,
                expires_at__gt=timezone.now()
            )
        
        # Filter by institution or employer
        institution_id = self.request.query_params.get('institution_id')
        if institution_id:
            queryset = queryset.filter(institution_id=institution_id)
        
        employer_id = self.request.query_params.get('employer_id')
        if employer_id:
            queryset = queryset.filter(employer_id=employer_id)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        invitation = serializer.save()
        
        # Send invitation email
        try:
            service_client = ServiceClient()
            service_client.post(
                'notification',
                '/api/notifications/send-role-invitation/',
                {
                    'email': invitation.email,
                    'role': invitation.role,
                    'invitation_token': str(invitation.token),
                    'expires_at': invitation.expires_at.isoformat(),
                    'invited_by': invitation.invited_by_user_id,
                    'institution_id': invitation.institution_id,
                    'employer_id': invitation.employer_id
                }
            )
            logger.info(f"Role invitation sent to {invitation.email}")
        except Exception as e:
            logger.error(f"Failed to send role invitation email: {e}")


class RoleInvitationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete role invitation."""
    
    queryset = RoleInvitation.objects.all()
    serializer_class = RoleInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def use_role_invitation(request, token):
    """Use a role invitation token to assign a role."""
    try:
        invitation = get_object_or_404(
            RoleInvitation,
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
        
        with transaction.atomic():
            # Use the invitation
            role_data = invitation.use_invitation(user_id)
            
            # Create the role assignment
            role = UserRole.objects.create(
                user_id=user_id,
                role=role_data['role'],
                institution_id=role_data['institution_id'],
                employer_id=role_data['employer_id'],
                permissions=role_data['permissions'],
                metadata=role_data['metadata'],
                assigned_by_user_id=invitation.invited_by_user_id
            )
            
            # Create history record
            RoleAssignmentHistory.objects.create(
                user_id=user_id,
                role=role.role,
                action='assigned',
                institution_id=role.institution_id,
                employer_id=role.employer_id,
                performed_by_user_id=invitation.invited_by_user_id,
                reason=f'Role assigned via invitation token {token}',
                new_data={
                    'permissions': role.permissions,
                    'metadata': role.metadata,
                    'invitation_token': str(token)
                }
            )
        
        serializer = UserRoleSerializer(role)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        logger.error(f"Error using role invitation: {e}")
        return Response(
            {'error': 'Failed to use role invitation'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class UserRoleStatsView(APIView):
    """Get user role statistics."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Check cache first
        cache_key = 'user_role_stats'
        cached_stats = cache.get(cache_key)
        
        if cached_stats:
            return Response(cached_stats)
        
        # Calculate stats
        total_roles = UserRole.objects.count()
        active_roles = UserRole.objects.filter(is_active=True).count()
        expired_roles = UserRole.objects.filter(
            expires_at__lte=timezone.now()
        ).count()
        
        # Role distribution
        role_counts = UserRole.objects.filter(is_active=True).values('role').annotate(
            count=Count('id')
        )
        role_distribution = {item['role']: item['count'] for item in role_counts}
        
        # Recent assignments (last 30 days)
        recent_assignments = UserRole.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        # Unique users with roles
        total_users = UserRole.objects.filter(is_active=True).values('user_id').distinct().count()
        
        stats = {
            'total_users': total_users,
            'total_students': role_distribution.get(RoleChoices.STUDENT, 0),
            'total_employers': role_distribution.get(RoleChoices.EMPLOYER, 0),
            'total_institution_admins': role_distribution.get(RoleChoices.INSTITUTION_ADMIN, 0),
            'total_super_admins': role_distribution.get(RoleChoices.SUPER_ADMIN, 0),
            'active_roles': active_roles,
            'expired_roles': expired_roles,
            'recent_assignments': recent_assignments,
            'role_distribution': role_distribution
        }
        
        # Cache for 1 hour
        cache.set(cache_key, stats, 3600)
        
        serializer = UserRoleStatsSerializer(stats)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_permissions(request, user_id):
    """Get all permissions for a user."""
    try:
        # Get all active roles for the user
        roles = UserRole.objects.filter(
            user_id=user_id,
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        )
        
        if not roles.exists():
            return Response(
                {'error': 'No active roles found for user'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Collect all permissions
        all_permissions = {}
        for role in roles:
            role_permissions = role.get_effective_permissions()
            all_permissions.update(role_permissions)
        
        # Get list of granted permissions
        effective_permissions = [perm for perm, granted in all_permissions.items() if granted]
        
        data = {
            'user_id': user_id,
            'roles': roles,
            'all_permissions': all_permissions,
            'effective_permissions': effective_permissions
        }
        
        serializer = UserPermissionsSerializer(data)
        return Response(serializer.data)
    
    except Exception as e:
        logger.error(f"Error getting user permissions: {e}")
        return Response(
            {'error': 'Failed to get user permissions'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def assign_role(request):
    """Assign a role to a user."""
    serializer = RoleAssignmentRequestSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            with transaction.atomic():
                # Check for existing role
                existing_role = UserRole.objects.filter(
                    user_id=serializer.validated_data['user_id'],
                    role=serializer.validated_data['role'],
                    institution_id=serializer.validated_data.get('institution_id'),
                    employer_id=serializer.validated_data.get('employer_id'),
                    is_active=True
                ).first()
                
                if existing_role:
                    return Response(
                        {'error': 'User already has this role assignment'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create role assignment
                role = UserRole.objects.create(
                    user_id=serializer.validated_data['user_id'],
                    role=serializer.validated_data['role'],
                    institution_id=serializer.validated_data.get('institution_id'),
                    employer_id=serializer.validated_data.get('employer_id'),
                    expires_at=serializer.validated_data.get('expires_at'),
                    permissions=serializer.validated_data.get('permissions', {}),
                    metadata=serializer.validated_data.get('metadata', {}),
                    assigned_by_user_id=request.user.id if hasattr(request.user, 'id') else None
                )
                
                # Create history record
                RoleAssignmentHistory.objects.create(
                    user_id=role.user_id,
                    role=role.role,
                    action='assigned',
                    institution_id=role.institution_id,
                    employer_id=role.employer_id,
                    performed_by_user_id=request.user.id if hasattr(request.user, 'id') else None,
                    reason=serializer.validated_data.get('reason', ''),
                    new_data={
                        'permissions': role.permissions,
                        'metadata': role.metadata,
                        'expires_at': role.expires_at.isoformat() if role.expires_at else None
                    }
                )
            
            role_serializer = UserRoleSerializer(role)
            return Response(role_serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Error assigning role: {e}")
            return Response(
                {'error': 'Failed to assign role'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def bulk_assign_roles(request):
    """Assign roles to multiple users."""
    serializer = BulkRoleAssignmentSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            created_roles = []
            errors = []
            
            with transaction.atomic():
                for user_id in serializer.validated_data['user_ids']:
                    try:
                        # Check for existing role
                        existing_role = UserRole.objects.filter(
                            user_id=user_id,
                            role=serializer.validated_data['role'],
                            institution_id=serializer.validated_data.get('institution_id'),
                            employer_id=serializer.validated_data.get('employer_id'),
                            is_active=True
                        ).first()
                        
                        if existing_role:
                            errors.append({
                                'user_id': user_id,
                                'error': 'User already has this role assignment'
                            })
                            continue
                        
                        # Create role assignment
                        role = UserRole.objects.create(
                            user_id=user_id,
                            role=serializer.validated_data['role'],
                            institution_id=serializer.validated_data.get('institution_id'),
                            employer_id=serializer.validated_data.get('employer_id'),
                            expires_at=serializer.validated_data.get('expires_at'),
                            permissions=serializer.validated_data.get('permissions', {}),
                            metadata=serializer.validated_data.get('metadata', {}),
                            assigned_by_user_id=request.user.id if hasattr(request.user, 'id') else None
                        )
                        
                        created_roles.append(role)
                        
                        # Create history record
                        RoleAssignmentHistory.objects.create(
                            user_id=role.user_id,
                            role=role.role,
                            action='assigned',
                            institution_id=role.institution_id,
                            employer_id=role.employer_id,
                            performed_by_user_id=request.user.id if hasattr(request.user, 'id') else None,
                            reason=f"Bulk assignment: {serializer.validated_data.get('reason', '')}",
                            new_data={
                                'permissions': role.permissions,
                                'metadata': role.metadata,
                                'expires_at': role.expires_at.isoformat() if role.expires_at else None
                            }
                        )
                    
                    except Exception as e:
                        errors.append({
                            'user_id': user_id,
                            'error': str(e)
                        })
            
            response_data = {
                'created_count': len(created_roles),
                'error_count': len(errors),
                'created_roles': UserRoleListSerializer(created_roles, many=True).data,
                'errors': errors
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Error in bulk role assignment: {e}")
            return Response(
                {'error': 'Failed to assign roles'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def revoke_role(request, role_id):
    """Revoke a user role."""
    try:
        role = get_object_or_404(UserRole, id=role_id)
        
        # Store old data for history
        old_data = {
            'permissions': role.permissions,
            'metadata': role.metadata,
            'is_active': role.is_active
        }
        
        # Deactivate the role
        role.is_active = False
        role.save()
        
        # Create history record
        RoleAssignmentHistory.objects.create(
            user_id=role.user_id,
            role=role.role,
            action='removed',
            institution_id=role.institution_id,
            employer_id=role.employer_id,
            performed_by_user_id=request.user.id if hasattr(request.user, 'id') else None,
            reason=request.data.get('reason', ''),
            previous_data=old_data
        )
        
        logger.info(f"Role {role.role} revoked from user {role.user_id}")
        
        return Response(
            {'message': 'Role revoked successfully'},
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        logger.error(f"Error revoking role: {e}")
        return Response(
            {'error': 'Failed to revoke role'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )