from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from .health import health_check, readiness_check

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Service discovery health checks
    path('health/', health_check, name='health_check'),
    path('ready/', readiness_check, name='readiness_check'),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API endpoints
    path('api/v1/profiles/', include('profiles.urls')),
    path('api/v1/roles/', include('roles.urls')),
    path('api/v1/institutions/', include('institutions.urls')),
    path('api/v1/companies/', include('companies.urls')),
    path('api/v1/events/', include('events.urls')),
    # path('monitoring/', include('shared.monitoring.urls')),  # Commented out - shared module not available
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)