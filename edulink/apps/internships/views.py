from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import UserRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from edulink.apps.shared.pagination import StandardResultsSetPagination, LargeResultsSetPagination
from edulink.apps.shared.error_handling import AuthorizationError
from .permissions import (
    CanViewApplication, CanSubmitApplication, CanWithdrawApplication,
    CanSubmitEvidence, CanReviewEvidence, CanReportIncident, CanViewIncident
)
import logging

from .models import (
    InternshipOpportunity,
    InternshipApplication,
    InternshipEvidence,
    Incident,
    SupervisorAssignment,
    OpportunityStatus,
    ApplicationStatus,
    ExternalPlacementDeclaration,
)
from .serializers import (
    InternshipOpportunitySerializer, InternshipApplicationSerializer, CreateInternshipSerializer, InternshipActionSerializer,
    SubmitEvidenceSerializer, ReviewEvidenceSerializer, IncidentSerializer, 
    CreateIncidentSerializer, ResolveIncidentSerializer, AssignSupervisorSerializer,
    BulkAssignSupervisorSerializer,
    InternshipEvidenceSerializer, SuccessStorySerializer,
    SubmitFinalFeedbackSerializer, InternshipApplySerializer, CreateSuccessStorySerializer,
    BulkExtendDeadlineSerializer, DeadlineAnalyticsSerializer,
    SupervisorAssignmentSerializer, AcceptSupervisorAssignmentSerializer, RejectSupervisorAssignmentSerializer,
    ExternalPlacementDeclarationSerializer, ExternalPlacementDeclarationCreateSerializer,
    ExternalPlacementDeclarationReviewSerializer
)
from .filters import InternshipOpportunityFilter, InternshipApplicationFilter
from .services import (
    create_internship_opportunity, publish_internship, apply_for_internship,
    process_application, accept_offer, start_internship, complete_internship,
    certify_internship, submit_evidence, review_evidence, create_incident, resolve_incident, assign_supervisors,
    bulk_assign_institution_supervisors,
    create_success_story, submit_final_feedback, bulk_extend_opportunity_deadlines, get_deadline_analytics,
    withdraw_application, create_supervisor_assignment, accept_supervisor_assignment, reject_supervisor_assignment,
    declare_external_placement, approve_external_placement_declaration,
    request_external_placement_changes, reject_external_placement_declaration
)
from .queries import (
    get_opportunities_for_user, get_applications_for_user, 
    get_opportunity_by_id, get_application_by_id,
    get_external_placement_declarations_for_user
)

logger = logging.getLogger(__name__)


class ApplicationRateThrottle(UserRateThrottle):
    """Rate limiting for internship applications: 10 per hour per user."""
    scope = 'application_submissions'
    THROTTLE_RATES = {'application_submissions': '10/hour'}





class InternshipViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Internship Opportunities (Job Board).
    """
    serializer_class = InternshipOpportunitySerializer
    pagination_class = StandardResultsSetPagination  # Add pagination
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['title', 'description', 'department', 'location']
    filterset_class = InternshipOpportunityFilter
    
    def get_permissions(self):
        action = getattr(self, 'action', None)
        if action in ['list', 'retrieve', 'success_stories']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        return get_opportunities_for_user(self.request.user)

    @action(detail=False, methods=['post'])
    def create_opportunity(self, request):
        serializer = CreateInternshipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Policy Check: View level orchestration
        from .policies import can_create_internship
        if not can_create_internship(
            request.user, 
            institution_id=serializer.validated_data.get('institution_id'),
            employer_id=serializer.validated_data.get('employer_id')
        ):
            return Response({"detail": "Not authorized to create internship"}, status=status.HTTP_403_FORBIDDEN)

        try:
            data = serializer.validated_data.copy()
            data.pop('supervisor_ids', None) # Not yet supported in model
            
            internship = create_internship_opportunity(
                actor=request.user,
                **data
            )
            return Response(InternshipOpportunitySerializer(internship).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        opportunity = self.get_object()
        
        # Policy Check
        from .policies import can_transition_opportunity
        if not can_transition_opportunity(request.user, opportunity, OpportunityStatus.OPEN):
            return Response({"detail": "Not authorized to publish this opportunity"}, status=status.HTTP_403_FORBIDDEN)

        try:
            internship = publish_internship(request.user, pk)
            return Response(InternshipOpportunitySerializer(internship).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @throttle_classes([ApplicationRateThrottle])
    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        serializer = InternshipApplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            application = apply_for_internship(
                request.user, 
                pk, 
                serializer.validated_data['cover_letter']
            )
            return Response(InternshipApplicationSerializer(application).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='success-stories')
    def success_stories(self, request):
        """
        List all published success stories.
        """
        from .queries import get_published_success_stories
        stories = get_published_success_stories()
        serializer = SuccessStorySerializer(stories, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='pending-evidence')
    def pending_evidence(self, request):
        """
        List all pending evidence for the current user (Supervisor or Admin).
        """
        from .queries import get_pending_evidence_for_user
        evidence = get_pending_evidence_for_user(request.user)
        serializer = InternshipEvidenceSerializer(evidence, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='incidents')
    def incidents(self, request):
        """
        List all incidents for the current user (supervisor or student).
        """
        if request.user.is_student:
            from .queries import get_incidents_for_student
            incidents = get_incidents_for_student(request.user)
        else:
            from .queries import get_incidents_for_supervisor
            incidents = get_incidents_for_supervisor(request.user)
            
        serializer = IncidentSerializer(incidents, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='bulk-extend-deadline')
    def bulk_extend_deadline(self, request):
        """
        Bulk extend application deadlines for multiple opportunities.
        
        Only employers can extend deadlines for their own opportunities.
        Accepts list of opportunity IDs and new deadline date.
        """
        serializer = BulkExtendDeadlineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Policy Check: Only employer admins can extend deadlines
        if not request.user.is_employer_admin:
            return Response(
                {"detail": "Only employer administrators can extend opportunity deadlines"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            result = bulk_extend_opportunity_deadlines(
                actor=request.user,
                opportunity_ids=serializer.validated_data['opportunity_ids'],
                new_deadline=serializer.validated_data['new_deadline'],
                reason=serializer.validated_data.get('reason', '')
            )
            
            # Return summary of results
            response_data = {
                "message": f"Successfully extended {result['success_count']} opportunity/ies deadline",
                "success_count": result['success_count'],
                "failed_count": result['failed_count'],
                "total_processed": result['total_processed'],
            }
            
            if result['errors']:
                response_data['errors'] = result['errors']
            
            status_code = status.HTTP_200_OK if result['success_count'] > 0 else status.HTTP_400_BAD_REQUEST
            return Response(response_data, status=status_code)
            
        except PermissionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='deadline-analytics')
    def deadline_analytics(self, request):
        """
        Get comprehensive analytics on deadline performance for the current employer.
        
        Only employer admins can view their organization's analytics.
        Provides metrics on opportunity posting, applications, conversions, and deadlines.
        """
        # Policy Check: Only employer admins can view analytics
        if not request.user.is_employer_admin:
            return Response(
                {"detail": "Only employer administrators can view analytics"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get employer ID from user's employer profile
            from edulink.apps.employers.queries import get_employer_by_user
            employer = get_employer_by_user(request.user)
            
            if not employer:
                return Response(
                    {"detail": "Could not determine employer for current user"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Calculate analytics
            analytics_data = get_deadline_analytics(employer.id)
            
            # Serialize and return
            serializer = DeadlineAnalyticsSerializer(analytics_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Failed to generate analytics: {e}")
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Internship Applications (Engagements).
    Enforces object-level authorization: students can only access their own applications.
    """
    serializer_class = InternshipApplicationSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_class = InternshipApplicationFilter
    permission_classes = [IsAuthenticated, CanViewApplication]
    
    def get_queryset(self):
        return get_applications_for_user(self.request.user)

    @action(detail=True, methods=['post'])
    def process_application(self, request, pk=None):
        """
        Handle application actions: shortlist, accept, reject, complete, certify
        """
        application = self.get_object()
        serializer = InternshipActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action_name = serializer.validated_data['action']
        
        # Map action names to target states for policy check
        action_to_state = {
            'shortlist': ApplicationStatus.SHORTLISTED,
            'reject': ApplicationStatus.REJECTED,
            'accept': ApplicationStatus.ACCEPTED,
            'start': ApplicationStatus.ACTIVE,
            'complete': ApplicationStatus.COMPLETED,
            'certify': ApplicationStatus.CERTIFIED
        }
        
        target_state = action_to_state.get(action_name)
        if not target_state:
            return Response({"detail": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Policy Check
        from .policies import can_transition_application
        if not can_transition_application(request.user, application, target_state):
            return Response({"detail": f"Not authorized to perform action: {action_name}"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            if action_name in ['shortlist', 'reject']:
                app = process_application(request.user, pk, action_name)
            elif action_name == 'accept':
                app = accept_offer(request.user, pk)
            elif action_name == 'start':
                app = start_internship(request.user, pk)
            elif action_name == 'complete':
                app = complete_internship(request.user, pk)
            elif action_name == 'certify':
                app = certify_internship(request.user, pk)
            else:
                return Response({"detail": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
                
            return Response(InternshipApplicationSerializer(app).data)
        except Exception as e:
             return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        """
        Allow student to withdraw from an internship application.
        Requires: withdrawal_reason (optional)
        """
        try:
            application = InternshipApplication.objects.select_related("opportunity").get(pk=pk)
        except InternshipApplication.DoesNotExist:
            return Response({"detail": "Application not found"}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, application)
        
        try:
            reason = request.data.get('reason', None)
            from .services import withdraw_application
            app = withdraw_application(
                actor=request.user,
                application_id=pk,
                reason=reason
            )
            return Response(InternshipApplicationSerializer(app).data)
        except AuthorizationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def submit_evidence(self, request, pk=None):
        application = self.get_object()
        serializer = SubmitEvidenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Policy Check
        from .policies import can_submit_evidence
        if not can_submit_evidence(request.user, application):
            return Response({"detail": "Not authorized to submit evidence for this application"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            evidence = submit_evidence(
                actor=request.user,
                application_id=pk,
                **serializer.validated_data
            )
            return Response(InternshipEvidenceSerializer(evidence, context={'request': request}).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def evidence(self, request, pk=None):
        """
        List all evidence for a specific application.
        """
        from .queries import get_evidence_for_application
        evidence = get_evidence_for_application(application_id=pk)
        serializer = InternshipEvidenceSerializer(evidence, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='review-evidence/(?P<evidence_id>[^/.]+)')
    def review_evidence(self, request, pk=None, evidence_id=None):
        try:
            application = InternshipApplication.objects.select_related("opportunity").get(pk=pk)
        except InternshipApplication.DoesNotExist:
            return Response({"detail": "Application not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = ReviewEvidenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Policy Check
        from .policies import can_review_evidence
        if not can_review_evidence(request.user, application):
            return Response({"detail": "Not authorized to review evidence for this application"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            evidence = review_evidence(
                actor=request.user,
                evidence_id=evidence_id,
                application_id=pk,
                status=serializer.validated_data['status'],
                notes=serializer.validated_data.get('notes', ''),
                private_notes=serializer.validated_data.get('private_notes', '')
            )
            return Response(InternshipEvidenceSerializer(evidence, context={'request': request}).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def assign_supervisor(self, request, pk=None):
        application = self.get_object()
        opportunity = application.opportunity
        serializer = AssignSupervisorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Policy Check
        from .policies import can_assign_supervisor
        if not can_assign_supervisor(request.user, opportunity):
            return Response({"detail": "Not authorized to assign supervisors"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            app = assign_supervisors(
                actor=request.user,
                application_id=pk,
                supervisor_id=serializer.validated_data['supervisor_id'],
                type=serializer.validated_data['type']
            )
            return Response(InternshipApplicationSerializer(app).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='bulk-assign-supervisors')
    def bulk_assign_supervisors(self, request):
        """
        Assign supervisors in bulk for a department/cohort.
        """
        serializer = BulkAssignSupervisorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Policy Check
        from .policies import can_bulk_assign_supervisors
        if not can_bulk_assign_supervisors(request.user):
            return Response({"detail": "Not authorized to perform bulk assignment"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            result = bulk_assign_institution_supervisors(
                actor=request.user,
                institution_id=serializer.validated_data['institution_id'],
                department_id=serializer.validated_data['department_id'],
                cohort_id=serializer.validated_data.get('cohort_id')
            )
            return Response(result, status=status.HTTP_200_OK)
        except PermissionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": "An unexpected error occurred"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='submit-final-feedback')
    def submit_feedback(self, request, pk=None):
        application = self.get_object()
        serializer = SubmitFinalFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Policy Check
        from .policies import can_submit_final_feedback
        if not can_submit_final_feedback(request.user, application):
            return Response({"detail": "Not authorized to submit final feedback"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            app = submit_final_feedback(
                actor=request.user,
                application_id=pk,
                feedback=serializer.validated_data['feedback'],
                rating=serializer.validated_data.get('rating')
            )
            return Response(InternshipApplicationSerializer(app).data)
        except PermissionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='create-success-story')
    def create_story(self, request, pk=None):
        application = self.get_object()
        serializer = CreateSuccessStorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Policy Check: Success stories follow same visibility/owner rules as application
        from .policies import can_view_application
        if not can_view_application(request.user, application):
            return Response({"detail": "Not authorized to create success story"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            story = create_success_story(
                actor=request.user,
                application_id=pk,
                student_testimonial=serializer.validated_data['student_testimonial'],
                employer_feedback=serializer.validated_data['employer_feedback'],
                is_published=serializer.validated_data['is_published']
            )
            return Response(SuccessStorySerializer(story).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def report_incident(self, request, pk=None):
        application = self.get_object()
        serializer = CreateIncidentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Policy Check
        from .policies import can_flag_misconduct
        if not can_flag_misconduct(request.user, application):
            return Response({"detail": "Not authorized to report incidents for this application"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            incident = create_incident(
                actor=request.user,
                application_id=pk,
                title=serializer.validated_data['title'],
                description=serializer.validated_data['description']
            )
            return Response(IncidentSerializer(incident).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='resolve-incident/(?P<incident_id>[^/.]+)')
    def resolve_incident(self, request, pk=None, incident_id=None):
        serializer = ResolveIncidentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Policy Check: Resolving incidents requires admin roles usually
        if not (request.user.is_employer_admin or request.user.is_institution_admin):
             return Response({"detail": "Only admins can resolve incidents"}, status=status.HTTP_403_FORBIDDEN)
             
        try:
            incident = resolve_incident(
                actor=request.user,
                incident_id=incident_id,
                status=serializer.validated_data['status'],
                notes=serializer.validated_data['resolution_notes']
            )
            return Response(IncidentSerializer(incident).data)
        except PermissionError as e:
             return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ExternalPlacementDeclarationViewSet(viewsets.ModelViewSet):
    """
    Student-declared external placements.

    Approval creates an ACTIVE placement so logbooks unlock through the existing
    evidence workflow while employer review remains unavailable until employer
    linking is implemented.
    """
    serializer_class = ExternalPlacementDeclarationSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return get_external_placement_declarations_for_user(self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return ExternalPlacementDeclarationCreateSerializer
        if self.action in ["approve", "request_changes", "reject"]:
            return ExternalPlacementDeclarationReviewSerializer
        return ExternalPlacementDeclarationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            declaration = declare_external_placement(
                actor=request.user,
                **serializer.validated_data,
            )
            return Response(
                ExternalPlacementDeclarationSerializer(declaration, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        except AuthorizationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            declaration = approve_external_placement_declaration(
                actor=request.user,
                declaration_id=pk,
                review_notes=serializer.validated_data.get("review_notes", ""),
            )
            return Response(ExternalPlacementDeclarationSerializer(declaration, context={"request": request}).data)
        except AuthorizationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="request-changes")
    def request_changes(self, request, pk=None):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            declaration = request_external_placement_changes(
                actor=request.user,
                declaration_id=pk,
                review_notes=serializer.validated_data.get("review_notes", ""),
            )
            return Response(ExternalPlacementDeclarationSerializer(declaration, context={"request": request}).data)
        except AuthorizationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            declaration = reject_external_placement_declaration(
                actor=request.user,
                declaration_id=pk,
                review_notes=serializer.validated_data.get("review_notes", ""),
            )
            return Response(ExternalPlacementDeclarationSerializer(declaration, context={"request": request}).data)
        except AuthorizationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ==================== Phase 2.4: Supervisor Assignment ViewSet ====================

class SupervisorAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Supervisor Assignments (Phase 2.4 Acceptance Workflow).
    
    Endpoints:
    - GET /supervisor-assignments/ - List assignments
    - GET /supervisor-assignments/{id}/ - View assignment details
    - POST /supervisor-assignments/{id}/accept/ - Accept assignment
    - POST /supervisor-assignments/{id}/reject/ - Reject assignment
    """
    serializer_class = SupervisorAssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'assignment_type']
    
    def get_queryset(self):
        """
        Filter supervisor assignments based on user role:
        - Supervisors: See their assigned assignments
        - Admins: See all assignments
        - Students: See assignments for their applications
        """
        user = self.request.user
        
        if user.is_system_admin:
            return SupervisorAssignment.objects.all().order_by("-created_at", "-id")

        if user.is_employer_admin:
            from edulink.apps.employers.queries import get_employer_for_user
            employer = get_employer_for_user(user.id)
            if employer:
                return SupervisorAssignment.objects.filter(
                    application__opportunity__employer_id=employer.id,
                    assignment_type=SupervisorAssignment.ASSIGNMENT_EMPLOYER,
                ).order_by("-created_at", "-id")
            return SupervisorAssignment.objects.none()

        if user.is_institution_admin:
            from edulink.apps.institutions.queries import get_institution_for_user
            inst = get_institution_for_user(str(user.id))
            if inst:
                return SupervisorAssignment.objects.filter(
                    Q(application__opportunity__institution_id=inst.id) |
                    Q(application__application_snapshot__institution_id=str(inst.id)),
                    assignment_type=SupervisorAssignment.ASSIGNMENT_INSTITUTION,
                ).distinct().order_by("-created_at", "-id")
            return SupervisorAssignment.objects.none()
        
        if user.is_supervisor:
            # Supervisors see their own assignments
            from edulink.apps.employers.queries import get_supervisor_id_for_user
            from edulink.apps.institutions.queries import get_institution_staff_id_for_user

            filters = Q()
            employer_supervisor_id = get_supervisor_id_for_user(user.id)
            institution_staff_id = get_institution_staff_id_for_user(str(user.id))
            if employer_supervisor_id:
                filters |= Q(
                    supervisor_id=employer_supervisor_id,
                    assignment_type=SupervisorAssignment.ASSIGNMENT_EMPLOYER,
                )
            if institution_staff_id:
                filters |= Q(
                    supervisor_id=institution_staff_id,
                    assignment_type=SupervisorAssignment.ASSIGNMENT_INSTITUTION,
                )
            if filters:
                return SupervisorAssignment.objects.filter(filters).order_by("-created_at", "-id")
            return SupervisorAssignment.objects.none()
        
        if user.is_student:
            # Students see assignments for their own applications
            from edulink.apps.students.queries import get_student_for_user
            student = get_student_for_user(str(user.id))
            if student:
                return SupervisorAssignment.objects.filter(application__student_id=student.id).order_by("-created_at", "-id")
        
        return SupervisorAssignment.objects.none()
    
    def has_object_permission(self, request, view, obj):
        """
        Object-level permission check for supervisor assignments.
        """
        user = request.user
        
        # System admins can access all
        if user.is_system_admin:
            return True
        
        # Supervisor can access their own
        if user.is_supervisor:
            from .policies import can_view_supervisor_assignment
            if can_view_supervisor_assignment(user, obj):
                return True

        if user.is_employer_admin:
            from edulink.apps.employers.queries import get_employer_for_user
            employer = get_employer_for_user(user.id)
            if employer and obj.assignment_type == SupervisorAssignment.ASSIGNMENT_EMPLOYER:
                return str(obj.application.opportunity.employer_id) == str(employer.id)

        if user.is_institution_admin:
            from edulink.apps.institutions.queries import get_institution_for_user
            inst = get_institution_for_user(str(user.id))
            if inst and obj.assignment_type == SupervisorAssignment.ASSIGNMENT_INSTITUTION:
                return (
                    str(obj.application.opportunity.institution_id) == str(inst.id)
                    or str(obj.application.application_snapshot.get("institution_id")) == str(inst.id)
                )

        # Student can access assignments for their application
        if user.is_student:
            from edulink.apps.students.queries import get_student_for_user
            student = get_student_for_user(str(user.id))
            return bool(student and str(obj.application.student_id) == str(student.id))
        
        return False

    def _can_act_on_assignment(self, user, assignment):
        from .policies import can_accept_supervisor_assignment
        return can_accept_supervisor_assignment(user, assignment)
    
    def get_permissions(self):
        if self.action in ['accept', 'reject']:
            return [IsAuthenticated()]
        return super().get_permissions()
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """
        Accept a supervisor assignment.
        Only the assigned supervisor can accept their own assignment.
        """
        assignment = self.get_object()
        
        # Permission check: Only assigned domain supervisor can accept
        if not self._can_act_on_assignment(request.user, assignment):
            return Response(
                {"detail": "Only the assigned supervisor can accept this assignment"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = AcceptSupervisorAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            assignment = accept_supervisor_assignment(request.user, pk)
            return Response(
                SupervisorAssignmentSerializer(assignment).data,
                status=status.HTTP_200_OK
            )
        except (AuthorizationError, PermissionError) as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            logger.error(f"Error accepting supervisor assignment: {e}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject a supervisor assignment.
        Only the assigned supervisor can reject their own assignment.
        """
        assignment = self.get_object()
        
        # Permission check: Only assigned domain supervisor can reject
        if not self._can_act_on_assignment(request.user, assignment):
            return Response(
                {"detail": "Only the assigned supervisor can reject this assignment"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = RejectSupervisorAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            reason = serializer.validated_data.get('reason', None)
            assignment = reject_supervisor_assignment(request.user, pk, reason=reason)
            return Response(
                SupervisorAssignmentSerializer(assignment).data,
                status=status.HTTP_200_OK
            )
        except (AuthorizationError, PermissionError) as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            logger.error(f"Error rejecting supervisor assignment: {e}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
