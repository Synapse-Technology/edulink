from rest_framework.generics import ListAPIView, RetrieveAPIView, CreateAPIView, UpdateAPIView, DestroyAPIView
from internship.models.internship import Internship
from internship.serializers.internship_serializers import InternshipSerializer
from authentication.permissions import IsEmployer, IsOwnEmployerInternship
from rest_framework.permissions import IsAuthenticated

class InternshipListView(ListAPIView):
    """
    Allows anyone to browse public internship listings.
    """
    queryset = Internship.objects.filter(is_active=True)
    serializer_class = InternshipSerializer
    permission_classes = []  # Public access

class InternshipDetailView(RetrieveAPIView):
    """
    Allows anyone to view details of a public internship.
    """
    queryset = Internship.objects.filter(is_active=True)
    serializer_class = InternshipSerializer
    permission_classes = []

class InternshipCreateView(CreateAPIView):
    """
    Allows an employer to create a new internship listing.
    """
    queryset = Internship.objects.all()
    serializer_class = InternshipSerializer
    permission_classes = [IsAuthenticated, IsEmployer]

    def perform_create(self, serializer):
        serializer.save(employer=self.request.user.employerprofile)

class InternshipUpdateView(UpdateAPIView):
    """
    Allows an employer to update their own internship listing.
    """
    queryset = Internship.objects.all()
    serializer_class = InternshipSerializer
    permission_classes = [IsAuthenticated, IsEmployer, IsOwnEmployerInternship]

class InternshipDeleteView(DestroyAPIView):
    """
    Allows an employer to delete their own internship listing.
    """
    queryset = Internship.objects.all()
    serializer_class = InternshipSerializer
    permission_classes = [IsAuthenticated, IsEmployer, IsOwnEmployerInternship]
