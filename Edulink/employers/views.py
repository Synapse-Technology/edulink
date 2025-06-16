from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from .models import Employer
from .serializers import EmployerSerializer

class CreateEmployerView(generics.CreateAPIView):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer
    permission_classes = [IsAuthenticated]

class EmployerDetailView(generics.RetrieveUpdateAPIView):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return Employer.objects.get(user=self.request.user)

class VerifyEmployerView(generics.UpdateAPIView):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer
    permission_classes = [IsAdminUser]

    def patch(self, request, *args, **kwargs):
        employer = self.get_object()
        employer.is_verified = True
        employer.verified_at = timezone.now()
        employer.save()
        return Response(
            {"detail": "Employer verified successfully."},
            status=status.HTTP_200_OK
        )


# Create your views here.
