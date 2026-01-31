from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InternshipViewSet, ApplicationViewSet

router = DefaultRouter()
router.register(r'applications', ApplicationViewSet, basename='application')
router.register(r'', InternshipViewSet, basename='internship')

urlpatterns = [
    path('', include(router.urls)),
]
