# users/views/institution_views.py

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models.institution_profile import InstitutionProfile
from users.serializers.institution_serializers import InstitutionProfileSerializer


class InstitutionProfileDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = InstitutionProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        try:
            return InstitutionProfile.objects.get(user=self.request.user)  # type: ignore[attr-defined]
        except InstitutionProfile.DoesNotExist:  # type: ignore[attr-defined]
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
