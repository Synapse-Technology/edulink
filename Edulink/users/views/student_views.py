# users/views/student_views.py

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models.student_profile import StudentProfile
from users.serializers.student_serializer import StudentProfileSerializer


class StudentProfileDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        try:
            return self.request.user.studentprofile
        except StudentProfile.DoesNotExist:  # type: ignore[attr-defined]
            return None

    def get(self, request, *args, **kwargs):
        profile = self.get_object()
        if profile:
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        return Response(
            {"detail": "Student profile not found. Please complete your profile."},
            status=status.HTTP_404_NOT_FOUND
        )

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
