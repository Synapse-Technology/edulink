from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response

from edulink.apps.accounts.permissions import IsSystemAdmin, IsStudent, IsInstitutionAdmin
from .models import Institution, InstitutionSuggestion, InstitutionInterest, InstitutionRequest, InstitutionStaff, Department, Cohort
from .queries import (
    list_public_institutions, 
    list_open_suggestions, 
    list_reviewed_suggestions,
    list_pending_institution_requests,
    list_reviewed_institution_requests,
    get_institution_request_by_id,
    check_domain_conflicts,
    get_institution_for_user,
    list_institution_staff_profile_requests_for_institution,
)
from .policies import is_institution_staff
from .serializers import (
    InstitutionSerializer,
    AdminInstitutionCreateSerializer,
    InstitutionRequestSerializer,
    InstitutionRequestCreateSerializer,
    InstitutionRequestReviewSerializer,
    InstitutionVerifySerializer,
    InstitutionSuggestionSerializer,
    InstitutionSuggestionCreateSerializer,
    InstitutionInterestSerializer,
    InstitutionInterestCreateSerializer,
    InstitutionAdminSetupSerializer,
    InstitutionStaffSerializer,
    DepartmentSerializer,
    DepartmentCreateSerializer,
    DepartmentUpdateSerializer,
    CohortSerializer,
    CohortCreateSerializer,
    CohortUpdateSerializer,
    InstitutionStaffProfileRequestSerializer,
    InstitutionStaffProfileRequestCreateSerializer,
    InstitutionStaffProfileRequestActionSerializer,
    BulkVerificationConfirmSerializer,
)
from .services import (
    create_institution_by_admin,
    request_institution,
    verify_institution,
    suggest_institution,
    record_institution_interest,
    submit_institution_request,
    review_institution_request,
    complete_institution_admin_setup,
    update_institution_profile,
    create_department,
    update_department,
    delete_department,
    create_cohort,
    update_cohort,
    delete_cohort,
)
from .policies import (
    can_admin_manage_institution,
    can_representative_request_institution,
    can_review_institution_requests,
    can_submit_institution_request,
    can_view_institution_request,
    is_institution_staff,
)


