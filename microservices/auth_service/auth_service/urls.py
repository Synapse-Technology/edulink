from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .health import health_check, readiness_check

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/security/', include('security.urls')),
    
    # Service discovery health checks
    path('health/', health_check, name='health_check'),
    path('ready/', readiness_check, name='readiness_check'),
    # path('monitoring/', include('shared.monitoring.urls')),  # Commented out - shared module not available
]

# Serve static files during development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)