from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from internship.models.internship import Internship
from internship.serializers.internship_serializers import InternshipSerializer

class InternshipListView(generics.ListAPIView):
    queryset = Internship.objects.filter(is_active=True)
    serializer_class = InternshipSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['location', 'is_paid', 'employer']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-created_at']

class InternshipDetailView(generics.RetrieveAPIView):
    queryset = Internship.objects.filter(is_active=True)
    serializer_class = InternshipSerializer

class InternshipCreateView(generics.CreateAPIView):
    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Only allow employers to create internships
        user = self.request.user
        if not hasattr(user, 'employer_profile'):
            raise permissions.PermissionDenied('Only employers can create internships.')
        serializer.save(employer=user.employer_profile)

class InternshipUpdateView(generics.UpdateAPIView):
    queryset = Internship.objects.all()
    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        user = self.request.user
        internship = self.get_object()
        if internship.employer != user.employer_profile:
            raise permissions.PermissionDenied('You can only update your own internships.')
        serializer.save()

class InternshipDeleteView(generics.DestroyAPIView):
    queryset = Internship.objects.all()
    serializer_class = InternshipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        user = self.request.user
        if instance.employer != user.employer_profile:
            raise permissions.PermissionDenied('You can only delete your own internships.')
        instance.is_active = False
        instance.save()

class PublicInternshipSearchView(generics.ListAPIView):
    queryset = Internship.objects.filter(is_active=True, is_verified_by_institution=True)
    serializer_class = InternshipSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['location', 'is_paid', 'employer']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-created_at']
    permission_classes = []  # Public

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
