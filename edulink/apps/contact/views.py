from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .serializers import ContactSubmissionSerializer
from . import services

class ContactSubmissionCreateView(generics.CreateAPIView):
    """
    Public endpoint to submit the contact form.
    Orchestrates validation, service execution, and response.
    """
    serializer_class = ContactSubmissionSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def perform_create(self, serializer):
        # We call the service to handle business logic and side effects
        services.create_contact_submission(
            name=serializer.validated_data['name'],
            email=serializer.validated_data['email'],
            subject=serializer.validated_data['subject'],
            message=serializer.validated_data['message']
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"detail": "Your message has been sent successfully."},
            status=status.HTTP_201_CREATED
        )
