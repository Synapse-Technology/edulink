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
from django.http import Http404, FileResponse
from django.views.generic import TemplateView
from monitoring.views import HealthCheckView
import os

# Custom view to serve frontend HTML files
def serve_frontend_file(request, filename):
    """Serve frontend HTML files from Edulink_website directory"""
    frontend_dir = os.path.join(settings.BASE_DIR.parent, 'Edulink_website')
    file_path = os.path.join(frontend_dir, filename)
    
    if os.path.exists(file_path) and filename.endswith('.html'):
        return FileResponse(open(file_path, 'rb'), content_type='text/html')
    else:
        raise Http404("Frontend file not found")

urlpatterns = [
    path("admin/", admin.site.urls),
    # Health check endpoint for CI/CD and load balancers
    path("health/", HealthCheckView.as_view(), name='root_health_check'),
    # 🔑 Link your app's routes
    path("api/auth/", include("authentication.urls")),
    path("api/employers/", include("employers.urls")),
    path("api/users/", include("users.urls")),
    path("api/institutions/", include("institutions.urls")),
    path("institutions/", include("institutions.urls", namespace='institutions_web')),
    path("api/security/", include("security.urls")),
    path("api/chatbot/", include("chatbot.urls")),
    path("api/internships/", include("internship.urls")),
    path("api/internship-progress/", include('internship_progress.urls')),
    path("api/notifications/", include("notifications.urls")),
    path("api/dashboards/", include("dashboards.urls")),
    path("api/application/", include("application.urls")),
    path("api/supervisors/", include("supervisors.urls")),
    path("api/monitoring/", include("monitoring.urls")),
    
    # Frontend root route
    path("", serve_frontend_file, {'filename': 'index.html'}, name='frontend-home'),
    
    # Clean URL routes (without .html extension)
    path("login/", serve_frontend_file, {'filename': 'login.html'}, name='frontend-login-clean'),
    path("register/", serve_frontend_file, {'filename': 'register.html'}, name='frontend-register-clean'),
    path("dashboard/", serve_frontend_file, {'filename': 'dashboards/student/student_dash.html'}, name='frontend-dashboard-clean'),
    path("about/", serve_frontend_file, {'filename': 'about.html'}, name='frontend-about-clean'),
    path("contact/", serve_frontend_file, {'filename': 'contact.html'}, name='frontend-contact-clean'),
    path("support/", serve_frontend_file, {'filename': 'support.html'}, name='frontend-support-clean'),
    path("policy/", serve_frontend_file, {'filename': 'policy.html'}, name='frontend-policy-clean'),
    path("search/", serve_frontend_file, {'filename': 'search.html'}, name='frontend-search-clean'),
    path("why-us/", serve_frontend_file, {'filename': 'why_us.html'}, name='frontend-why-us-clean'),
    
    # Frontend HTML file routes (legacy support)
    path("login.html", serve_frontend_file, {'filename': 'login.html'}, name='frontend-login'),
    path("register.html", serve_frontend_file, {'filename': 'register.html'}, name='frontend-register'),
    path("index.html", serve_frontend_file, {'filename': 'index.html'}, name='frontend-index'),
    path("dashboard.html", serve_frontend_file, {'filename': 'dashboards/student/student_dash.html'}, name='frontend-dashboard'),
    path("about.html", serve_frontend_file, {'filename': 'about.html'}, name='frontend-about'),
    path("contact.html", serve_frontend_file, {'filename': 'contact.html'}, name='frontend-contact'),
    path("support.html", serve_frontend_file, {'filename': 'support.html'}, name='frontend-support'),
    # Catch-all for other HTML files
    path("<str:filename>", serve_frontend_file, name='frontend-file'),
]

# Static and media files serving
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
    # Serve assets directly from frontend directory
    urlpatterns += static('assets/', document_root=os.path.join(settings.BASE_DIR.parent, 'Edulink_website', 'assets'))
    # Serve JavaScript files from frontend directory
    urlpatterns += static('js/', document_root=os.path.join(settings.BASE_DIR.parent, 'Edulink_website', 'js'))
else:
    # Production: Serve frontend assets through static files
    urlpatterns += static('assets/', document_root=os.path.join(settings.BASE_DIR.parent, 'Edulink_website', 'assets'))
    urlpatterns += static('js/', document_root=os.path.join(settings.BASE_DIR.parent, 'Edulink_website', 'js'))
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
