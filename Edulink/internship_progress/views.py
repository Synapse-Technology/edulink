from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import LogbookEntry, SupervisorFeedback
from .serializers import LogbookEntrySerializer, SupervisorFeedbackSerializer
from users.models.student_profile import StudentProfile
from internship.models.internship import Internship
from rest_framework.exceptions import PermissionDenied

# Create your views here.

class IsStudentOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Students can only access their own logbook entries
        if request.method in permissions.SAFE_METHODS:
            return True
        return hasattr(request.user, 'student_profile') and obj.student.user == request.user

class IsSupervisorOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        # Supervisors (institution or company) or staff
        return (
            request.user.is_staff or
            hasattr(request.user, 'employerprofile') or
            hasattr(request.user, 'institutionprofile')
        )

class LogbookEntryListCreateView(generics.ListCreateAPIView):
    serializer_class = LogbookEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Students see their own logs; supervisors see logs for their students/interns
        user = self.request.user
        if hasattr(user, 'student_profile'):
            return LogbookEntry.objects.filter(student=user.student_profile)
        elif hasattr(user, 'employerprofile'):
            # Company supervisor: show logs for their interns
            return LogbookEntry.objects.filter(internship__employer=user.employerprofile)
        elif hasattr(user, 'institutionprofile'):
            # Institution supervisor: show logs for their students
            return LogbookEntry.objects.filter(student__institution=user.institutionprofile.institution)
        return LogbookEntry.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not hasattr(user, 'student_profile'):
            raise PermissionDenied("Only students can create logbook entries.")
        # Validate internship and week_number here
        internship = serializer.validated_data.get('internship')
        if not internship:
            raise PermissionDenied("Internship must be specified.")
        from application.models import Application
        has_accepted = Application.objects.filter(
            student=user.student_profile,
            internship=internship,
            status='accepted'
        ).exists()
        if not has_accepted:
            raise PermissionDenied("You must be placed/accepted in this internship to create a logbook entry.")
        serializer.save(student=user.student_profile)

class LogbookEntryRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = LogbookEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsStudentOrReadOnly]
    queryset = LogbookEntry.objects.all()

    def perform_update(self, serializer):
        user = self.request.user
        if not hasattr(user, 'student_profile') or serializer.instance.student.user != user:
            raise PermissionDenied("You can only update your own logbook entries.")
        serializer.save()

class SupervisorFeedbackCreateView(generics.CreateAPIView):
    serializer_class = SupervisorFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user
        log_entry = serializer.validated_data['log_entry']
        if hasattr(user, 'employerprofile'):
            serializer.save(company_supervisor=user.employerprofile)
        elif hasattr(user, 'institutionprofile'):
            serializer.save(institution_supervisor=user.institutionprofile)
        else:
            raise PermissionDenied("Only supervisors can add feedback.")

class SupervisorFeedbackListView(generics.ListAPIView):
    serializer_class = SupervisorFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrReadOnly]

    def get_queryset(self):
        log_entry_id = self.kwargs.get('log_entry_id')
        return SupervisorFeedback.objects.filter(log_entry_id=log_entry_id)
