from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Application, SupervisorFeedback
from .serializers import ApplicationSerializer, ApplicationCreateSerializer, SupervisorFeedbackSerializer
from internship.models import Internship

class ApplyToInternshipView(generics.CreateAPIView):
    serializer_class = ApplicationCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

    def create(self, request, *args, **kwargs):
        internship = get_object_or_404(Internship, pk=request.data.get('internship_id'))
        if Application.objects.filter(student=request.user, internship=internship).exists():
            return Response({'detail': 'You have already applied to this internship.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)

class StudentApplicationListView(generics.ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Application.objects.filter(student=self.request.user)

class ApplicationDetailView(generics.RetrieveAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.all()

class SupervisorFeedbackView(generics.CreateAPIView):
    serializer_class = SupervisorFeedbackSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()
