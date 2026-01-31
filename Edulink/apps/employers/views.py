from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend

from .models import EmployerRequest, Employer, Supervisor
from .serializers import (
    EmployerRequestSerializer, 
    EmployerRequestReviewSerializer,
    EmployerInviteValidationSerializer,
    EmployerInviteActivationSerializer,
    EmployerSerializer,
    SupervisorSerializer,
    EmployerSupervisorInviteSerializer
)
from .services import (
    submit_employer_request, 
    review_employer_request,
    validate_employer_invite_token,
    update_employer_profile,
    invite_supervisor,
    activate_supervisor_invite,
    remove_supervisor
)
from .policies import (
    can_submit_employer_request, 
    can_review_employer_requests,
    can_manage_employer,
    is_employer_staff
)

class EmployerLoginView(APIView):
    """
    Employer-specific login endpoint.
    Only allows Employer Admins and Supervisors to login.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from edulink.apps.accounts.serializers import UserLoginSerializer, UserSerializer
        from edulink.apps.accounts.services import authenticate_user
        
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = authenticate_user(**serializer.validated_data)
            
            # Check if user is employer staff
            if not is_employer_staff(user):
                return Response(
                    {"detail": "Access denied. This login is for employer staff only."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'message': 'Login successful',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token)
                }
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)


class EmployerRequestViewSet(viewsets.ModelViewSet):
    queryset = EmployerRequest.objects.all()
    serializer_class = EmployerRequestSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['tracking_code', 'name', 'official_email', 'domain']
    
    def get_permissions(self):
        if self.action in ["create", "track"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset
        
    def create(self, request, *args, **kwargs):
        if not can_submit_employer_request(request.user if request.user.is_authenticated else None):
             return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
             
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        employer_request = submit_employer_request(
            name=serializer.validated_data["name"],
            official_email=serializer.validated_data["official_email"],
            domain=serializer.validated_data["domain"],
            organization_type=serializer.validated_data["organization_type"],
            contact_person=serializer.validated_data["contact_person"],
            phone_number=serializer.validated_data.get("phone_number", ""),
            website_url=serializer.validated_data.get("website_url", ""),
            registration_number=serializer.validated_data.get("registration_number", "")
        )
        
        return Response(EmployerRequestSerializer(employer_request).data, status=status.HTTP_201_CREATED)
        
    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        if not can_review_employer_requests(request.user):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = EmployerRequestReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            employer_request = review_employer_request(
                request_id=pk,
                action=serializer.validated_data["action"],
                reviewer_id=str(request.user.id),
                rejection_reason_code=serializer.validated_data.get("rejection_reason_code", ""),
                rejection_reason=serializer.validated_data.get("rejection_reason", "")
            )
            return Response(EmployerRequestSerializer(employer_request).data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def track(self, request):
        code = request.query_params.get('code')
        if not code:
            return Response({"detail": "Tracking code required."}, status=status.HTTP_400_BAD_REQUEST)
            
        from .queries import get_employer_request_by_tracking_code
        employer_request = get_employer_request_by_tracking_code(code)
        if not employer_request:
            return Response({"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND)
            
        return Response({
            "tracking_code": employer_request.tracking_code,
            "status": employer_request.status,
            "name": employer_request.name,
            "submitted_at": employer_request.created_at,
            "rejection_reason": employer_request.rejection_reason if employer_request.status == "REJECTED" else None
        })

class EmployerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'official_email', 'domain', 'contact_person']
    filterset_fields = ['is_featured', 'status', 'trust_level']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        # TODO: Enforce strict permissions via policies
        # For now, allow viewing all employers if authenticated (simplification)
        # Ideally, only admins or system staff should see full list
        return super().get_queryset()

    def update(self, request, pk=None):
        employer = self.get_object()
        
        if not can_manage_employer(request.user, employer):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = self.get_serializer(employer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        updated_employer = update_employer_profile(
            employer_id=employer.id,
            actor=request.user,
            data=serializer.validated_data
        )
        
        return Response(self.get_serializer(updated_employer).data)

    @action(detail=False, methods=['get'])
    def me(self, request):
        from .queries import get_employer_for_user
        employer = get_employer_for_user(request.user.id)
        if employer:
            return Response(self.get_serializer(employer).data)
        return Response({"detail": "No employer found for this user."}, status=status.HTTP_404_NOT_FOUND)

class EmployerSupervisorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SupervisorSerializer
    
    def get_queryset(self):
        from .queries import get_employer_for_user
        employer = get_employer_for_user(self.request.user.id)
        if not employer:
             return Supervisor.objects.none()
             
        from .queries import list_active_supervisors_for_employer
        return list_active_supervisors_for_employer(employer.id)
    
    @action(detail=False, methods=['post'])
    def invite(self, request):
        from .queries import get_employer_for_user
        
        employer = get_employer_for_user(request.user.id)
        if not employer:
            return Response({"detail": "No employer found for this user."}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = EmployerSupervisorInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            invite = invite_supervisor(
                employer_id=employer.id,
                email=serializer.validated_data['email'],
                role=serializer.validated_data['role'],
                actor_id=str(request.user.id)
            )
            from .serializers import EmployerInviteSerializer
            return Response(EmployerInviteSerializer(invite).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        try:
            remove_supervisor(supervisor_id=kwargs['pk'], actor_id=str(request.user.id))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='profile-update-request')
    def profile_update_request(self, request):
        """
        Submit a profile update request for the current supervisor.
        """
        from .serializers import EmployerStaffProfileRequestCreateSerializer, EmployerStaffProfileRequestSerializer
        from .services import submit_employer_staff_profile_request
        from .queries import get_employer_for_user
        
        employer = get_employer_for_user(request.user.id)
        if not employer:
             return Response({"detail": "No employer found for this user."}, status=status.HTTP_404_NOT_FOUND)
             
        try:
            from .queries import get_employer_supervisor_by_user
            supervisor = get_employer_supervisor_by_user(user_id=request.user.id, employer_id=employer.id)
            if not supervisor:
                return Response({"detail": "Supervisor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
             return Response({"detail": "Supervisor profile not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = EmployerStaffProfileRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            profile_request = submit_employer_staff_profile_request(
                staff_id=supervisor.id,
                actor_id=str(request.user.id),
                requested_changes=serializer.validated_data
            )
            return Response(EmployerStaffProfileRequestSerializer(profile_request).data, status=status.HTTP_201_CREATED)
        except (ValueError, PermissionError) as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EmployerStaffProfileRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for employer admins to list and manage profile update requests.
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        from .queries import list_employer_staff_profile_requests_for_employer, get_employer_for_user
        from .models import EmployerStaffProfileRequest
        
        employer = get_employer_for_user(self.request.user.id)
        if not employer:
            return EmployerStaffProfileRequest.objects.none()
            
        if not can_manage_employer(self.request.user, employer):
             return EmployerStaffProfileRequest.objects.none()
             
        status_param = self.request.query_params.get('status')
        return list_employer_staff_profile_requests_for_employer(employer.id, status=status_param)

    def get_serializer_class(self):
        from .serializers import EmployerStaffProfileRequestSerializer
        return EmployerStaffProfileRequestSerializer

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        from .serializers import EmployerStaffProfileRequestActionSerializer, EmployerStaffProfileRequestSerializer
        from .services import approve_employer_staff_profile_request, reject_employer_staff_profile_request
        from .queries import get_employer_for_user
        
        employer = get_employer_for_user(request.user.id)
        if not employer:
             return Response({"detail": "No employer found."}, status=status.HTTP_404_NOT_FOUND)
             
        if not can_manage_employer(request.user, employer):
             return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = EmployerStaffProfileRequestActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        admin_feedback = serializer.validated_data.get('admin_feedback', '')
        
        try:
            if action == 'approve':
                result = approve_employer_staff_profile_request(
                    request_id=pk,
                    reviewer_id=str(request.user.id),
                    admin_feedback=admin_feedback
                )
            else:
                result = reject_employer_staff_profile_request(
                    request_id=pk,
                    reviewer_id=str(request.user.id),
                    admin_feedback=admin_feedback
                )
            return Response(EmployerStaffProfileRequestSerializer(result).data)
        except (ValueError, PermissionError) as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class EmployerInviteViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"])
    def validate_token(self, request):
        serializer = EmployerInviteValidationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            invite = validate_employer_invite_token(
                invite_id=serializer.validated_data["invite_id"],
                token=serializer.validated_data["token"]
            )
            return Response({
                "valid": True,
                "email": invite.email,
                "employer_name": invite.employer.name,
                "contact_person": invite.employer.contact_person,
                "phone_number": invite.employer.phone_number,
                "role": invite.role
            })
        except ValueError as e:
            return Response({"valid": False, "detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def activate(self, request):
        serializer = EmployerInviteActivationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = activate_supervisor_invite(
                invite_id=str(serializer.validated_data["invite_id"]),
                token=serializer.validated_data["token"],
                password=serializer.validated_data["password"],
                first_name=serializer.validated_data["first_name"],
                last_name=serializer.validated_data["last_name"],
                phone_number=serializer.validated_data.get("phone_number", "")
            )
            return Response({"message": "Account activated successfully.", "email": user.email})
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
