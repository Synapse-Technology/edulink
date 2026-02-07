from django.urls import path
from . import views

urlpatterns = [
    path('', views.ContactSubmissionCreateView.as_view(), name='contact-submit'),
]
