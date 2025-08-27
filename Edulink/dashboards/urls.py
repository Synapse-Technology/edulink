from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'achievements', views.AchievementViewSet, basename='achievement')
router.register(r'calendar-events', views.CalendarEventViewSet, basename='calendar-event')
router.register(r'workflow-templates', views.WorkflowTemplateViewSet, basename='workflow-template')
router.register(r'workflows', views.WorkflowViewSet, basename='workflow')
router.register(r'workflow-executions', views.WorkflowExecutionViewSet, basename='workflow-execution')

urlpatterns = [
    # Dashboard overview (this will serve as the main student dashboard)
    path('student/', views.DashboardOverviewView.as_view(), name='student-dashboard'),
    path('overview/', views.DashboardOverviewView.as_view(), name='dashboard-overview'),
    
    # Employer dashboard
    path('employer/', views.EmployerDashboardAPIView.as_view(), name='employer-dashboard'),
    path('employer/dashboard/', views.EmployerDashboardView.as_view(), name='employer-dashboard-view'),
    
    # Progress tracking
    path('progress/', views.InternshipProgressView.as_view(), name='internship-progress'),
    path('progress/update/', views.ProgressUpdateView.as_view(), name='progress-update'),
    
    # Analytics
    path('analytics/', views.AnalyticsDashboardView.as_view(), name='analytics-dashboard'),
    path('analytics/events/', views.AnalyticsEventView.as_view(), name='analytics-events'),
    path('analytics/employer/', views.EmployerAnalyticsAPIView.as_view(), name='employer-analytics'),
    path('analytics/workflows/', views.WorkflowAnalyticsAPIView.as_view(), name='workflow-analytics'),
    
    # Router endpoints for achievements and calendar-events
    path('', include(router.urls)),
    
    # Custom workflow endpoints to match frontend expectations
    path('workflows/employer/', views.WorkflowViewSet.as_view({'get': 'employer_workflows'}), name='workflow-employer-list'),
    path('workflows/employer/<int:pk>/', views.WorkflowViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='workflow-detail-employer'),
    path('workflows/employer/<int:pk>/toggle/', views.WorkflowViewSet.as_view({'post': 'toggle_status'}), name='workflow-toggle-employer'),
    path('workflows/employer/<int:pk>/execute/', views.WorkflowViewSet.as_view({'post': 'execute'}), name='workflow-execute-employer'),
    path('workflows/templates/', views.WorkflowViewSet.as_view({'get': 'workflow_templates'}), name='workflow-templates-list'),
    path('workflows/templates/<int:pk>/', views.WorkflowTemplateViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='workflow-template-detail'),
    path('workflows/templates/<int:pk>/use/', views.WorkflowTemplateViewSet.as_view({'post': 'use_template'}), name='workflow-template-use'),
    path('workflows/analytics/employer/', views.WorkflowAnalyticsAPIView.as_view(), name='workflow-analytics-employer'),
    
    # Insights
    path('insights/', views.DashboardInsightView.as_view(), name='dashboard-insights'),
    path('insights/<int:pk>/mark-read/', views.DashboardInsightView.as_view(), name='insight-mark-read'),
    path('insights/<int:pk>/mark-actioned/', views.DashboardInsightView.as_view(), name='insight-mark-actioned'),
]
