from django.urls import path
from .views import edi_chat

urlpatterns = [
    path('edi/', edi_chat, name='edi_chat'),
]
