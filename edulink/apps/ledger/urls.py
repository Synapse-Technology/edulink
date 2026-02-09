from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LedgerEventViewSet

router = DefaultRouter()
router.register(r'events', LedgerEventViewSet, basename='ledger-event')

urlpatterns = [
    path('', include(router.urls)),
]