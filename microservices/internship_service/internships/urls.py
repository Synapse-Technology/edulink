from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InternshipViewSet, SkillTagViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'internships', InternshipViewSet, basename='internship')
router.register(r'skill-tags', SkillTagViewSet, basename='skilltag')

# URL patterns
urlpatterns = [
    path('api/v1/', include(router.urls)),
]

# Named URL patterns for easier reference
app_name = 'internships'