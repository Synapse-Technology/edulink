from django.urls import path
from internship.views.internship_views import (
    InternshipListView,
    InternshipDetailView,
    InternshipCreateView,
    InternshipUpdateView,
    InternshipDeleteView,
    EmployerInternshipListView,
    InternshipVerificationView,
    SkillTagListView,
    InternshipSearchView,
    InternshipAnalyticsView,
)
from .views.external_opportunity_views import (
    ExternalOpportunityListView,
    ExternalOpportunityDetailView,
    ExternalSourceListView,
    AttributionStylesView,
    ComplianceReportView,
    track_external_click,
)

app_name = 'internship'

urlpatterns = [
    # Internship endpoints
    path('', InternshipListView.as_view(), name='internship-list'),
    path('create/', InternshipCreateView.as_view(), name='internship-create'),
    path('<int:pk>/', InternshipDetailView.as_view(), name='internship-detail'),
    path('<int:pk>/update/', InternshipUpdateView.as_view(), name='internship-update'),
    path('<int:pk>/delete/', InternshipDeleteView.as_view(), name='internship-delete'),
    path('<int:pk>/verify/', InternshipVerificationView.as_view(), name='internship-verify'),

    # Employer-specific endpoints
    path('my-internships/', EmployerInternshipListView.as_view(), name='employer-internships'),

    # Search and filtering
    path('search/', InternshipSearchView.as_view(), name='internship-search'),
    path('skill-tags/', SkillTagListView.as_view(), name='skill-tags'),
    path('analytics/', InternshipAnalyticsView.as_view(), name='internship-analytics'),
    
    # External opportunities
    path('external/', ExternalOpportunityListView.as_view(), name='external-opportunities-list'),
    path('external/<int:pk>/', ExternalOpportunityDetailView.as_view(), name='external-opportunity-detail'),
    path('external/track-click/', track_external_click, name='track-external-click'),
    
    # External sources management
    path('external/sources/', ExternalSourceListView.as_view(), name='external-sources-list'),
    path('external/sources/<int:source_id>/compliance/', ComplianceReportView.as_view(), name='source-compliance-report'),
    path('external/compliance/', ComplianceReportView.as_view(), name='compliance-report'),
    
    # Attribution and styling
    path('external/attribution/styles/', AttributionStylesView.as_view(), name='attribution-styles'),
]
