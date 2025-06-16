
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import Institution
from .serializers import InstitutionSerializer
from django.utils import timezone

class CreateInstitutionView(generics.CreateAPIView):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAuthenticated]  # Can tighten later if needed

class InstitutionDetailView(generics.RetrieveUpdateAPIView):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return Institution.objects.get(user=self.request.user)

class VerifyInstitutionView(generics.UpdateAPIView):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAdminUser]

    def patch(self, request, *args, **kwargs):
        institution = self.get_object()
        institution.is_verified = True
        institution.verified_at = timezone.now()
        institution.save()
        return Response(
            {"detail": "Institution verified successfully."},
            status=status.HTTP_200_OK
        )
