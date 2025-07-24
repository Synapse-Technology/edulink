from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Application
from .serializers import (
    ApplicationSerializer,
    ApplicationCreateSerializer,
    SupervisorFeedbackSerializer,
    ApplicationStatusUpdateSerializer,
    ApplicationListSerializer,
    ApplicationStatisticsSerializer,
)
from internship.models.internship import Internship


class ApplyToInternshipView(generics.CreateAPIView):
    serializer_class = ApplicationCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

    def create(self, request, *args, **kwargs):
        internship = get_object_or_404(Internship, pk=request.data.get("internship_id"))
        # type: ignore[attr-defined]
        if Application.objects.filter(
            student=request.user, internship=internship
        ).exists():
            return Response(
                {"detail": "You have already applied to this internship."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)


class StudentApplicationListView(generics.ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Application.objects.filter(student=self.request.user)  # type: ignore[attr-defined]


class ApplicationDetailView(generics.RetrieveAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.all()  # type: ignore[attr-defined]


class SupervisorFeedbackView(generics.CreateAPIView):
    serializer_class = SupervisorFeedbackSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()


class EmployerApplicationListView(generics.ListAPIView):
    serializer_class = ApplicationListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not hasattr(user, "employer_profile"):
            return Application.objects.none()
        return Application.objects.filter(
            internship__employer=user.employer_profile  # type: ignore[attr-defined]
        )


class InternshipApplicationListView(generics.ListAPIView):
    serializer_class = ApplicationListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        internship_id = self.kwargs.get("internship_id")
        return Application.objects.filter(internship_id=internship_id)  # type: ignore[attr-defined]


class ApplicationStatusUpdateView(generics.UpdateAPIView):
    serializer_class = ApplicationStatusUpdateSerializer
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.all()  # type: ignore[attr-defined]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(
            {
                "message": "Application status updated",
                "application": ApplicationSerializer(instance).data,
            }
        )


class ApplicationWithdrawView(generics.UpdateAPIView):
    serializer_class = ApplicationStatusUpdateSerializer
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.all()  # type: ignore[attr-defined]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status in ["accepted", "rejected"]:
            return Response(
                {
                    "error": "Cannot withdraw an application that has been accepted or rejected"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.status = "withdrawn"
        instance.save()
        return Response(
            {
                "message": "Application withdrawn successfully",
                "application": ApplicationSerializer(instance).data,
            }
        )


class ApplicationStatisticsView(generics.GenericAPIView):
    serializer_class = ApplicationStatisticsSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if hasattr(request.user, "employer_profile"):
            applications = Application.objects.filter(
                internship__employer=request.user.employer_profile  # type: ignore[attr-defined]
            )  # type: ignore[attr-defined]
            stats = {
                "total_applications": applications.count(),
                "pending_applications": applications.filter(status="pending").count(),
                "accepted_applications": applications.filter(status="accepted").count(),
                "rejected_applications": applications.filter(status="rejected").count(),
                "withdrawn_applications": applications.filter(
                    status="withdrawn"
                ).count(),
                # type: ignore[attr-defined]
                "total_internships": Internship.objects.filter(
                    employer=request.user.employer_profile  # type: ignore[attr-defined]
                ).count(),
                # type: ignore[attr-defined]
                "verified_internships": Internship.objects.filter(
                    employer=request.user.employer_profile, is_verified=True  # type: ignore[attr-defined]
                ).count(),
            }
        elif hasattr(request.user, "student_profile"):
            applications = Application.objects.filter(
                student=request.user.student_profile  # type: ignore[attr-defined]
            )  # type: ignore[attr-defined]
            stats = {
                "total_applications": applications.count(),
                "pending_applications": applications.filter(status="pending").count(),
                "accepted_applications": applications.filter(status="accepted").count(),
                "rejected_applications": applications.filter(status="rejected").count(),
                "withdrawn_applications": applications.filter(
                    status="withdrawn"
                ).count(),
            }
        else:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        return Response(stats)


class InstitutionApplicationListView(generics.ListAPIView):
    serializer_class = ApplicationListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, "institution_profile"):
            institution = self.request.user.institution_profile.institution  # type: ignore[attr-defined]
            return Application.objects.filter(student__institution=institution)  # type: ignore[attr-defined]
        return Application.objects.none()  # type: ignore[attr-defined]
