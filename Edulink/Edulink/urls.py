"""
URL configuration for Edulink project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from monitoring.views import HealthCheckView

# Backend API-only URL patterns
urlpatterns = [
    path("admin/", admin.site.urls),
    # Health check endpoint for CI/CD and load balancers
    path("health/", HealthCheckView.as_view(), name='root_health_check'),
    # API endpoints only
    path("api/auth/", include("authentication.urls")),
    path("api/employers/", include("employers.urls")),
    path("api/users/", include("users.urls")),
    path("api/institutions/", include("institutions.urls")),
    path("api/security/", include("security.urls")),
    path("api/chatbot/", include("chatbot.urls")),
    path("api/internships/", include("internship.urls")),
    path("api/internship-progress/", include('internship_progress.urls')),
    path("api/notifications/", include("notifications.urls")),
    path("api/dashboards/", include("dashboards.urls")),
    path("api/application/", include("application.urls")),
    path("api/supervisors/", include("supervisors.urls")),
    path("api/monitoring/", include("monitoring.urls")),
]

# Static and media files serving (backend only)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
else:
    # Production: Serve only backend static files (Django admin, DRF, etc.)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
