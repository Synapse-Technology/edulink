from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView

from internship.models.internship import Internship
from internship.models.skill_tag import SkillTag
from internship.serializers.internship_serializers import (
    InternshipSerializer,
    InternshipCreateSerializer,
    InternshipUpdateSerializer,
    InternshipVerificationSerializer,
    InternshipListSerializer,
    FlagReportSerializer,
)
from internship.permissions.role_permissions import (
    IsVerifiedEmployer,
    CanEditInternship,
    CanVerifyInternship,
    CanViewInternship,
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
        queryset = Internship.objects.filter(is_active=True)  # type: ignore[attr-defined]

        # Filter by visibility based on user
        if hasattr(self.request.user, 'student_profile'):  # type: ignore[attr-defined]
            # Students can see public internships and institution-specific ones
            student_institution = self.request.user.student_profile.institution  # type: ignore[attr-defined]
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
    queryset = Internship.objects.select_related(
        'employer', 'employer__user', 'institution')  # type: ignore[attr-defined]


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
        """Set the employer automatically"""
        serializer.save(employer=self.request.user.employer_profile)  # type: ignore[attr-defined]


class InternshipUpdateView(generics.UpdateAPIView):
    """
    Update an internship.
    Only the posting employer can update, and only before verification.
    """
    serializer_class = InternshipUpdateSerializer
    permission_classes = [IsAuthenticated, CanEditInternship]
    queryset = Internship.objects.all()  # type: ignore[attr-defined]


class InternshipDeleteView(generics.DestroyAPIView):
    """
    Delete an internship.
    Only the posting employer can delete, and only before verification.
    """
    permission_classes = [IsAuthenticated, CanEditInternship]
    queryset = Internship.objects.all()  # type: ignore[attr-defined]

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
        return Internship.objects.filter(  # type: ignore[attr-defined]
            employer=self.request.user.employer_profile  # type: ignore[attr-defined]
        ).select_related('institution').order_by('-created_at')  # type: ignore[attr-defined]


class InternshipVerificationView(generics.UpdateAPIView):
    """
    Verify an internship.
    Only institution admins can verify internships for their institution.
    """
    serializer_class = InternshipVerificationSerializer
    permission_classes = [IsAuthenticated, CanVerifyInternship]
    queryset = Internship.objects.all()  # type: ignore[attr-defined]

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
    queryset = SkillTag.objects.filter(is_active=True)  # type: ignore[attr-defined]
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
        queryset = Internship.objects.filter(is_active=True, is_verified=True)  # type: ignore[attr-defined]

        # Basic filters
        category = self.request.query_params.get('category')  # type: ignore[attr-defined]
        location = self.request.query_params.get('location')  # type: ignore[attr-defined]
        min_stipend = self.request.query_params.get('min_stipend')  # type: ignore[attr-defined]
        max_stipend = self.request.query_params.get('max_stipend')  # type: ignore[attr-defined]
        skill_tags = self.request.query_params.getlist('skill_tags')  # type: ignore[attr-defined]

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
        if hasattr(self.request.user, 'student_profile'):  # type: ignore[attr-defined]
            student_institution = self.request.user.student_profile.institution  # type: ignore[attr-defined]
            queryset = queryset.filter(
                Q(visibility='public') |
                Q(visibility='institution-only', institution=student_institution)
            )
        else:
            queryset = queryset.filter(visibility='public')

        # Hide expired internships
        queryset = queryset.filter(deadline__gt=timezone.now())

        return queryset.select_related('employer', 'employer__user', 'institution')


class InternshipAnalyticsView(APIView):
    """
    Analytics for internships: most popular, most applied-to, etc.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Most applied-to internships
        from django.db.models import Count
        popular = (
            Internship.objects.annotate(app_count=Count('applications'))  # type: ignore[attr-defined]
            .order_by('-app_count')[:5]
        )
        data = [
            {
                'internship': i.title,
                'employer': i.employer.company_name,  # type: ignore[attr-defined]
                'applications': i.app_count,  # type: ignore[attr-defined]
            }
            for i in popular
        ]
        return Response({'most_applied_to': data})
