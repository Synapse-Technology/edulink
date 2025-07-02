from django.urls import path
from internship.views.internship_views import (
    InternshipListView,
    InternshipDetailView,
    InternshipCreateView,
    InternshipUpdateView,
    InternshipDeleteView,
    PublicInternshipSearchView,
    InternshipVerifyView,
)

urlpatterns = [
    path('', InternshipListView.as_view(), name='internship-list'),
    path('<int:pk>/', InternshipDetailView.as_view(), name='internship-detail'),
    path('create/', InternshipCreateView.as_view(), name='internship-create'),
    path('<int:pk>/update/', InternshipUpdateView.as_view(), name='internship-update'),
    path('<int:pk>/delete/', InternshipDeleteView.as_view(), name='internship-delete'),
    path('public-search/', PublicInternshipSearchView.as_view(), name='public-internship-search'),
    path('<int:pk>/verify/', InternshipVerifyView.as_view(), name='internship-verify'),
]
