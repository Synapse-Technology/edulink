from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.models.employer_profile import EmployerProfile
from users.serializers.employer_serializers import EmployerProfileSerializer
from internship.models.internship import Internship
from internship.models.application import Application
# from internship.serializers.internship_serializers import InternshipSerializer
from internship.serializers.application_serializers import ApplicationSerializer
from .permissions import IsEmployerOwner


class EmployerProfileDetailView(generics.RetrieveUpdateAPIView):
    """
    View and update the profile for the currently authenticated employer.
    """
    serializer_class = EmployerProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # The related name from the User model to EmployerProfile is 'employer_profile'
        return self.request.user.employer_profile

    def get(self, request, *args, **kwargs):
        profile = self.get_object()
        serializer = self.get_serializer(profile)
        return Response(serializer.data)


class EmployerInternshipListView(generics.ListAPIView):
    """
    List all internships posted by the currently authenticated employer.
    """
    #serializer_class = InternshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter internships based on the employer profile linked to the user
        return Internship.objects.filter(employer=self.request.user.employer_profile)


class InternshipApplicationListView(generics.ListAPIView):
    """
    List all applications for a specific internship owned by the employer.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsEmployerOwner]

    def get_queryset(self):
        internship_id = self.kwargs.get('internship_id')
        return Application.objects.filter(internship_id=internship_id)

# Create your views here.
