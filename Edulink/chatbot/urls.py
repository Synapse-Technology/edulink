from django.urls import path
from .views import edi_chat

urlpatterns = [
    path('api/edi/', edi_chat, name='edi_chat'),
] 