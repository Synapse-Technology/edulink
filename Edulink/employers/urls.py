from django.urls import path
from employers.views import CreateEmployerView, EmployerDetailView, VerifyEmployerView

urlpatterns = [
    path('', CreateEmployerView.as_view(), name='create-employer'),
    path('detail/<uuid:pk>/', EmployerDetailView.as_view(), name='employer-detail'),
    path('<uuid:pk>/verify/', VerifyEmployerView.as_view(), name='verify-employer'),
]
 