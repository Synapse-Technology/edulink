"""
URL configuration for Edulink project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.static import serve
from django.urls import re_path

def health_check(request):
    return JsonResponse({"status": "healthy"})

def home_view(request):
    return JsonResponse({
        "message": "Welcome to Edulink API",
        "version": "1.0",
        "status": "active"
    })

urlpatterns = [
    path("", home_view, name="home"),
    path("health/", health_check, name="health_check"),
    path("admin/", admin.site.urls),
    # API Endpoints
    path("api/admin/", include("edulink.apps.platform_admin.urls")),
    path("api/auth/", include("edulink.apps.accounts.urls")),
    path("api/students/", include("edulink.apps.students.urls")),
    path("api/institutions/", include("edulink.apps.institutions.urls")),
    path("api/employers/", include("edulink.apps.employers.urls")),
    path("api/internships/", include("edulink.apps.internships.urls")),
    path("api/ledger/", include("edulink.apps.ledger.urls")),
    path("api/reports/", include("edulink.apps.reports.urls")),
    path("api/notifications/", include("edulink.apps.notifications.urls")),
    path("api/support/", include("edulink.apps.support.urls")),
    path("api/contact/", include("edulink.apps.contact.urls")),
]

# Serve media files in both development and production
# Note: In production, it's better to use a dedicated storage provider like Cloudinary or S3
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

