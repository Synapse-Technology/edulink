# users/views/student_views.py

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models.student_profile import StudentProfile
from users.serializers.student_serializer import StudentProfileSerializer
from authentication.permissions import IsOwnStudentProfile, IsStudent
from internship.models.application import Application
from internship.serializers.application_serializers import ApplicationSerializer

class StudentProfileDetailView(generics.RetrieveUpdateAPIView):
    """
    Allows a student to view and update only their own profile.
    """
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsOwnStudentProfile]

    def get_object(self):
        return StudentProfile.objects.get(user=self.request.user)

    def get(self, request, *args, **kwargs):
        import traceback
        try:
            profile = self.get_object()
            if profile:
                serializer = self.get_serializer(profile)
                return Response(serializer.data)
            return Response(
                {"detail": "Student profile not found. Please complete your profile."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print("DEBUG ERROR in StudentProfileDetailView.get:", e)
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)

    def put(self, request, *args, **kwargs):
        profile = self.get_object()
        if profile:
            serializer = self.get_serializer(profile, data=request.data, partial=True)
        else:
            # Create new profile if it doesn't exist
            serializer = self.get_serializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data)

class ApplicationCreateView(generics.CreateAPIView):
    """
    Allows a student to submit an application for an internship.
    The application is always linked to the current user.
    """
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user.studentprofile)

class ApplicationHistoryView(generics.ListAPIView):
    """
    Allows a student to view their own application history.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return Application.objects.filter(student=self.request.user.studentprofile)
