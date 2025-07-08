from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from internship.models.internship import Internship
from internship.serializers.internship_serializers import InternshipSerializer
from authentication.permissions import IsEmployer, IsOwnEmployerInternship
from rest_framework.permissions import IsAuthenticated

# Public: List internships with filtering/search/order
class InternshipListView(generics.ListAPIView):
    queryset = Internship.objects.filter(is_active=True)
    serializer_class = InternshipSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['location', 'is_paid', 'employer']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-created_at']
    permission_classes = []  # Public access

# Public: View internship details
class InternshipDetailView(generics.RetrieveAPIView):
    queryset = Internship.objects.filter(is_active=True)
    serializer_class = InternshipSerializer
    permission_classes = []  # Public access

# Employer: Create internship
class InternshipCreateView(generics.CreateAPIView):
    queryset = Internship.objects.all()
    serializer_class = InternshipSerializer
    permission_classes = [IsAuthenticated, IsEmployer]

    def perform_create(self, serializer):
        serializer.save(employer=self.request.user.employerprofile)

# Employer: Update own internship
class InternshipUpdateView(generics.UpdateAPIView):
    queryset = Internship.objects.all()
    serializer_class = InternshipSerializer
    permission_classes = [IsAuthenticated, IsEmployer, IsOwnEmployerInternship]

# Employer: Delete own internship (soft delete)
class InternshipDeleteView(generics.DestroyAPIView):
    queryset = Internship.objects.all()
    serializer_class = InternshipSerializer
    permission_classes = [IsAuthenticated, IsEmployer, IsOwnEmployerInternship]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

# Public: Search only institution-verified internships
class PublicInternshipSearchView(generics.ListAPIView):
    queryset = Internship.objects.filter(is_active=True, is_verified_by_institution=True)
    serializer_class = InternshipSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['location', 'is_paid', 'employer']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-created_at']
    permission_classes = []  # Public

# Institution admin: Verify internship
class InternshipVerifyView(generics.UpdateAPIView):
    queryset = Internship.objects.all()
    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        internship = self.get_object()
        user = request.user
        if not hasattr(user, 'institution_profile'):
            return Response({'detail': 'Only institution admins can verify.'}, status=status.HTTP_403_FORBIDDEN)
        internship.is_verified_by_institution = True
        internship.verified_by = user.institution_profile
        internship.verification_date = timezone.now()
        internship.save()
        return Response(self.get_serializer(internship).data)
