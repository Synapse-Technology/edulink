from django.urls import path
from .views import (
    InstitutionProfileDetailView,
    InstitutionStudentListView,
    InstitutionApplicationListView,
    ApplicationStatusUpdateView,
)

urlpatterns = [
    path('profile/', InstitutionProfileDetailView.as_view(), name='institution-profile'),
    path('my-students/', InstitutionStudentListView.as_view(), name='institution-students'),
    path('applications/', InstitutionApplicationListView.as_view(), name='institution-applications'),
    path('application/<int:id>/status/', ApplicationStatusUpdateView.as_view(), name='application-status-update'),
]
