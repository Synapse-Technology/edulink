from rest_framework.generics import CreateAPIView, ListAPIView, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from authentication.permissions import IsStudent, IsEmployer, IsInstitution
from .models import Application, SupervisorFeedback
from .serializers import ApplicationSerializer, ApplicationStatusUpdateSerializer, SupervisorFeedbackSerializer
from users.models import StudentProfile
from users.serializers.student_serializer import StudentProfileSerializer

class ApplicationCreateView(CreateAPIView):
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user.student_profile)

class ApplicationHistoryView(ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return Application.objects.filter(student=self.request.user.student_profile)

class EmployerInternshipApplicationsView(ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsEmployer]

    def get_queryset(self):
        employer_profile = self.request.user.employerprofile
        return Application.objects.filter(internship__employer=employer_profile)

class EmployerUpdateApplicationView(UpdateAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsEmployer]

    def get_queryset(self):
        employer_profile = self.request.user.employerprofile
        return Application.objects.filter(internship__employer=employer_profile)

class EmployerApplicantProfilesView(ListAPIView):
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsEmployer]

    def get_queryset(self):
        employer_profile = self.request.user.employerprofile
        return StudentProfile.objects.filter(
            application__internship__employer=employer_profile
        ).distinct()

class InstitutionAcceptedApplicationsView(ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsInstitution]

    def get_queryset(self):
        institution = self.request.user.institutionprofile.institution
        return Application.objects.filter(
            student__institution=institution,
            status='accepted'
        )

class SupervisorFeedbackView(CreateAPIView):
    serializer_class = SupervisorFeedbackSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()
