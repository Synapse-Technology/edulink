from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from users.models.institution_profile import InstitutionProfile
from users.serializers.institution_serializers import InstitutionProfileSerializer
from users.models.student_profile import StudentProfile
from users.serializers.student_serializer import StudentProfileSerializer
from application.models import Application
from application.serializers import ApplicationSerializer, ApplicationStatusUpdateSerializer
from .permissions import IsInstitutionAdmin

class InstitutionProfileDetailView(generics.RetrieveUpdateAPIView):
    """
    View and update the profile for the currently authenticated institution admin.
    """
    serializer_class = InstitutionProfileSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def get_object(self):
        return self.request.user.institution_profile

class InstitutionStudentListView(generics.ListAPIView):
    """
    List all students associated with the institution of the authenticated admin.
    """
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def get_queryset(self):
        institution = self.request.user.institution_profile.institution
        return StudentProfile.objects.filter(institution=institution)

class InstitutionApplicationListView(generics.ListAPIView):
    """
    List all internship applications from students of the authenticated admin's institution.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def get_queryset(self):
        institution = self.request.user.institution_profile.institution
        return Application.objects.filter(student__institution=institution)

class ApplicationStatusUpdateView(generics.UpdateAPIView):
    """
    Approve or reject a specific internship application.
    Accessible only by the institution admin to which the student applicant belongs.
    """
    serializer_class = ApplicationStatusUpdateSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]
    lookup_field = 'id'

    def get_queryset(self):
        """
        Ensure that the admin can only update applications from their own institution.
        """
        institution = self.request.user.institution_profile.institution
        return Application.objects.filter(student__institution=institution)
