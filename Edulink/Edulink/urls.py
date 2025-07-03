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
# config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings

def test_auth(request):
    return JsonResponse({
        "user": str(request.user),
        "is_authenticated": request.user.is_authenticated,
        "auth_header": request.META.get("HTTP_AUTHORIZATION"),
        "auth_classes": str(settings.REST_FRAMEWORK.get('DEFAULT_AUTHENTICATION_CLASSES'))
    })

print("MAIN URLS LOADED")

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 🔑 Link your app's routes
    path('api/auth/', include('authentication.urls')),
    path('api/employers/', include('employers.urls')),
    path('api/users/', include('users.urls')),
    path('api/institutions/', include('institutions.urls')),
    path('api/security/', include('security.urls')),
    path('api/', include('internship.urls')),
    path('api/test-auth/', test_auth),
]
