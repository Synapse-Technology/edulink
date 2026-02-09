from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from .views import UserViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    # JWT Token endpoints
    path('token/', UserViewSet.as_view({'post': 'token_obtain_pair'}), name='token_obtain_pair'),
    path('token/refresh/', UserViewSet.as_view({'post': 'token_refresh'}), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]