from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend

from .models import InternshipOpportunity, InternshipApplication, InternshipEvidence, Incident, OpportunityStatus, ApplicationStatus
from .serializers import (
    InternshipOpportunitySerializer, InternshipApplicationSerializer, CreateInternshipSerializer, InternshipActionSerializer,
    SubmitEvidenceSerializer, ReviewEvidenceSerializer, IncidentSerializer, 
    CreateIncidentSerializer, ResolveIncidentSerializer, AssignSupervisorSerializer,
    BulkAssignSupervisorSerializer,
    InternshipEvidenceSerializer, SuccessStorySerializer,
    SubmitFinalFeedbackSerializer
)
from .filters import InternshipOpportunityFilter, InternshipApplicationFilter
from .services import (
    create_internship_opportunity, publish_internship, apply_for_internship,
    process_application, accept_offer, start_internship, complete_internship,
    certify_internship, submit_evidence, review_evidence, create_incident, resolve_incident, assign_supervisors,
    bulk_assign_institution_supervisors,
    create_success_story, submit_final_feedback
)
from .queries import (
    get_opportunities_for_user, get_applications_for_user, 
    get_opportunity_by_id, get_application_by_id
)

class InternshipViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Internship Opportunities (Job Board).
    """
    serializer_class = InternshipOpportunitySerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['title', 'description', 'department', 'location']
    filterset_class = InternshipOpportunityFilter
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'success_stories']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_authenticators(self):
        if self.action in ['list', 'retrieve', 'success_stories']:
            return []
        return super().get_authenticators()
    
    def get_queryset(self):
        return get_opportunities_for_user(self.request.user)

    @action(detail=False, methods=['post'])
    def create_opportunity(self, request):
        serializer = CreateInternshipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            internship = create_internship_opportunity(
                actor=request.user,
                title=serializer.validated_data['title'],
                description=serializer.validated_data['description'],
                department=serializer.validated_data.get('department', ''),
                skills=serializer.validated_data.get('skills', []),
                capacity=serializer.validated_data.get('capacity', 1),
                location=serializer.validated_data.get('location', ''),
                location_type=serializer.validated_data.get('location_type', InternshipOpportunity.LOCATION_ONSITE),
                institution_id=serializer.validated_data.get('institution_id'),
                employer_id=serializer.validated_data.get('employer_id'),
                start_date=serializer.validated_data.get('start_date'),
                end_date=serializer.validated_data.get('end_date'),
                duration=serializer.validated_data.get('duration', ''),
                application_deadline=serializer.validated_data.get('application_deadline'),
                is_institution_restricted=serializer.validated_data.get('is_institution_restricted', False)
            )
            return Response(InternshipOpportunitySerializer(internship).data, status=status.HTTP_201_CREATED)
        except PermissionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        try:
            internship = publish_internship(request.user, pk)
            return Response(InternshipOpportunitySerializer(internship).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        try:
            cover_letter = request.data.get('cover_letter', '')
            application = apply_for_internship(request.user, pk, cover_letter)
            return Response(InternshipApplicationSerializer(application).data, status=status.HTTP_201_CREATED)
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
        List all pending evidence for the current supervisor.
        """
        from .queries import get_pending_evidence_for_supervisor
        evidence = get_pending_evidence_for_supervisor(request.user)
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


class ApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Internship Applications (Engagements).
    """
    serializer_class = InternshipApplicationSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_class = InternshipApplicationFilter
    
    def get_queryset(self):
        return get_applications_for_user(self.request.user)

    @action(detail=True, methods=['post'])
    def process_application(self, request, pk=None):
        """
        Handle application actions: shortlist, accept, reject, complete, certify
        """
        serializer = InternshipActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action_name = serializer.validated_data['action']
        
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
        except PermissionError as e:
             return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
             return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def submit_evidence(self, request, pk=None):
        serializer = SubmitEvidenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            evidence = submit_evidence(
                actor=request.user,
                application_id=pk,
                title=serializer.validated_data['title'],
                file=serializer.validated_data.get('file'),
                description=serializer.validated_data.get('description', ''),
                evidence_type=serializer.validated_data.get('evidence_type', 'OTHER'),
                metadata=serializer.validated_data.get('metadata', {})
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
        serializer = ReviewEvidenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            evidence = review_evidence(
                actor=request.user,
                evidence_id=evidence_id,
                status=serializer.validated_data['status'],
                notes=serializer.validated_data.get('notes', ''),
                private_notes=serializer.validated_data.get('private_notes', '')
            )
            return Response(InternshipEvidenceSerializer(evidence, context={'request': request}).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def assign_supervisor(self, request, pk=None):
        serializer = AssignSupervisorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
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
        serializer = SubmitFinalFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
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
        try:
            story = create_success_story(
                actor=request.user,
                application_id=pk,
                student_testimonial=request.data.get('student_testimonial', ''),
                employer_feedback=request.data.get('employer_feedback', ''),
                is_published=request.data.get('is_published', False)
            )
            return Response(SuccessStorySerializer(story).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def report_incident(self, request, pk=None):
        serializer = CreateIncidentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
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
