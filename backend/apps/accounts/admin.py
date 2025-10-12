from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin panel for managing User accounts."""

    # Columns shown in the user list
    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "email_verified",
        "is_staff",
        "date_joined",
    )
    list_filter = ("is_active", "is_staff", "email_verified", "role")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("-date_joined",)

    # Fields shown when editing/creating a user
    fieldsets = (
        ("Login Credentials", {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "phone", "profile_picture")}),
        ("Role & Permissions", {
            "fields": (
                "role",
                "is_active",
                "is_staff",
                "is_superuser",
                "email_verified",
                "groups",
                "user_permissions",
            )
        }),
        ("Security Info", {"fields": ("token_version", "last_password_change")}),
        ("Important Dates", {"fields": ("date_joined",)}),
    )

    # Fields when adding a new user via admin
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "role",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                    "email_verified",
                ),
            },
        ),
    )

    readonly_fields = ("date_joined", "last_password_change")

    def save_model(self, request, obj, form, change):
        """
        Override save_model to update 'last_password_change' when the password is changed via admin.
        """
        if change:
            old_obj = User.objects.get(pk=obj.pk)
            if obj.password != old_obj.password:
                obj.last_password_change = timezone.now()
        super().save_model(request, obj, form, change)
