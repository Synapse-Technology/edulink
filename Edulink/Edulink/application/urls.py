from django.urls import path
from . import views

urlpatterns = [
    # Example path — make sure this matches a real view
    path('', views.list_internships, name='internship_list'),
]
