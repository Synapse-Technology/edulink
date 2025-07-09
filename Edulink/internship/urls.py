from django.urls import path
from internship.views.internship_views import (
    InternshipListView,
    InternshipDetailView,
    InternshipCreateView,
    InternshipUpdateView,
    InternshipDeleteView,
    InternshipFlagView,
    AdminInternshipListView,
    AdminInternshipReviewView,
    SkillTagListView,
)

app_name = 'internship'

urlpatterns = [
    path('', InternshipListView.as_view(), name='internship-list'),
    path('<int:pk>/', InternshipDetailView.as_view(), name='internship-detail'),
    path('create/', InternshipCreateView.as_view(), name='internship-create'),
    path('<int:pk>/update/', InternshipUpdateView.as_view(), name='internship-update'),
    path('<int:pk>/delete/', InternshipDeleteView.as_view(), name='internship-delete'),
    path('<int:pk>/flag/', InternshipFlagView.as_view(), name='internship-flag'),
    path('admin/', AdminInternshipListView.as_view(), name='admin-internship-list'),
    path('admin/<int:pk>/review/', AdminInternshipReviewView.as_view(), name='admin-internship-review'),
    path('skill-tags/', SkillTagListView.as_view(), name='skill-tag-list'),
]
