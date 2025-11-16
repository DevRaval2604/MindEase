
from django.contrib import admin
from django.urls import path , include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")), # All Authentication Api
    path("api/resources/", include("apps.resources.urls")), # Resources API
    path("api/search/", include("apps.search.urls")), # Search API
    path("api/appointments/", include("apps.appointments.urls")), # Appointments API

]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

