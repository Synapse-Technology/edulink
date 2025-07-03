from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from users.models.student_profile import StudentProfile
from users.serializers.student_serializer import StudentProfileSerializer
from internship.models.application import Application
from notifications.models import Notification
from django.db import models
from .serializers import StudentDashboardSerializer

# Create your views here.

class StudentDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            student_profile = user.studentprofile
        except StudentProfile.DoesNotExist:
            return Response({"detail": "Student profile not found."}, status=status.HTTP_404_NOT_FOUND)

        # Application stats
        applications = Application.objects.filter(student=student_profile)
        total_applications = applications.count()
        status_counts = applications.values('status').order_by('status').annotate(count=models.Count('status'))
        status_dict = {item['status']: item['count'] for item in status_counts}
        recent_applications = applications.order_by('-application_date')[:5]
        recent_applications_data = [
            {
                'id': app.id,
                'internship_title': app.internship.title,
                'status': app.status,
                'applied_on': app.application_date,
            }
            for app in recent_applications
        ]

        # Unread notifications
        unread_notifications = Notification.objects.filter(user=user, is_read=False).count()

        # Profile completeness (simple check)
        required_fields = ['first_name', 'last_name', 'phone_number', 'national_id', 'registration_number', 'academic_year', 'institution', 'course']
        profile_data = StudentProfileSerializer(student_profile).data
        incomplete_fields = [field for field in required_fields if not profile_data.get(field)]
        profile_complete = len(incomplete_fields) == 0

        dashboard_data = {
            'total_applications': total_applications,
            'application_status_counts': status_dict,
            'recent_applications': recent_applications_data,
            'unread_notifications': unread_notifications,
            'profile_complete': profile_complete,
            'incomplete_fields': incomplete_fields,
        }
        serializer = StudentDashboardSerializer(dashboard_data)
        return Response(serializer.data)
