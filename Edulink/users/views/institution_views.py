# users/views/institution_views.py

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models.institution_profile import InstitutionProfile
from users.serializers.institution_serializers import InstitutionProfileSerializer
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from authentication.permissions import IsInstitution
from users.models import StudentProfile
from users.serializers.student_serializer import StudentProfileSerializer

class InstitutionProfileDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = InstitutionProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        try:
            return InstitutionProfile.objects.get(user=self.request.user)
        except InstitutionProfile.DoesNotExist:
            return None

    def get(self, request, *args, **kwargs):
        profile = self.get_object()
        if profile is None:
            return Response(
                {"detail": "Your institution profile has not been created yet."},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        profile = self.get_object()
        if profile is None:
            return Response(
                {"detail": "Your institution profile has not been created yet."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

class InstitutionStudentsView(ListAPIView):
    """
    Allows an institution admin to view all students from their institution.
    """
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsInstitution]

    def get_queryset(self):
        institution = self.request.user.institutionprofile.institution
        return StudentProfile.objects.filter(institution=institution)

class InstitutionAnalyticsView(APIView):
    """
    Allows an institution admin to access analytics for their institution only.
    """
    permission_classes = [IsAuthenticated, IsInstitution]

    def get(self, request):
        institution = self.request.user.institutionprofile.institution
        total_students = institution.studentprofile_set.count()
        accepted_apps = institution.studentprofile_set.filter(application__status='accepted').distinct().count()
        placement_rate = (accepted_apps / total_students) * 100 if total_students else 0
        return Response({
            "total_students": total_students,
            "accepted_applications": accepted_apps,
            "placement_rate": placement_rate,
        })
