from django.urls import path
from .views import CounsellorSearchView

urlpatterns = [
    path("counsellors/", CounsellorSearchView.as_view(), name="search-counsellors"),
]
