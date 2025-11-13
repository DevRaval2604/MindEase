from django.contrib import admin
from .models import Resource

@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ("title", "description", "url" , "resource_type", "external", "created_at")
    list_filter = ("resource_type", "external")
    search_fields = ("title", "description", "url")
    readonly_fields = ("created_at",)
