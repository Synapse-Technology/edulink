from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q

from ..models.internship import Internship
from ..models.skill_tag import SkillTag
from ..models.flag_report import FlagReport
from ..serializers.internship_serializers import (
    InternshipSerializer,
    InternshipCreateSerializer,
    InternshipUpdateSerializer,
    InternshipVerificationSerializer,
    InternshipListSerializer,
    FlagReportSerializer,
)
from ..permissions.role_permissions import (
    IsVerifiedEmployer,
    CanEditInternship,
    CanVerifyInternship,
    CanViewInternship,
    CanApplyToInternship,
)
from ..serializers.skill_tag import SkillTagSerializer


class InternshipListView(generics.ListAPIView):
    """
    List all internships with filtering and search capabilities.
    Accessible by all users.
    """
    serializer_class = InternshipListSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'location', 'is_verified', 'visibility', 'skill_tags']
    search_fields = ['title', 'description', 'employer__company_name', 'institution__name']
    ordering_fields = ['created_at', 'deadline', 'start_date', 'stipend']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter internships based on visibility and expiration"""
        queryset = Internship.objects.filter(is_active=True)
        
        # Filter by visibility based on user
        if hasattr(self.request.user, 'student_profile'):
            # Students can see public internships and institution-specific ones
            student_institution = self.request.user.student_profile.institution
            queryset = queryset.filter(
                Q(visibility='public') | 
                Q(visibility='institution-only', institution=student_institution)
            )
        else:
            # Non-students can only see public internships
            queryset = queryset.filter(visibility='public')
        
        # Filter by expiration (hide expired internships)
        queryset = queryset.filter(deadline__gt=timezone.now())
        
        return queryset.select_related('employer', 'employer__user', 'institution')


class InternshipDetailView(generics.RetrieveAPIView):
    """
    Retrieve a specific internship.
    Accessible based on visibility settings.
    """
    serializer_class = InternshipSerializer
    permission_classes = [CanViewInternship]
    queryset = Internship.objects.select_related('employer', 'employer__user', 'institution')


def calculate_trust_score(employer_profile, internship_data):
    """
    Calculate trust score for an internship posting based on hybrid model rules.
    Returns an integer between 0 and 100.
    """
    score = 0
    # KRA PIN provided (simulate with a field or always true for now)
    if getattr(employer_profile, 'kra_pin', None):
        score += 15
    # Email domain not Gmail/Yahoo
    email = getattr(employer_profile.user, 'email', '')
    if email and not any(domain in email for domain in ['gmail.com', 'yahoo.com']):
        score += 15
    # Phone OTP verified (simulate with a field or always true for now)
    if getattr(employer_profile.user, 'is_phone_verified', False):
        score += 10
    # Company has posted >1 internship successfully
    if employer_profile.internships.filter(is_verified=True).count() > 1:
        score += 10
    # Company was verified manually before
    if getattr(employer_profile, 'is_verified', False):
        score += 20
    # Internship location matches company profile (simulate fuzzy match)
    if getattr(employer_profile, 'location', None) and internship_data.get('location'):
        if employer_profile.location.lower() in internship_data['location'].lower():
            score += 10
    # No flags reported (simulate with a field or always true for now)
    if getattr(employer_profile, 'flag_count', 0) == 0:
        score += 20
    return min(score, 100)


class InternshipCreateView(generics.CreateAPIView):
    """
    Create a new internship.
    Only verified employers can create internships.
    """
    serializer_class = InternshipCreateSerializer
    permission_classes = [IsAuthenticated, IsVerifiedEmployer]

    def perform_create(self, serializer):
        employer_profile = self.request.user.employer_profile
        internship_data = serializer.validated_data.copy()
        # Save first to get the instance
        internship = serializer.save(employer=employer_profile)
        # Calculate trust score
        trust_score = calculate_trust_score(employer_profile, internship_data)
        internship.trust_score = trust_score
        # Assign verification status
        if trust_score >= 80:
            internship.verification_status = "auto_verified"
            internship.is_verified = True
        elif trust_score >= 60:
            internship.verification_status = "pending_review"
            internship.is_verified = False
        else:
            internship.verification_status = "flagged"
            internship.is_verified = False
        internship.save()


class InternshipUpdateView(generics.UpdateAPIView):
    """
    Update an internship.
    Only the posting employer can update, and only before verification.
    """
    serializer_class = InternshipUpdateSerializer
    permission_classes = [IsAuthenticated, CanEditInternship]
    queryset = Internship.objects.all()


class InternshipDeleteView(generics.DestroyAPIView):
    """
    Delete an internship.
    Only the posting employer can delete, and only before verification.
    """
    permission_classes = [IsAuthenticated, CanEditInternship]
    queryset = Internship.objects.all()

    def perform_destroy(self, instance):
        """Soft delete by setting is_active to False"""
        instance.is_active = False
        instance.save()


class EmployerInternshipListView(generics.ListAPIView):
    """
    List internships posted by the currently authenticated employer.
    """
    serializer_class = InternshipListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_verified', 'is_active', 'visibility']
    search_fields = ['title', 'description']

    def get_queryset(self):
        """Filter internships by the authenticated employer"""
        return Internship.objects.filter(
            employer=self.request.user.employer_profile
        ).select_related('institution').order_by('-created_at')


class InternshipVerificationView(generics.UpdateAPIView):
    """
    Verify an internship.
    Only institution admins can verify internships for their institution.
    """
    serializer_class = InternshipVerificationSerializer
    permission_classes = [IsAuthenticated, CanVerifyInternship]
    queryset = Internship.objects.all()

    def update(self, request, *args, **kwargs):
        """Mark internship as verified"""
        instance = self.get_object()
        instance.is_verified = True
        instance.save()
        
        serializer = self.get_serializer(instance)
        return Response({
            'message': 'Internship verified successfully',
            'internship': serializer.data
        })


class SkillTagListView(generics.ListAPIView):
    """
    List all skill tags for filtering and selection.
    """
    serializer_class = SkillTagSerializer
    permission_classes = [AllowAny]
    queryset = SkillTag.objects.filter(is_active=True)
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']


class InternshipSearchView(generics.ListAPIView):
    """
    Advanced search for internships with multiple criteria.
    """
    serializer_class = InternshipListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Advanced filtering based on query parameters"""
        queryset = Internship.objects.filter(is_active=True, is_verified=True)
        
        # Basic filters
        category = self.request.query_params.get('category')
        location = self.request.query_params.get('location')
        min_stipend = self.request.query_params.get('min_stipend')
        max_stipend = self.request.query_params.get('max_stipend')
        skill_tags = self.request.query_params.getlist('skill_tags')
        
        if category:
            queryset = queryset.filter(category__icontains=category)
        
        if location:
            queryset = queryset.filter(location__icontains=location)
        
        if min_stipend:
            queryset = queryset.filter(stipend__gte=min_stipend)
        
        if max_stipend:
            queryset = queryset.filter(stipend__lte=max_stipend)
        
        if skill_tags:
            queryset = queryset.filter(skill_tags__name__in=skill_tags).distinct()
        
        # Filter by visibility for students
        if hasattr(self.request.user, 'student_profile'):
            student_institution = self.request.user.student_profile.institution
            queryset = queryset.filter(
                Q(visibility='public') | 
                Q(visibility='institution-only', institution=student_institution)
            )
        else:
            queryset = queryset.filter(visibility='public')
        
        # Hide expired internships
        queryset = queryset.filter(deadline__gt=timezone.now())
        
        return queryset.select_related('employer', 'employer__user', 'institution')