class InstitutionLoginView(APIView):
    """
    Institution-specific login endpoint.
    Only allows Institution Admins and Supervisors to login.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Authenticate institution staff and return JWT tokens.
        """
        from edulink.apps.accounts.serializers import UserLoginSerializer, UserSerializer
        from edulink.apps.accounts.services import authenticate_user
        
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = authenticate_user(**serializer.validated_data)
            
            # Check if user is institution staff
            if not is_institution_staff(user):
                return Response(
                    {"detail": "Access denied. This login is for institution staff only."},
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


class InstitutionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "domain"]

    def get_permissions(self):
        action = getattr(self, "action", None)
        if action in ["create_by_admin", "verify"]:
            return [IsAuthenticated(), IsSystemAdmin()]
        if action == "request":
            return [IsAuthenticated()]
        if action in ["public_list", "record_interest"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        action = getattr(self, "action", None)
        if action in ["list", "retrieve"]:
            return list_public_institutions()
        return super().get_queryset()

    @action(detail=False, methods=["get", "patch"], permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def profile(self, request):
        institution = get_institution_for_user(str(request.user.id))
        if not institution:
            return Response({"detail": "No institution found for this user."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            serializer = self.get_serializer(institution)
            return Response(serializer.data)

        if request.method == "PATCH":
            serializer = self.get_serializer(institution, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            update_institution_profile(
                institution_id=institution.id,
                data=serializer.validated_data,
                actor_id=str(request.user.id)
            )
            
            institution.refresh_from_db()
            return Response(self.get_serializer(institution).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def trust_progress(self, request):
        """
        Get trust tier progress for the current institution.
        """
        from edulink.apps.trust.services import get_institution_trust_progress
        
        institution = get_institution_for_user(str(request.user.id))
        if not institution:
            return Response({"detail": "No institution found for this user."}, status=status.HTTP_404_NOT_FOUND)
            
        progress = get_institution_trust_progress(institution_id=institution.id)
        return Response(progress)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def students(self, request):
        """
        List all students affiliated with the current user's institution.
        """
        from edulink.apps.students.queries import get_institution_students_queryset, get_students_by_ids
        from edulink.apps.students.serializers import StudentInstitutionAffiliationSerializer
        
        institution = get_institution_for_user(str(request.user.id))
        if not institution:
            return Response({"detail": "No institution found for this user."}, status=status.HTTP_404_NOT_FOUND)
            
        affiliations = get_institution_students_queryset(
            institution_id=str(institution.id),
            department_id=request.query_params.get('department_id'),
            cohort_id=request.query_params.get('cohort_id')
        )
            
        # Batch fetch students to avoid N+1 in serializer
        student_ids = [str(a.student_id) for a in affiliations]
        students_map = get_students_by_ids(student_ids)
            
        serializer = StudentInstitutionAffiliationSerializer(
            affiliations, 
            many=True,
            context={'students_map': students_map}
        )
        return Response(serializer.data)

    @action(detail=False, methods=["patch"], permission_classes=[IsAuthenticated, IsInstitutionAdmin], url_path=r'students/(?P<student_id>[^/.]+)/update_affiliation')
    def update_affiliation(self, request, student_id=None):
        """
        Update a student's affiliation (department and cohort).
        """
        from edulink.apps.students.services import update_student_affiliation
        
        institution = get_institution_for_user(str(request.user.id))
        if not institution:
            return Response({"detail": "No institution found for this user."}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            update_student_affiliation(
                student_id=student_id,
                institution_id=str(institution.id),
                department_id=request.data.get('department_id'),
                cohort_id=request.data.get('cohort_id'),
                actor_id=str(request.user.id)
            )
            return Response({"status": "updated"})
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": "An unexpected error occurred"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"])
    def create_by_admin(self, request):
        if not can_admin_manage_institution(actor=request.user):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminInstitutionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        institution = create_institution_by_admin(
            name=serializer.validated_data["name"],
            domain=serializer.validated_data["domain"],
            admin_id=str(request.user.id),
        )

        return Response(InstitutionSerializer(institution).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def request(self, request):
        if not can_representative_request_institution(actor=request.user):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        serializer = InstitutionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        institution_request = request_institution(
            name=serializer.validated_data["name"],
            domain=serializer.validated_data["domain"],
            requested_by_user_id=str(request.user.id),
            proof=serializer.validated_data.get("proof"),
        )

        return Response(InstitutionRequestSerializer(institution_request).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        if not can_review_institution_requests(actor=request.user):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        serializer = InstitutionVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        institution = verify_institution(
            institution_id=pk,
            verification_method=serializer.validated_data["verification_method"],
            reviewer_id=str(request.user.id),
        )

        return Response(InstitutionSerializer(institution).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def public_list(self, request):
        """Public endpoint for registration - list institutions without authentication"""
        search_query = request.query_params.get('q', '').strip()
        queryset = list_public_institutions(search_query=search_query)
        
        serializer = InstitutionSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def record_interest(self, request):
        """Record student interest in an institution for analytics purposes"""
        serializer = InstitutionInterestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get student_id from request if available (for logged in users)
        student_id = str(request.user.id) if request.user.is_authenticated else None
        
        interest = record_institution_interest(
            student_id=student_id,
            raw_name=serializer.validated_data["raw_name"],
            email_domain=serializer.validated_data.get("email_domain"),
            user_email=serializer.validated_data.get("user_email"),
        )

        return Response(
            InstitutionInterestSerializer(interest).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def submit_request_step(self, request):
        """
        Submit a step of institution request using progressive disclosure.
        Allows anonymous users to submit institution requests in steps.
        """
        from .services import submit_institution_request_step
        
        step = request.data.get('step')
        step_data = request.data.get('step_data', {})
        session_id = request.data.get('session_id')
        
        if not step:
            return Response(
                {"error": "Step number is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            step = int(step)
        except ValueError:
            return Response(
                {"error": "Step must be a number between 1-4"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        result = submit_institution_request_step(
            step=step,
            step_data=step_data,
            session_id=session_id,
        )
        
        if result["success"]:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def complete_setup(self, request):
        """
        Complete setup wizard for institution administrators.
        This is the first screen new institution admins see after account creation.
        """
        serializer = InstitutionAdminSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            setup_result = complete_institution_admin_setup(
                admin_user_id=str(request.user.id),
                institution_name=serializer.validated_data["institution_name"],
                institution_website=serializer.validated_data["institution_website"],
                primary_domain=serializer.validated_data["primary_domain"],
                admin_title=serializer.validated_data["admin_title"],
                admin_phone=serializer.validated_data.get("admin_phone"),
                department=serializer.validated_data.get("department"),
                institution_size=serializer.validated_data["institution_size"],
                primary_use_case=serializer.validated_data["primary_use_case"],
            )
            
            return Response({
                "message": "Institution setup completed successfully",
                "setup_data": setup_result,
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": "An unexpected error occurred during setup"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class InstitutionSuggestionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InstitutionSuggestion.objects.all()
    serializer_class = InstitutionSuggestionSerializer

    def get_permissions(self):
        action = getattr(self, "action", None)
        if action in ["create"]:
            return [IsAuthenticated(), IsStudent()]
        if action in ["list", "retrieve", "review", "accept", "reject"]:
            return [IsAuthenticated(), IsSystemAdmin()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = InstitutionSuggestionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        suggestion = suggest_institution(
            name=serializer.validated_data["name"],
            domain=serializer.validated_data["domain"],
            student_id=str(request.user.id),
        )

        return Response(
            InstitutionSuggestionSerializer(suggestion).data,
            status=status.HTTP_201_CREATED,
        )

    def get_queryset(self):
        action = getattr(self, "action", None)
        if action == "list":
            return list_open_suggestions()
        if action in ["reviewed"]:
            return list_reviewed_suggestions()
        return super().get_queryset()

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        from .services import review_institution_suggestion
        suggestion = review_institution_suggestion(suggestion_id=pk, actor_id=str(request.user.id))
        return Response(
            InstitutionSuggestionSerializer(suggestion).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        from .services import accept_institution_suggestion
        suggestion = accept_institution_suggestion(suggestion_id=pk, actor_id=str(request.user.id))
        return Response(
            InstitutionSuggestionSerializer(suggestion).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        from .services import reject_institution_suggestion
        suggestion = reject_institution_suggestion(suggestion_id=pk, actor_id=str(request.user.id))
        return Response(
            InstitutionSuggestionSerializer(suggestion).data,
            status=status.HTTP_200_OK,
        )


class InstitutionRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for institution onboarding requests (Path B).
    """
    permission_classes = [IsSystemAdmin]
    serializer_class = InstitutionRequestSerializer

    def get_queryset(self):
        from .queries import get_institution_request_queryset
        status_filter = self.request.query_params.get("status", None)
        return get_institution_request_queryset(status_filter=status_filter)

    def get_permissions(self):
        action = getattr(self, "action", None)
        if action == "create":
            # Public endpoint - anyone can submit
            return []
        return super().get_permissions()

    def get_serializer_class(self):
        action = getattr(self, "action", None)
        if action == "create":
            return InstitutionRequestCreateSerializer
        elif action == "review":
            return InstitutionRequestReviewSerializer
        return self.serializer_class

    def create(self, request, *args, **kwargs):
        """Submit a new institution onboarding request."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check for domain conflicts
        conflicts = check_domain_conflicts(
            domains=serializer.validated_data["requested_domains"]
        )
        if conflicts:
            return Response(
                {
                    "error": "Some requested domains are already in use",
                    "conflicts": conflicts,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            institution_request = submit_institution_request(
                institution_name=serializer.validated_data["institution_name"],
                website_url=serializer.validated_data["website_url"],
                requested_domains=serializer.validated_data["requested_domains"],
                representative_name=serializer.validated_data["representative_name"],
                representative_email=serializer.validated_data["representative_email"],
                representative_role=serializer.validated_data["representative_role"],
                representative_phone=serializer.validated_data.get("representative_phone"),
                supporting_document=serializer.validated_data.get("supporting_document"),
                department=serializer.validated_data.get("department"),
                notes=serializer.validated_data.get("notes"),
            )
            return Response(
                InstitutionRequestSerializer(institution_request).data,
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        """Review an institution request (approve or reject)."""
        institution_request = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reviewed_request = review_institution_request(
                request_id=institution_request.id,
                action=serializer.validated_data["action"],
                reviewer_id=str(request.user.id),
                rejection_reason=serializer.validated_data.get("rejection_reason"),
            )
            return Response(
                InstitutionRequestSerializer(reviewed_request).data,
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["get"])
    def pending(self, request):
        """List all pending institution requests."""
        pending_requests = list_pending_institution_requests()
        serializer = self.get_serializer(pending_requests, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def reviewed(self, request):
        """List all reviewed institution requests."""
        reviewed_requests = list_reviewed_institution_requests()
        serializer = self.get_serializer(reviewed_requests, many=True)
        return Response(serializer.data)


class InstitutionInviteViewSet(viewsets.ViewSet):
    """
    ViewSet for handling institution invites and activation.
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"])
    def activate(self, request):
        """
        Activate institution admin account from invite.
        Phase 2 of canonical blueprint.
        """
        from .serializers import InstitutionAdminActivateSerializer
        from .services import activate_institution_admin_from_invite
        
        serializer = InstitutionAdminActivateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = activate_institution_admin_from_invite(
                invite_id=serializer.validated_data["invite_id"],
                token=serializer.validated_data["token"],
                password=serializer.validated_data["password"],
                first_name=serializer.validated_data["first_name"],
                last_name=serializer.validated_data["last_name"],
            )
            
            return Response({
                "message": "Account activated successfully. Please log in.",
                "email": user.email
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["post"])
    def activate_supervisor(self, request):
        """
        Activate institution supervisor account from invite.
        """
        from .serializers import InstitutionSupervisorActivateSerializer
        from .services import activate_institution_supervisor_from_invite
        
        serializer = InstitutionSupervisorActivateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = activate_institution_supervisor_from_invite(
                invite_id=serializer.validated_data["invite_id"],
                token=serializer.validated_data["token"],
                password=serializer.validated_data["password"],
                first_name=serializer.validated_data["first_name"],
                last_name=serializer.validated_data["last_name"],
                phone_number=serializer.validated_data.get("phone_number", ""),
            )
            
            return Response({
                "message": "Supervisor account activated successfully. Please log in.",
                "email": user.email
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["post"])
    def validate_token(self, request):
        """
        Validate invite token before showing activation form.
        """
        from .services import validate_institution_invite_token
        
        invite_id = request.data.get('invite_id')
        token = request.data.get('token')
        
        if not invite_id or not token:
             return Response({"error": "Missing invite_id or token"}, status=status.HTTP_400_BAD_REQUEST)
             
        try:
            invite = validate_institution_invite_token(invite_id, token)
            
            # Fetch associated InstitutionRequest to get representative details
            # We look for the most recent APPROVED request for this institution's email
            representative_name = ""
            
            # Try to find the original request
            # Logic: The invite email is the representative email in the request
            # And the request must be APPROVED
            original_request = InstitutionRequest.objects.filter(
                representative_email=invite.email,
                status=InstitutionRequest.STATUS_APPROVED
            ).order_by('-reviewed_at').first()
            
            if original_request:
                representative_name = original_request.representative_name
            
            return Response({
                "valid": True,
                "email": invite.email,
                "institution_name": invite.institution.name,
                "representative_name": representative_name,
                "website_url": invite.institution.website_url,
                "contact_phone": invite.institution.contact_phone
            })
        except Exception as e:
            return Response({"valid": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class InstitutionStaffViewSet(viewsets.ViewSet):
    """
    ViewSet for managing institution staff.
    """
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def list(self, request):
        """
        List all staff members for the current user's institution.
        """
        from .queries import get_institution_for_user
        
        inst = get_institution_for_user(str(request.user.id))
        if not inst:
            return Response({'error': 'Institution not found'}, status=status.HTTP_403_FORBIDDEN)
            
        staff = InstitutionStaff.objects.filter(institution=inst).select_related('user')
        serializer = InstitutionStaffSerializer(staff, many=True)
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        """
        Update personal details for a staff member in the current user's institution.
        """
        from .queries import get_institution_for_user
        from .serializers import InstitutionStaffPersonalDetailsUpdateSerializer
        from .services import update_institution_staff_personal_details

        inst = get_institution_for_user(str(request.user.id))
        if not inst:
            return Response({'error': 'Institution not found'}, status=status.HTTP_403_FORBIDDEN)

        try:
            staff = InstitutionStaff.objects.get(id=pk, institution=inst, is_active=True)
        except InstitutionStaff.DoesNotExist:
            return Response({'error': 'Staff member not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InstitutionStaffPersonalDetailsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_staff = update_institution_staff_personal_details(
                staff_id=str(staff.id),
                actor_id=str(request.user.id),
                **serializer.validated_data,
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        output = InstitutionStaffSerializer(updated_staff).data
        return Response(output, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="request_profile_update",
    )
    def request_profile_update(self, request):
        from .queries import get_institution_staff_profile
        from .services import submit_institution_staff_profile_request

        staff = get_institution_staff_profile(str(request.user.id))
        if not staff:
            return Response(
                {"error": "Staff profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = InstitutionStaffProfileRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            profile_request = submit_institution_staff_profile_request(
                staff_id=str(staff.id),
                actor_id=str(request.user.id),
                requested_changes=serializer.validated_data,
            )
        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        output = InstitutionStaffProfileRequestSerializer(profile_request).data
        return Response(output, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path="update-personal-details")
    def update_staff_details(self, request, pk=None):
        """
        Update staff member's personal details (first name, last name, email).
        Only accessible by Institution Admins.
        """
        from .services import update_institution_staff_details
        from .queries import get_institution_for_user
        
        inst = get_institution_for_user(str(request.user.id))
        if not inst:
             return Response({'error': 'Institution not found'}, status=status.HTTP_403_FORBIDDEN)
             
        try:
            update_institution_staff_details(
                staff_id=pk,
                institution_id=str(inst.id),
                actor_id=str(request.user.id),
                data=request.data
            )
            return Response({"status": "updated"})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "Failed to update staff details"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, pk=None):
        """
        Remove a staff member from the institution.
        """
        from .queries import get_institution_for_user
        from .services import remove_institution_staff
        
        inst = get_institution_for_user(str(request.user.id))
        if not inst:
            return Response({'error': 'Institution not found'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            staff = InstitutionStaff.objects.get(id=pk, institution=inst)
        except InstitutionStaff.DoesNotExist:
             return Response({'error': 'Staff member not found'}, status=status.HTTP_404_NOT_FOUND)

        if str(staff.user.id) == str(request.user.id):
             return Response({'error': 'You cannot remove yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            remove_institution_staff(staff_id=str(staff.id), actor_id=str(request.user.id))
        except ValueError as e:
             return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"])
    def invite_supervisor(self, request):
        """
        Invite a supervisor to the institution.
        """
        from .serializers import InstitutionSupervisorInviteSerializer
        from .services import create_institution_supervisor_invite
        from .queries import get_institution_for_user
        
        inst = get_institution_for_user(str(request.user.id))
        if not inst:
             return Response({'error': 'Institution not found'}, status=status.HTTP_403_FORBIDDEN)

        serializer = InstitutionSupervisorInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            invite = create_institution_supervisor_invite(
                institution_id=inst.id,
                admin_user_id=str(request.user.id),
                email=serializer.validated_data["email"],
                department_id=serializer.validated_data["department_id"],
                cohort_id=serializer.validated_data.get("cohort_id"),
            )
            
            return Response({
                "message": f"Invitation sent to {invite.email}",
                "invite_id": str(invite.id)
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": "Failed to send invitation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Get the current user's institution staff profile.
        """
        from .queries import get_institution_staff_profile
        
        staff = get_institution_staff_profile(str(request.user.id))
        if not staff:
             return Response({'error': 'Staff profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            "id": str(staff.id),
            "role": staff.role,
            "department": staff.department,
            "cohort": staff.cohort,
            "institution_id": str(staff.institution_id),
            "institution_name": staff.institution.name
        })


class InstitutionStaffProfileRequestViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def list(self, request):
        institution = get_institution_for_user(str(request.user.id))
        if not institution:
            return Response(
                {"error": "Institution not found"},
                status=status.HTTP_403_FORBIDDEN,
            )

        status_filter = request.query_params.get("status")
        requests_qs = list_institution_staff_profile_requests_for_institution(
            institution_id=str(institution.id),
            status=status_filter,
        )
        serializer = InstitutionStaffProfileRequestSerializer(requests_qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        from .services import review_institution_staff_profile_request

        serializer = InstitutionStaffProfileRequestActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            profile_request = review_institution_staff_profile_request(
                request_id=pk,
                action=serializer.validated_data["action"],
                reviewer_id=str(request.user.id),
                admin_feedback=serializer.validated_data.get("admin_feedback", ""),
            )
        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        output = InstitutionStaffProfileRequestSerializer(profile_request).data
        return Response(output)


class DepartmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        # Filter by the institution of the logged-in admin
        institution = get_institution_for_user(str(self.request.user.id))
        if not institution:
            return Department.objects.none()
        return Department.objects.filter(institution=institution, is_active=True)

    def create(self, request, *args, **kwargs):
        institution = get_institution_for_user(str(request.user.id))
        if not institution:
            return Response({"detail": "No institution found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = DepartmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            department = create_department(
                institution_id=institution.id,
                name=serializer.validated_data["name"],
                code=serializer.validated_data.get("code", ""),
                aliases=serializer.validated_data.get("aliases", []),
                actor_id=str(request.user.id),
            )
            return Response(DepartmentSerializer(department).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        department = self.get_object()
        serializer = DepartmentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_dept = update_department(
                department_id=department.id,
                name=serializer.validated_data.get("name"),
                code=serializer.validated_data.get("code"),
                aliases=serializer.validated_data.get("aliases"),
                is_active=serializer.validated_data.get("is_active"),
                actor_id=str(request.user.id),
            )
            return Response(DepartmentSerializer(updated_dept).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        department = self.get_object()
        try:
            delete_department(department_id=department.id, actor_id=str(request.user.id))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class InstitutionDepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public/Student-facing ViewSet for listing departments of a specific institution.
    """
    permission_classes = [AllowAny]
    serializer_class = DepartmentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "code", "aliases"]

    def get_queryset(self):
        institution_id = self.request.query_params.get('institution_id')
        if not institution_id:
             return Department.objects.none()
        
        return Department.objects.filter(institution_id=institution_id, is_active=True)


class CohortViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]
    serializer_class = CohortSerializer

    def get_queryset(self):
        institution = get_institution_for_user(str(self.request.user.id))
        if not institution:
            return Cohort.objects.none()
        return Cohort.objects.filter(department__institution=institution, is_active=True)

    def create(self, request, *args, **kwargs):
        serializer = CohortCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Verify department belongs to user's institution
        institution = get_institution_for_user(str(request.user.id))
        department_id = str(serializer.validated_data["department_id"])
        
        from .queries import check_department_ownership
        if not check_department_ownership(department_id, institution.id):
             return Response({"detail": "Invalid department."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cohort = create_cohort(
                department_id=department_id,
                name=serializer.validated_data["name"],
                start_year=serializer.validated_data["start_year"],
                end_year=serializer.validated_data.get("end_year"),
                intake_label=serializer.validated_data.get("intake_label", ""),
                actor_id=str(request.user.id),
            )
            return Response(CohortSerializer(cohort).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        cohort = self.get_object()
        serializer = CohortUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_cohort = update_cohort(
                cohort_id=cohort.id,
                name=serializer.validated_data.get("name"),
                start_year=serializer.validated_data.get("start_year"),
                end_year=serializer.validated_data.get("end_year"),
                intake_label=serializer.validated_data.get("intake_label"),
                is_active=serializer.validated_data.get("is_active"),
                actor_id=str(request.user.id),
            )
            return Response(CohortSerializer(updated_cohort).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        cohort = self.get_object()
        try:
            delete_cohort(cohort_id=cohort.id, actor_id=str(request.user.id))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
             return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)



class InstitutionStudentVerificationViewSet(viewsets.ViewSet):
    """
    ViewSet for handling student verifications by institution admins.
    Phase 3: Student Verification Queue & Bulk Verification.
    """
    permission_classes = [IsAuthenticated] # Should verify is_institution_admin in policy

    @action(detail=False, methods=['get'])
    def pending(self, request):
        from edulink.apps.students.queries import get_pending_affiliations_for_all_admin_institutions
        from edulink.apps.students.serializers import StudentInstitutionAffiliationSerializer
        
        # Security check handled by query (checks user role)
        pending = get_pending_affiliations_for_all_admin_institutions(request.user)
        
        # Apply filters
        trust_level = request.query_params.get('trust_level')
        if trust_level:
            pending = pending.filter(student__trust_level=trust_level)
            
        serializer = StudentInstitutionAffiliationSerializer(pending, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        from edulink.apps.students.services import verify_student_affiliation
        from edulink.apps.students.queries import get_student_institution_affiliation_by_id
        from .policies import can_verify_student_for_institution
        
        try:
            affiliation = get_student_institution_affiliation_by_id(pk)
            if not affiliation:
                return Response({'error': 'Affiliation not found'}, status=status.HTTP_404_NOT_FOUND)

            if not can_verify_student_for_institution(actor=request.user, institution_id=str(affiliation.institution_id)):
                 return Response({'error': 'Not authorized for this institution'}, status=status.HTTP_403_FORBIDDEN)

            department_id = request.data.get('department_id')
            cohort_id = request.data.get('cohort_id')

            verify_student_affiliation(
                affiliation_id=pk, 
                actor_id=str(request.user.id),
                department_id=department_id,
                cohort_id=cohort_id
            )
            return Response({'status': 'approved'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        from edulink.apps.students.services import reject_student_affiliation
        from edulink.apps.students.queries import get_student_institution_affiliation_by_id
        from .policies import can_verify_student_for_institution

        reason = request.data.get('reason', 'No reason provided')
        try:
            affiliation = get_student_institution_affiliation_by_id(pk)
            if not affiliation:
                return Response({'error': 'Affiliation not found'}, status=status.HTTP_404_NOT_FOUND)

            if not can_verify_student_for_institution(actor=request.user, institution_id=str(affiliation.institution_id)):
                 return Response({'error': 'Not authorized for this institution'}, status=status.HTTP_403_FORBIDDEN)

            reject_student_affiliation(affiliation_id=pk, reason=reason, actor_id=str(request.user.id))
            return Response({'status': 'rejected'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            
    @action(detail=False, methods=['post'], url_path='bulk-preview')
    def bulk_preview(self, request):
        from edulink.apps.institutions.services import process_bulk_verification_csv
        from .queries import get_institution_for_user
        
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        inst = get_institution_for_user(str(request.user.id))
        if not inst:
             return Response({'error': 'Institution not found'}, status=status.HTTP_403_FORBIDDEN)

        try:
            results = process_bulk_verification_csv(
                institution_id=str(inst.id),
                file=file
            )
            return Response(results)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='bulk-confirm')
    def bulk_confirm(self, request):
        from edulink.apps.institutions.services import process_bulk_verification_confirm
        from .queries import get_institution_for_user
        
        serializer = BulkVerificationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
            
        inst = get_institution_for_user(str(request.user.id))
        if not inst:
             return Response({'error': 'Institution not found'}, status=status.HTTP_403_FORBIDDEN)
             
        try:
            total_processed = process_bulk_verification_confirm(
                institution_id=str(inst.id),
                entries=serializer.validated_data['entries'],
                department_id=serializer.validated_data.get('department_id'),
                cohort_id=serializer.validated_data.get('cohort_id'),
                actor_id=str(request.user.id)
            )
                
            return Response({
                'message': f'Successfully processed {total_processed} students', 
                'count': total_processed
            })
        except Exception as e:
             return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PlacementMonitoringViewSet(viewsets.ViewSet):
    """
    ViewSet for Institution Placement Monitoring (Phase 2).
    """
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def list(self, request):
        from edulink.apps.internships.queries import get_active_placements_for_institution
        from edulink.apps.students.queries import get_students_by_ids
        from edulink.apps.employers.queries import get_employers_by_ids
        
        inst = get_institution_for_user(str(request.user.id))
        if not inst:
            return Response({"detail": "No institution found."}, status=status.HTTP_404_NOT_FOUND)
            
        placements = get_active_placements_for_institution(institution_id=str(inst.id))
        
        # Collect IDs for batch fetching
        student_ids = [str(p.student_id) for p in placements if p.student_id]
        employer_ids = [str(p.opportunity.employer_id) for p in placements if p.opportunity and p.opportunity.employer_id]
        
        students_map = get_students_by_ids(student_ids)
        employers_map = get_employers_by_ids(employer_ids)
        
        data = []
        for p in placements:
            student = students_map.get(str(p.student_id))
            employer = employers_map.get(str(p.opportunity.employer_id) if p.opportunity else None)
            
            data.append({
                "id": p.id,
                "title": p.opportunity.title if p.opportunity else "N/A",
                "department": p.opportunity.department if p.opportunity else "N/A",
                "status": p.status,
                "start_date": p.opportunity.start_date if p.opportunity else None,
                "end_date": p.opportunity.end_date if p.opportunity else None,
                "employer_id": p.opportunity.employer_id if p.opportunity else None,
                "employer_name": employer.name if employer else "Unknown Employer",
                "student_info": {
                    "id": str(student.id),
                    "name": student.user.get_full_name() if student.user else "Unknown Student",
                    "email": student.user.email if student.user else "N/A",
                    "trust_level": student.trust_level,
                } if student else None
            })
            
        return Response(data)

class InstitutionReportsViewSet(viewsets.ViewSet):
    """
    Analytics and Reports for Institutions (Phase 4).
    """
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    @action(detail=False, methods=['get'], url_path='placement-success')
    def placement_success(self, request):
        from edulink.apps.internships.queries import get_institution_placement_stats
        
        inst = get_institution_for_user(str(request.user.id))
        if not inst:
            return Response({"detail": "No institution found."}, status=status.HTTP_404_NOT_FOUND)
            
        stats = get_institution_placement_stats(str(inst.id))
        return Response(stats)

    @action(detail=False, methods=['get'], url_path='time-to-placement')
    def time_to_placement(self, request):
        from edulink.apps.internships.queries import get_time_to_placement_stats
        
        inst = get_institution_for_user(str(request.user.id))
        if not inst:
            return Response({"detail": "No institution found."}, status=status.HTTP_404_NOT_FOUND)
            
        stats = get_time_to_placement_stats(str(inst.id))
        return Response(stats)
        
    @action(detail=False, methods=['get'], url_path='export')
    def export_report(self, request):
        """
        Export placement data as CSV.
        """
        from edulink.apps.institutions.services import get_institution_placement_export_data
        import csv
        from django.http import HttpResponse
        
        inst = get_institution_for_user(str(request.user.id))
        if not inst:
            return Response({"detail": "No institution found."}, status=status.HTTP_404_NOT_FOUND)
            
        export_rows = get_institution_placement_export_data(institution_id=str(inst.id))
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="placement_report_{inst.id}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Student Name', 'Student Email', 'Employer', 'Role', 'Status', 'Start Date', 'End Date'])
        
        for row in export_rows:
            writer.writerow([
                row['student_name'],
                row['student_email'],
                row['employer_name'],
                row['role'],
                row['status'],
                row['start_date'],
                row['end_date']
            ])
            
        return response
