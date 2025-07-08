# users/views/admin_views.py

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser

from users.models.institution_profile import InstitutionProfile
from users.models.employer_profile import EmployerProfile
from users.serializers.institution_serializers import InstitutionProfileSerializer
from users.serializers.employer_serializers import EmployerProfileSerializer


class CreateInstitutionProfileView(generics.CreateAPIView):
    serializer_class = InstitutionProfileSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        user_id = request.data.get("user")
        if not user_id:
            return Response({"detail": "User ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        if InstitutionProfile.objects.filter(user_id=user_id).exists():  # type: ignore[attr-defined]
            return Response({"detail": "Institution profile already exists for this user."}, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)


class CreateEmployerProfileView(generics.CreateAPIView):
    serializer_class = EmployerProfileSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        user_id = request.data.get("user")
        if not user_id:
            return Response({"detail": "User ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        if EmployerProfile.objects.filter(user_id=user_id).exists():  # type: ignore[attr-defined]
            return Response({"detail": "Employer profile already exists for this user."}, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)
