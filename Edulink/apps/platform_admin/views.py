"""
Admin app views - Orchestration only following APP_LAYER_RULE.md.
Views handle HTTP, call policies → services → serializers, return responses.
No business logic, no DB queries beyond lookups, no trust calculations.
"""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from django.core.exceptions import ValidationError

from .models import PlatformStaffProfile, AdminActionLog, StaffInvite
from edulink.apps.ledger.queries import get_recent_ledger_events
from edulink.apps.institutions.queries import get_institution_interest_statistics
from . import policies, services, queries, serializers

User = get_user_model()


class PlatformStaffPermission(IsAuthenticated):
    """Permission class for platform staff only."""
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return policies.is_platform_staff(actor=request.user)


class SuperAdminPermission(IsAuthenticated):
    """Permission class for super admins only."""
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return policies.can_create_staff_invites(actor=request.user)


class AdminDashboardView(APIView):
    """Admin dashboard with system overview."""
    permission_classes = [PlatformStaffPermission]
    
    def get(self, request):
        # Check policy
        if not policies.can_view_system_analytics(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get data using queries
        system_stats = queries.get_system_analytics()
        recent_ledger_events = get_recent_ledger_events(limit=10)
        staff_invite_analytics = queries.get_staff_invite_analytics()
        
        # Combine data in format expected by frontend
        dashboard_data = {
            'system_stats': system_stats,
            'recent_actions': recent_ledger_events,
            'staff_invite_analytics': staff_invite_analytics,
            'current_staff_role': policies.get_platform_staff_role(actor=request.user),
            'pending_institutions_count': system_stats.get('pending_institutions', 0),
            'recent_users': queries.get_recent_users_for_dashboard(limit=5),
        }
        
        serializer = serializers.AdminDashboardSerializer(dashboard_data)
        return Response(serializer.data)


class InstitutionInterestAnalyticsView(APIView):
    """View for platform admins to view institution interest data."""
    permission_classes = [PlatformStaffPermission]

    def get(self, request):
        if not policies.can_view_system_analytics(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        stats = get_institution_interest_statistics()
        serializer = serializers.InstitutionInterestStatsSerializer(stats)
        return Response(serializer.data)


class SendInstitutionInterestOutreachView(APIView):
    """View for platform admins to send automated outreach emails."""
    permission_classes = [PlatformStaffPermission]

    def post(self, request):
        if not policies.can_view_system_analytics(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        interest_id = request.data.get('interest_id')
        if not interest_id:
            return Response({"error": "interest_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            success = services.send_institution_interest_outreach(
                interest_id=interest_id,
                actor=request.user
            )
            
            if success:
                return Response({"message": "Outreach email sent successfully"})
            else:
                return Response({"error": "Failed to send outreach email"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminUserPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'pageSize'
    max_page_size = 100

class UserListView(APIView):
    """List users that can be managed by platform staff."""
    permission_classes = [PlatformStaffPermission]
    
    def get(self, request):
        # Check policy
        if not policies.can_manage_users(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get filtering params
        search = request.query_params.get('search')
        role = request.query_params.get('role')
        status_param = request.query_params.get('status')
        
        # Get users using queries
        users = queries.get_users_managed_by_staff(
            request.user,
            search=search,
            role=role,
            status=status_param
        )
        
        # Paginate
        paginator = AdminUserPagination()
        paginated_users = paginator.paginate_queryset(users, request)
        
        # Serialize
        serializer = serializers.AdminUserSerializer(paginated_users, many=True)
        return paginator.get_paginated_response(serializer.data)


class UserDetailView(APIView):
    """Get user details."""
    permission_classes = [PlatformStaffPermission]
    
    def get(self, request, user_id):
        # Check policy
        if not policies.can_manage_users(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get user (basic lookup)
        user = get_object_or_404(User, pk=user_id)
        
        # Cannot view other platform staff details
        if policies.is_platform_staff(actor=user):
            return Response(
                {"error": "Cannot view platform staff details"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Serialize
        serializer = serializers.AdminUserSerializer(user)
        return Response(serializer.data)


class SuspendUserView(APIView):
    """Suspend a user account."""
    permission_classes = [PlatformStaffPermission]
    
    def post(self, request, user_id):
        # Check policy
        target_user = get_object_or_404(User, pk=user_id)
        if not policies.can_suspend_user(actor=request.user, target_user=target_user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate input
        serializer = serializers.UserSuspensionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Execute service
        try:
            services.suspend_user(
                user_id=user_id,
                reason=serializer.validated_data.get('reason', ''),
                suspended_by=request.user
            )
            return Response({"message": "User suspended successfully"})
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ReactivateUserView(APIView):
    """Reactivate a suspended user account."""
    permission_classes = [PlatformStaffPermission]
    
    def post(self, request, user_id):
        # Check policy
        if not policies.can_reactivate_user(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate input
        serializer = serializers.UserSuspensionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Execute service
        try:
            services.reactivate_user(
                user_id=user_id,
                reason=serializer.validated_data.get('reason', ''),
                reactivated_by=request.user
            )
            return Response({"message": "User reactivated successfully"})
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AssignUserRoleView(APIView):
    """Assign a role to a user."""
    permission_classes = [PlatformStaffPermission]
    
    def post(self, request, user_id):
        # Check policy
        target_user = get_object_or_404(User, pk=user_id)
        if not policies.can_change_user_roles(actor=request.user, target_user=target_user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate input
        serializer = serializers.UserRoleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Execute service
        try:
            services.assign_user_role(
                user_id=user_id,
                role=serializer.validated_data['role'],
                reason=serializer.validated_data.get('reason', ''),
                assigned_by=request.user
            )
            return Response({"message": "User role updated successfully"})
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class BulkUserActionView(APIView):
    """Perform bulk actions on multiple users."""
    permission_classes = [PlatformStaffPermission]
    
    def post(self, request):
        # Check policy
        if not policies.can_manage_users(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate input
        serializer = serializers.BulkActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Execute service
        try:
            result = services.bulk_user_action(
                user_ids=serializer.validated_data['user_ids'],
                action=serializer.validated_data['action'],
                role=serializer.validated_data.get('role'),
                reason=serializer.validated_data.get('reason', ''),
                performed_by=request.user
            )
            return Response(result)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class InstitutionListView(APIView):
    """List institutions for management."""
    permission_classes = [PlatformStaffPermission]
    
    def get(self, request):
        # Check policy
        if not policies.can_manage_institutions(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get institutions using queries (following architecture rules)
        institutions = queries.get_institutions_for_staff_review()
        
        # Serialize
        serializer = serializers.InstitutionAdminSerializer(institutions, many=True)
        return Response(serializer.data)


class InstitutionDetailView(APIView):
    """Get institution details."""
    permission_classes = [PlatformStaffPermission]
    
    def get(self, request, institution_id):
        # Check policy
        if not policies.can_manage_institutions(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get institution using service layer (following architecture rules)
        from edulink.apps.institutions import services as institution_services
        try:
            institution = institution_services.get_institution_by_id(institution_id=institution_id)
        except Exception as e:
            return Response(
                {"error": "Institution not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Serialize
        serializer = serializers.InstitutionAdminSerializer(institution)
        return Response(serializer.data)


class VerifyInstitutionView(APIView):
    """Verify an institution."""
    permission_classes = [PlatformStaffPermission]
    
    def post(self, request, institution_id):
        # Check policy
        if not policies.can_manage_institutions(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate input
        serializer = serializers.InstitutionVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Execute service
        try:
            services.verify_institution(
                institution_id=institution_id,
                verified_by=request.user
            )
            return Response({"message": "Institution verified successfully"})
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ReviewInstitutionRequestView(APIView):
    """Review an institution onboarding request."""
    permission_classes = [PlatformStaffPermission]
    
    def post(self, request, request_id):
        # Check policy
        if not policies.can_manage_institutions(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate input
        serializer = serializers.ReviewInstitutionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Execute service through institutions app
        from edulink.apps.institutions import services as institution_services
        try:
            institution_request = institution_services.review_institution_request(
                request_id=request_id,
                action=serializer.validated_data['action'],
                reviewer_id=str(request.user.id),
                rejection_reason_code=serializer.validated_data.get('rejection_reason_code'),
                rejection_reason=serializer.validated_data.get('rejection_reason')
            )
            
            return Response({
                "message": f"Institution request {serializer.validated_data['action']}d successfully",
                "request_id": str(institution_request.id),
                "status": institution_request.status
            })
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


def _institution_request_to_dict(institution_request):
    """Convert InstitutionRequest model instance to dictionary for serialization."""
    return {
        'id': institution_request.id,
        'institution_name': institution_request.institution_name,
        'website_url': institution_request.website_url,
        'requested_domains': institution_request.requested_domains,
        'representative_name': institution_request.representative_name,
        'representative_email': institution_request.representative_email,
        'representative_role': institution_request.representative_role,
        'representative_phone': institution_request.representative_phone,
        'department': institution_request.department,
        'notes': institution_request.notes,
        'status': institution_request.status,
        'tracking_code': institution_request.tracking_code,
        'created_at': institution_request.created_at,
        'reviewed_at': institution_request.reviewed_at,
        'rejection_reason': institution_request.rejection_reason,
        'rejection_reason_code': institution_request.rejection_reason_code,
        'supporting_document': institution_request.supporting_document,
    }


class PendingInstitutionsView(APIView):
    """List institution requests pending review."""
    permission_classes = [PlatformStaffPermission]
    
    def get(self, request):
        # Check policy
        if not policies.can_manage_institutions(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get pending institution requests using queries
        pending_requests = queries.get_pending_institution_requests()
        
        # Convert to dictionaries for serialization
        request_dicts = [_institution_request_to_dict(req) for req in pending_requests]
        
        # Serialize using institution request serializer
        serializer = serializers.InstitutionRequestAdminSerializer(request_dicts, many=True)
        return Response(serializer.data)


class DashboardStatsView(APIView):
    """Get dashboard statistics for admin dashboard."""
    permission_classes = [PlatformStaffPermission]
    
    def get(self, request):
        # Check policy
        if not policies.can_view_system_analytics(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get system analytics using queries
        stats = queries.get_system_analytics()
        
        # Get pending invites count (not accepted and not expired)
        pending_invites = queries.get_pending_invites_count()
        
        # Get system health (simplified version)
        health_data = {
            'status': 'healthy',
            'message': 'All systems operational',
            'lastCheck': timezone.now().isoformat()
        }
        
        # Combine data in format expected by frontend
        dashboard_data = {
            'system_stats': stats,
            'pendingInvites': pending_invites,
            'systemHealth': health_data,
            'recentActions': []  # TODO: Implement recent actions if needed
        }
        
        return Response(dashboard_data)


class SystemStatsView(APIView):
    """Get system-wide statistics."""
    permission_classes = [PlatformStaffPermission]
    
    def get(self, request):
        # Check policy
        if not policies.can_view_system_analytics(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get system analytics using queries
        stats = queries.get_system_analytics()
        
        # Serialize
        serializer = serializers.SystemStatsSerializer(stats)
        return Response(serializer.data)


class SystemHealthView(APIView):
    """Get system health status."""
    permission_classes = [PlatformStaffPermission]
    
    def get(self, request):
        # Check policy
        if not policies.can_view_system_analytics(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get system health using queries
        health_data = queries.get_system_health_status()
        
        # Serialize
        serializer = serializers.SystemHealthSerializer(health_data)
        return Response(serializer.data)


class SystemActivityView(APIView):
    """Get recent system activity logs from the ledger."""
    permission_classes = [PlatformStaffPermission]
    
    def get(self, request):
        # Check policy
        if not policies.can_view_system_analytics(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get activity logs using queries
        activity = queries.get_system_activity_logs()
        
        # Serialize
        serializer = serializers.RecentActivitySerializer(activity, many=True)
        return Response(serializer.data)


class PlatformStaffListView(APIView):
    """Get list of all platform staff with filtering options."""
    permission_classes = [PlatformStaffPermission]
    
    def get(self, request):
        if not policies.can_view_staff_list(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        role = request.query_params.get('role')
        status_param = request.query_params.get('status')
        search = request.query_params.get('search')
        
        staff_list = queries.get_platform_staff_list(
            role=role,
            status=status_param,
            search=search
        )
        serializer = serializers.PlatformStaffListSerializer(staff_list, many=True)
        return Response(serializer.data)


class StaffInviteListView(APIView):
    """Get list of all staff invites and create new ones."""
    permission_classes = [PlatformStaffPermission]
    
    def get(self, request):
        # Only those who can create invites (Super Admins) should see invites?
        # Or maybe all staff can see pending invites?
        # Let's restrict to Super Admins for now as invites are sensitive.
        if not policies.can_create_staff_invites(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        invites = queries.get_all_staff_invites()
        serializer = serializers.StaffInviteListSerializer(invites, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create a new staff invite."""
        if not policies.can_create_staff_invites(actor=request.user):
            return Response(
                {"error": "Access denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = serializers.StaffInviteCreateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                invite = services.create_staff_invite(
                    email=serializer.validated_data['email'],
                    role=serializer.validated_data['role'],
                    created_by=request.user,
                    note=serializer.validated_data.get('message', '')
                )
                return Response({
                    "message": "Invite created successfully",
                    "id": invite.id
                }, status=status.HTTP_201_CREATED)
            except ValidationError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminLoginView(APIView):
    """Admin-specific login endpoint for platform staff."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Authenticate platform staff and return JWT tokens.
        Only users with PlatformStaffProfile can login through this endpoint.
        """
        from edulink.apps.accounts.serializers import UserLoginSerializer
        from edulink.apps.accounts.services import authenticate_user
        
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Authenticate the user
            user = authenticate_user(**serializer.validated_data)
            
            # Check if user is platform staff (has PlatformStaffProfile)
            if not policies.is_platform_staff(actor=user):
                return Response(
                    {"error": "Access denied. This login is for platform staff only."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Get user data with platform staff role
            user_data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'platform_staff_role': policies.get_platform_staff_role(actor=user),
                'is_platform_staff': True
            }
            
            return Response({
                'message': 'Admin login successful',
                'user': user_data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token)
                }
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)


class AdminTokenRefreshView(APIView):
    """Admin-specific token refresh endpoint."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Refresh JWT token for authenticated platform staff.
        """
        from edulink.apps.accounts.serializers import TokenRefreshSerializer
        from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
        
        # Validate refresh token and get user
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({"refresh": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            user_id = token['user_id']
            user = User.objects.get(id=user_id)
            
            # Check if user is still platform staff
            if not policies.is_platform_staff(actor=user):
                return Response(
                    {"error": "Access denied. User is no longer platform staff."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            # Use the standard token refresh logic
            refresh_serializer = TokenRefreshSerializer(data=request.data)
            refresh_serializer.is_valid(raise_exception=True)
            
            response_data = {
                'access': refresh_serializer.validated_data['access'],
                'message': 'Token refreshed successfully'
            }
            
            if 'refresh' in refresh_serializer.validated_data:
                response_data['refresh'] = refresh_serializer.validated_data['refresh']
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except (TokenError, InvalidToken):
            return Response({"error": "Invalid or expired refresh token"}, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)


class AcceptStaffInviteView(APIView):
    """View for accepting staff invites."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = serializers.AcceptStaffInviteSerializer(data=request.data)
        if serializer.is_valid():
            try:
                profile = services.accept_staff_invite(
                    token=serializer.validated_data['token'],
                    password=serializer.validated_data['password'],
                    first_name=serializer.validated_data.get('first_name', ''),
                    last_name=serializer.validated_data.get('last_name', '')
                )
                return Response({
                    "message": "Invite accepted successfully. You can now login.",
                    "email": profile.user.email
                }, status=status.HTTP_200_OK)
            except ValidationError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)