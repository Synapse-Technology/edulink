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
from django.http import FileResponse
import os

urlpatterns = [
    path("admin/", admin.site.urls),
    # 🔑 Link your app's routes
    path("api/auth/", include("authentication.urls")),
    path("api/employers/", include("employers.urls")),
    path("api/users/", include("users.urls")),
    path("api/institutions/", include("institutions.urls")),
    path("api/security/", include("security.urls")),
    path("", include("chatbot.urls")),
    path("api/internships/", include("internship.urls")),
    path("api/internship-progress/", include('internship_progress.urls')),
    path("api/notifications/", include("notifications.urls")),
    path("api/dashboards/", include("dashboards.urls")),
    path("api/application/", include("application.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
