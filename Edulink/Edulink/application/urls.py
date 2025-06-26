from django.urls import path
from .views import get_csrf_token, list_internships

urlpatterns = [
    path('', list_internships, name='internship_list'),
    path('csrf/', get_csrf_token, name='get-csrf-token'),
]