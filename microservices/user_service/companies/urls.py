from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, DepartmentViewSet, SupervisorViewSet

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'supervisors', SupervisorViewSet, basename='supervisor')

# The API URLs are now determined automatically by the router
urlpatterns = [
    path('api/', include(router.urls)),
]

app_name = 'companies'