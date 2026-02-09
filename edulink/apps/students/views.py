from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from .models import Student, StudentInstitutionAffiliation
from .serializers import StudentSerializer, TrustTierSerializer, StudentTrustTierSerializer, StudentInstitutionAffiliationSerializer
from .filters import StudentFilter
from .services import (
    upload_student_document, log_internship_activity, 
    approve_supervisor_activity, certify_internship_completion,
    create_institution_affiliation_claim,
    verify_student_affiliation, reject_student_affiliation,
    update_student_profile,
    get_pending_affiliations_for_institution, get_student_affiliations,
    preregister_student
)
from .queries import (
    get_institution_id_for_user, 
    get_pending_affiliations_for_all_admin_institutions,
    calculate_profile_readiness,
    get_student_dashboard_stats
)
from edulink.apps.trust.services import compute_student_trust_tier
from .policies import is_student
from edulink.apps.institutions.permissions import IsActiveInstitutionAdmin

class StudentLoginView(APIView):
    """
    Student-specific login endpoint.
    Only allows Students to login.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Authenticate student and return JWT tokens.
        """
        from edulink.apps.accounts.serializers import UserLoginSerializer, UserSerializer
        from edulink.apps.accounts.services import authenticate_user
        
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = authenticate_user(**serializer.validated_data)
            
            # Check if user is a student
            if not is_student(user):
                return Response(
                    {"detail": "Access denied. This login is for students only."},
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

class StudentViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        from .queries import get_student_queryset
        return get_student_queryset(self.request.user)

    queryset = Student.objects.none() # Default to safe
    serializer_class = StudentSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['email', 'registration_number']
    filterset_class = StudentFilter

    @action(detail=False, methods=['get'])
    def current(self, request):
        """
        Get the current user's student profile.
        Creates one lazily if it doesn't exist.
        """
        from .services import get_or_create_student_profile
        
        student = get_or_create_student_profile(user=request.user)
        serializer = self.get_serializer(student)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def update_profile(self, request, pk=None):
        """Update student profile details"""
        student = self.get_object()
        serializer = StudentSerializer(student, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        updated_student = update_student_profile(
            student_id=str(student.id),
            data=serializer.validated_data
        )
        
        return Response(StudentSerializer(updated_student, context={'request': request}).data)

    @action(detail=True, methods=['get'])
    def profile_readiness(self, request, pk=None):
        """Get student's profile readiness score and breakdown"""
        student = self.get_object()
        readiness_data = calculate_profile_readiness(student_id=str(student.id))
        return Response(readiness_data)

    @action(detail=True, methods=['get'])
    def dashboard_stats(self, request, pk=None):
        """Get dashboard stats with trends"""
        student = self.get_object()
        stats = get_student_dashboard_stats(student_id=str(student.id))
        return Response(stats)

    @action(detail=True, methods=['get'])
    def trust_tier(self, request, pk=None):
        """Get student's current trust tier and score"""
        student = self.get_object()
        trust_info = compute_student_trust_tier(student_id=str(student.id))
        
        serializer = StudentTrustTierSerializer({
            'student': student,
            'trust_tier': trust_info
        })
        return Response(serializer.data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_document(self, request, pk=None):
        """Upload a document for trust scoring"""
        student = self.get_object()
        document_type = request.data.get('document_type')
        file_name = request.data.get('file_name')
        file = request.FILES.get('file')
        
        if not document_type or not file_name or not file:
            return Response(
                {'error': 'document_type, file_name, and file are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        upload_student_document(
            student_id=str(student.id),
            document_type=document_type,
            file_name=file_name,
            file=file
        )
        
        # Return updated trust tier
        trust_info = compute_student_trust_tier(student_id=str(student.id))
        return Response({
            'message': 'Document upload recorded',
            'trust_tier': trust_info
        })

    @action(detail=True, methods=['post'])
    def log_activity(self, request, pk=None):
        """Log internship activity for trust scoring"""
        student = self.get_object()
        activity_type = request.data.get('activity_type')
        description = request.data.get('description')
        
        if not activity_type or not description:
            return Response(
                {'error': 'activity_type and description are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        log_internship_activity(
            student_id=str(student.id),
            activity_type=activity_type,
            description=description
        )
        
        # Return updated trust tier
        trust_info = compute_student_trust_tier(student_id=str(student.id))
        return Response({
            'message': 'Activity logged',
            'trust_tier': trust_info
        })

    @action(detail=True, methods=['post'])
    def claim_affiliation(self, request, pk=None):
        """Student claims affiliation with an institution"""
        student = self.get_object()
        institution_id = request.data.get('institution_id')
        
        if not institution_id:
            return Response(
                {'error': 'institution_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            affiliation = create_institution_affiliation_claim(
                student_id=str(student.id),
                institution_id=institution_id,
                claimed_via=StudentInstitutionAffiliation.CLAIMED_VIA_MANUAL
            )
            return Response(StudentInstitutionAffiliationSerializer(affiliation).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def affiliations(self, request, pk=None):
        """Get student's institution affiliations"""
        student = self.get_object()
        affiliations = get_student_affiliations(student_id=str(student.id))
        return Response({'affiliations': StudentInstitutionAffiliationSerializer(affiliations, many=True).data})

    @action(detail=True, methods=['post'])
    def approve_activity(self, request, pk=None):
        """Approve student activity (supervisor action)"""
        student = self.get_object()
        supervisor_id = request.data.get('supervisor_id')
        activity_id = request.data.get('activity_id')
        
        if not supervisor_id or not activity_id:
            return Response(
                {'error': 'supervisor_id and activity_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        approve_supervisor_activity(
            student_id=str(student.id),
            supervisor_id=supervisor_id,
            activity_id=activity_id
        )
        
        # Return updated trust tier
        trust_info = compute_student_trust_tier(student_id=str(student.id))
        return Response({
            'message': 'Activity approved',
            'trust_tier': trust_info
        })

    @action(detail=True, methods=['post'], permission_classes=[IsActiveInstitutionAdmin])
    def certify_completion(self, request, pk=None):
        """Certify internship completion (institution action)"""
        student = self.get_object()
        
        # Infer institution_id from user if not provided (safer)
        institution_id = get_institution_id_for_user(request.user)
        if not institution_id:
             return Response(
                {'error': 'User is not associated with an active institution'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        certificate_id = request.data.get('certificate_id')
        
        certify_internship_completion(
            student_id=str(student.id),
            institution_id=institution_id,
            certificate_id=certificate_id
        )
        
        # Return updated trust tier
        trust_info = compute_student_trust_tier(student_id=str(student.id))
        return Response({
            'message': 'Internship completion certified',
            'trust_tier': trust_info
        })

    @action(detail=False, methods=['get'])
    def by_tier(self, request):
        """Get students filtered by trust tier level"""
        tier_level = request.query_params.get('tier_level')
        
        if not tier_level:
            return Response(
                {'error': 'tier_level parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            tier_level = int(tier_level)
        except ValueError:
            return Response(
                {'error': 'tier_level must be an integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .queries import get_students_by_trust_level
        students = get_students_by_trust_level(level=tier_level)
        
        serializer = self.get_serializer(students, many=True)
        return Response({
            'count': students.count(),
            'students': serializer.data
        })

    
    @action(detail=True, methods=['post'])
    def claim_institution(self, request, pk=None):
        """Student claims affiliation with an institution"""
        student = self.get_object()
        institution_id = request.data.get('institution_id')
        claimed_via = request.data.get('claimed_via', 'manual')  # 'domain' or 'manual'
        
        if not institution_id:
            return Response(
                {'error': 'institution_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if claimed_via not in ['domain', 'manual']:
            return Response(
                {'error': 'claimed_via must be "domain" or "manual"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        affiliation = create_institution_affiliation_claim(
            student_id=str(student.id),
            institution_id=institution_id,
            claimed_via=claimed_via
        )
        
        serializer = StudentInstitutionAffiliationSerializer(affiliation)
        return Response({
            'message': 'Institution affiliation claim created',
            'affiliation': serializer.data
        })
    


class StudentInstitutionAffiliationViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        from .queries import get_student_affiliation_queryset
        return get_student_affiliation_queryset(self.request.user)

    queryset = StudentInstitutionAffiliation.objects.none()
    serializer_class = StudentInstitutionAffiliationSerializer
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending affiliations for institution admin"""
        institution_id = request.query_params.get('institution_id')
        
        # If no institution_id provided, try to infer it from the authenticated user
        if not institution_id and request.user.is_authenticated:
            if request.user.is_institution_admin:
                institution_id = get_institution_id_for_user(request.user)
            else:
                return Response(
                    {'error': 'Only institution admins can view pending affiliations'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        if not institution_id:
            return Response(
                {'error': 'institution_id is required or user must be linked to an institution'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        affiliations = get_pending_affiliations_for_institution(institution_id=institution_id)
        serializer = self.get_serializer(affiliations, many=True)
        return Response({
            'pending_affiliations': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve a pending student affiliation request.
        """
        from .policies import can_manage_affiliation
        from .services import verify_student_affiliation
        
        affiliation = self.get_object()
        if not can_manage_affiliation(user=request.user, affiliation=affiliation):
            return Response(
                {"detail": "You do not have permission to approve this affiliation."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            updated_affiliation = verify_student_affiliation(
                affiliation_id=str(affiliation.id),
                actor_id=str(request.user.id),
                review_notes=request.data.get('review_notes', ''),
                department_id=request.data.get('department_id'),
                cohort_id=request.data.get('cohort_id')
            )
            return Response(self.get_serializer(updated_affiliation).data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject a pending student affiliation request.
        """
        from .policies import can_manage_affiliation
        from .services import reject_student_affiliation
        
        affiliation = self.get_object()
        if not can_manage_affiliation(user=request.user, affiliation=affiliation):
            return Response(
                {"detail": "You do not have permission to reject this affiliation."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        reason = request.data.get('reason')
        if not reason:
            return Response({"detail": "Reason for rejection is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            updated_affiliation = reject_student_affiliation(
                affiliation_id=str(affiliation.id),
                reason=reason,
                actor_id=str(request.user.id)
            )
            return Response(self.get_serializer(updated_affiliation).data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
