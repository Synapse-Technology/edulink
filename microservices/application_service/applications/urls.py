from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ApplicationViewSet,
    ApplicationDocumentViewSet,
    SupervisorFeedbackViewSet,
    ApplicationNoteViewSet
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'applications', ApplicationViewSet, basename='application')
router.register(r'documents', ApplicationDocumentViewSet, basename='applicationdocument')
router.register(r'feedback', SupervisorFeedbackViewSet, basename='supervisorfeedback')
router.register(r'notes', ApplicationNoteViewSet, basename='applicationnote')

# URL patterns
urlpatterns = [
    # API endpoints
    path('api/v1/', include(router.urls)),
    
    # Additional custom endpoints
    path('api/v1/applications/<int:pk>/status/', 
         ApplicationViewSet.as_view({'patch': 'update_status'}), 
         name='application-update-status'),
    
    path('api/v1/applications/<int:pk>/interview/', 
         ApplicationViewSet.as_view({'post': 'schedule_interview'}), 
         name='application-schedule-interview'),
    
    path('api/v1/applications/<int:pk>/withdraw/', 
         ApplicationViewSet.as_view({'post': 'withdraw'}), 
         name='application-withdraw'),
    
    path('api/v1/applications/my/', 
         ApplicationViewSet.as_view({'get': 'my_applications'}), 
         name='my-applications'),
    
    path('api/v1/applications/employer/', 
         ApplicationViewSet.as_view({'get': 'employer_applications'}), 
         name='employer-applications'),
    
    path('api/v1/applications/stats/', 
         ApplicationViewSet.as_view({'get': 'stats'}), 
         name='application-stats'),
]

# App name for namespacing
app_name = 'applications'