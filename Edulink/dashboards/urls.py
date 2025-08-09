from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'achievements', views.AchievementViewSet, basename='achievement')
router.register(r'calendar-events', views.CalendarEventViewSet, basename='calendar-event')

urlpatterns = [
    # Dashboard overview (this will serve as the main student dashboard)
    path('student/', views.DashboardOverviewView.as_view(), name='student-dashboard'),
    path('overview/', views.DashboardOverviewView.as_view(), name='dashboard-overview'),
    
    # Progress tracking
    path('progress/', views.InternshipProgressView.as_view(), name='internship-progress'),
    path('progress/update/', views.ProgressUpdateView.as_view(), name='progress-update'),
    
    # Analytics
    path('analytics/', views.AnalyticsDashboardView.as_view(), name='analytics-dashboard'),
    path('analytics/events/', views.AnalyticsEventView.as_view(), name='analytics-events'),
    
    # Router endpoints for achievements and calendar-events
    path('', include(router.urls)),
    
    # Insights
    path('insights/', views.DashboardInsightView.as_view(), name='dashboard-insights'),
    path('insights/<int:pk>/mark-read/', views.DashboardInsightView.as_view(), name='insight-mark-read'),
    path('insights/<int:pk>/mark-actioned/', views.DashboardInsightView.as_view(), name='insight-mark-actioned'),
]
