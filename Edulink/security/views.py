from django.shortcuts import render
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from .models import LoginHistory, SecurityLog
from .serializers import LoginHistorySerializer, SecurityLogSerializer

User = get_user_model()

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.META.get('REMOTE_ADDR')

# Example view to see login history for the logged-in user
class MyLoginHistoryView(generics.ListAPIView):
    queryset = LoginHistory.objects.all()
    serializer_class = LoginHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LoginHistory.objects.filter(user=self.request.user)
