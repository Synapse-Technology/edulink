from rest_framework.generics import CreateAPIView, ListAPIView, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from authentication.permissions import IsStudent, IsEmployer, IsInstitution
from internship.models.application import Application
from internship.serializers.application_serializers import ApplicationSerializer
from users.models import StudentProfile
from users.serializers.student_serializer import StudentProfileSerializer

class ApplicationCreateView(CreateAPIView):
    """
    Allows a student to submit an application for an internship.
    The application is always linked to the current user.
    """
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user.student_profile)

class ApplicationHistoryView(ListAPIView):
    """
    Allows a student to view their own application history.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return Application.objects.filter(student=self.request.user.student_profile)

class EmployerInternshipApplicationsView(ListAPIView):
    """
    Allows an employer to view applications submitted to their internships only.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsEmployer]

    def get_queryset(self):
        employer_profile = self.request.user.employerprofile
        return Application.objects.filter(internship__employer=employer_profile)

class EmployerUpdateApplicationView(UpdateAPIView):
    """
    Allows an employer to update the status and notes of applications to their internships.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsEmployer]

    def get_queryset(self):
        employer_profile = self.request.user.employerprofile
        return Application.objects.filter(internship__employer=employer_profile)

class EmployerApplicantProfilesView(ListAPIView):
    """
    Allows an employer to view student profiles for applicants to their internships.
    """
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsEmployer]

    def get_queryset(self):
        employer_profile = self.request.user.employerprofile
        return StudentProfile.objects.filter(
            application__internship__employer=employer_profile
        ).distinct()

class InstitutionAcceptedApplicationsView(ListAPIView):
    """
    Allows an institution admin to see accepted applications for their students only.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsInstitution]

    def get_queryset(self):
        institution = self.request.user.institutionprofile.institution
        return Application.objects.filter(
            student__institution=institution,
            status='accepted'  # Adjust this to match your status field
        )