class InternshipFlagView(generics.CreateAPIView):
    """
    Allow a student to report/flag an internship.
    """
    serializer_class = FlagReportSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        internship_id = kwargs.get('pk')
        reason = request.data.get('reason')
        if not reason:
            return Response({'detail': 'Reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            internship = Internship.objects.get(pk=internship_id)
        except Internship.DoesNotExist:
            return Response({'detail': 'Internship not found.'}, status=status.HTTP_404_NOT_FOUND)
        student = getattr(request.user, 'student_profile', None)
        if not student:
            return Response({'detail': 'Only students can report internships.'}, status=status.HTTP_403_FORBIDDEN)
        # Prevent duplicate flagging by the same student
        if FlagReport.objects.filter(student=student, internship=internship).exists():
            return Response({'detail': 'You have already reported this internship.'}, status=status.HTTP_400_BAD_REQUEST)
        # Create the flag report
        flag_report = FlagReport.objects.create(student=student, internship=internship, reason=reason)
        # Increment flag count
        internship.flag_count += 1
        # Escalate if needed
        if internship.flag_count >= 3:
            internship.verification_status = 'flagged'
            # Optionally notify admin here
        internship.save()
        serializer = self.get_serializer(flag_report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminInternshipListView(generics.ListAPIView):
    """
    Admin: List internships filtered by verification_status.
    ?status=verified|pending_review|flagged|auto_verified
    """
    serializer_class = InternshipListSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        status_param = self.request.query_params.get('status')
        qs = Internship.objects.all()
        if status_param:
            if status_param == 'verified':
                qs = qs.filter(is_verified=True)
            else:
                qs = qs.filter(verification_status=status_param)
        return qs.order_by('-created_at')


class AdminInternshipReviewView(generics.UpdateAPIView):
    """
    Admin: Approve, reject, or flag an internship.
    PATCH/PUT with {"action": "approve"|"reject"|"flag"}
    """
    serializer_class = InternshipSerializer
    permission_classes = [IsAdminUser]
    queryset = Internship.objects.all()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        action = request.data.get('action')
        if action == 'approve':
            instance.is_verified = True
            instance.verification_status = 'auto_verified'
        elif action == 'reject':
            instance.is_verified = False
            instance.verification_status = 'flagged'
            instance.is_active = False
        elif action == 'flag':
            instance.verification_status = 'flagged'
        else:
            return Response({'detail': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
