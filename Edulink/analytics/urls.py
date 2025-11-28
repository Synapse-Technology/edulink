from django.urls import path
from .views import (
    RealTimeMetricsAPIView,
    ComprehensiveReportAPIView,
    TrendAnalysisAPIView,
    PerformanceAlertsAPIView,
    UserActivityTrackingView,
    CacheInvalidationAPIView,
    GenerateReportAPIView,
    ReportDetailAPIView,
    ReportDownloadAPIView,
    ReportsListAPIView
)

app_name = 'analytics'

urlpatterns = [
    # Real-time metrics endpoints
    path('metrics/realtime/', RealTimeMetricsAPIView.as_view(), name='realtime_metrics'),
    path('reports/comprehensive/', ComprehensiveReportAPIView.as_view(), name='comprehensive_report'),
    path('analysis/trends/', TrendAnalysisAPIView.as_view(), name='trend_analysis'),
    
    # Performance alerts
    path('alerts/', PerformanceAlertsAPIView.as_view(), name='performance_alerts'),
    path('alerts/<int:alert_id>/resolve/', PerformanceAlertsAPIView.as_view(), name='resolve_alert'),
    
    # User activity tracking
    path('track/activity/', UserActivityTrackingView.as_view(), name='track_activity'),
    
    # Cache management
    path('cache/invalidate/', CacheInvalidationAPIView.as_view(), name='invalidate_cache'),
    
    # Report management endpoints
    path('reports/generate/', GenerateReportAPIView.as_view(), name='generate_report'),
    path('reports/', ReportsListAPIView.as_view(), name='reports_list'),
    path('reports/<uuid:report_id>/', ReportDetailAPIView.as_view(), name='report_detail'),
    path('reports/<uuid:report_id>/download/', ReportDownloadAPIView.as_view(), name='report_download'),
]