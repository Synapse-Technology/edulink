from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, StudentInstitutionAffiliationViewSet, StudentLoginView

router = DefaultRouter()
router.register(r'', StudentViewSet)
router.register(r'student-affiliations', StudentInstitutionAffiliationViewSet)

urlpatterns = [
    path('auth/login/', StudentLoginView.as_view(), name='student-login'),
    path('', include(router.urls)),
]