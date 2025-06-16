from django.urls import path

from .views import CreateInstitutionView, InstitutionDetailView, VerifyInstitutionView

urlpatterns = [
    path('create/', CreateInstitutionView.as_view(), name='create-institution'),
    path('detail/<uuid:pk>/', InstitutionDetailView.as_view(), name='institution-detail'),
    path('verify/<uuid:pk>/', VerifyInstitutionView.as_view(), name='verify-institution'),
]