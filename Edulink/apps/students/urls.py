from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, StudentInstitutionAffiliationViewSet, StudentLoginView

router = DefaultRouter()
router.register(r'student-affiliations', StudentInstitutionAffiliationViewSet, basename='student-affiliation')
router.register(r'', StudentViewSet, basename='student')

urlpatterns = [
    path('auth/login/', StudentLoginView.as_view(), name='student-login'),
    path('', include(router.urls)),
]