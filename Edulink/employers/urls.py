from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployerProfileDetailView,
    EmployerInternshipListView,
    InternshipApplicationListView,
    CreateEmployerView,
    CompanySettingsViewSet,
    OpportunityImageViewSet,
    VisibilityControlViewSet,
    ApplicationRequirementViewSet,
    CustomApplicationQuestionViewSet,
    EnhancedInternshipCreateView
)

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'company-settings', CompanySettingsViewSet, basename='company-settings')
router.register(r'opportunity-images', OpportunityImageViewSet, basename='opportunity-images')
router.register(r'visibility-controls', VisibilityControlViewSet, basename='visibility-controls')
router.register(r'application-requirements', ApplicationRequirementViewSet, basename='application-requirements')
router.register(r'custom-questions', CustomApplicationQuestionViewSet, basename='custom-questions')

urlpatterns = [
    # Include router URLs for new enhanced features
    path('api/', include(router.urls)),
    
    # Enhanced views
    path('api/create/', CreateEmployerView.as_view(), name='create-employer'),
    path('api/internships/create-enhanced/', EnhancedInternshipCreateView.as_view(), name='create-enhanced-internship'),
    
    # Existing views
    path('profile/', EmployerProfileDetailView.as_view(), name='employer-profile'),
    path('my-internships/', EmployerInternshipListView.as_view(), name='employer-internships'),
    path('internship/<int:internship_id>/applicants/', InternshipApplicationListView.as_view(), name='internship-applicants'),
]
