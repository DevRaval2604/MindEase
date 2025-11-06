
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.utils import timezone
from django import forms

from .models import (
    ClientProfile,
    CounsellorProfile,
    Specialization,
    AvailabilitySlot,
    EmailVerificationToken,
)

User = get_user_model()


class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("email", "first_name", "last_name", "role")  # keep add form minimal

class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "role",
            "phone",
            "profile_picture",
            "bio",            
            "gender",         
            "date_of_birth",  
            "is_active",
            "is_staff",
            "email_verified",
        )


# Profile inlines
class ClientProfileInline(admin.StackedInline):
    model = ClientProfile
    can_delete = False
    verbose_name_plural = "Client profile"
    fk_name = "user"
    extra = 0
    readonly_fields = ("created_at", "updated_at")


class CounsellorProfileInline(admin.StackedInline):
    model = CounsellorProfile
    can_delete = False
    verbose_name_plural = "Counsellor profile"
    fk_name = "user"
    extra = 0
    filter_horizontal = ("specializations", "availability")
    readonly_fields = ("created_at", "updated_at")

    fields = (
        "license_number",
        "specializations",
        "fees_per_session",
        "availability",
        "experience",               
        "is_verified_professional",
        "created_at",
        "updated_at",
    )


# User admin
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    model = User

    # inlines allow editing related profile alongside the user
    inlines = (ClientProfileInline, CounsellorProfileInline)

    list_display = ("email", "first_name", "last_name", "role", "gender", "is_active", "email_verified", "is_staff", "date_joined")
    list_filter = ("role", "is_active", "is_staff", "email_verified" , "gender")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("-date_joined",)
    readonly_fields = ("date_joined",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "phone", "profile_picture", "bio", "gender","date_of_birth")}),
        ("Permissions", {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates / security", {"fields": ("date_joined", "last_login", "last_password_change", "token_version", "email_verified")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "first_name", "last_name", "role", "password1", "password2", "is_active" , "bio", "gender","date_of_birth"),
        }),
    )

    filter_horizontal = ("groups", "user_permissions")


# Option tables
@admin.register(Specialization)
class SpecializationAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


# Email verification tokens admin
@admin.action(description="Mark selected tokens as used")
def mark_tokens_used(modeladmin, request, queryset):
    updated = queryset.update(used=True)
    modeladmin.message_user(request, f"{updated} token(s) marked as used.")


@admin.action(description="Delete expired tokens")
def delete_expired_tokens(modeladmin, request, queryset):
    now = timezone.now()
    expired_qs = queryset.filter(expires_at__lt=now)
    count = expired_qs.count()
    expired_qs.delete()
    modeladmin.message_user(request, f"Deleted {count} expired token(s).")


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "expires_at", "used")
    list_filter = ("used", "expires_at")
    search_fields = ("user__email",)
    readonly_fields = ("token_hash", "created_at")
    actions = (mark_tokens_used, delete_expired_tokens)

    # show token hash but as readonly; don't allow editing critical fields in admin
    fieldsets = (
        (None, {
            "fields": ("user", "token_hash", "used")
        }),
        ("Timing", {
            "fields": ("created_at", "expires_at")
        }),
    )

    def get_queryset(self, request):
        # Keep default behaviour but prefetch user for better performance
        return super().get_queryset(request).select_related("user")
