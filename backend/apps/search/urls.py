from django.urls import path
from .views import CounsellorSearchView , list_availability, list_specializations
urlpatterns = [
    path("counsellors/", CounsellorSearchView.as_view(), name="search-counsellors"),
    path("specializations/", list_specializations, name="specializations-list"),
    path("availability/", list_availability, name="availability-list"),
]
