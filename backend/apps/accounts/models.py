
import hashlib
import secrets
from datetime import timedelta
from decimal import Decimal
from typing import Optional

from django.conf import settings
from django.contrib.auth.models import (
    AbstractBaseUser, PermissionsMixin, BaseUserManager
)
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator, MinValueValidator
from django.db import models
from django.utils import timezone
import os



class UserManager(BaseUserManager):
    def create_user(self, email: str, password: Optional[str] = None, **extra_fields):
        """
        Create and save a regular user.
        New users default to is_active=False so they cannot log in until email verification.
        """
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", False)  # IMPORTANT: block login until verification
        user = self.model(email=email, **extra_fields)

        if password:
            user.set_password(password)  # this will save and set last_password_change
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)  # superusers active immediately

        if not password:
            raise ValueError("Superusers must have a password.")
        
        return self.create_user(email, password, **extra_fields)



class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model using email as the unique identifier.

    - is_active default is False: new users cannot log in until you set is_active=True
      (for example, after verifying email).
    - token_version & last_password_change are useful for invalidating JWTs (Simple JWT).
    """
    class Roles(models.TextChoices):
        CLIENT = "client", "Client"
        COUNSELLOR = "counsellor", "Counsellor"
        ADMIN = "admin", "Admin"

    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"
        PREFER_NOT = "prefer_not", "Prefer not to say"

    bio = models.TextField("bio", blank=True, null=True)
    gender = models.CharField("gender", max_length=20, choices=Gender.choices, blank=True, null=True)
    date_of_birth = models.DateField("date of birth", blank=True, null=True)

    email = models.EmailField("email address", unique=True, db_index=True)
    first_name = models.CharField("first name", max_length=150, blank=True)
    last_name = models.CharField("last name", max_length=150, blank=True)

    phone_regex = RegexValidator(regex=r'^\d{10}$', message="Phone number must be exactly 10 digits.")
    phone = models.CharField("phone number", validators=[phone_regex], max_length=10, blank=True, null=True , unique=True)

    role = models.CharField("role", max_length=20, choices=Roles.choices, default=Roles.CLIENT)

    is_staff = models.BooleanField("staff status", default=False)
    is_active = models.BooleanField("active", default=False)  # new users inactive by default
    email_verified = models.BooleanField("email verified", default=False)

    # Helpers for JWT invalidation strategies
    token_version = models.PositiveIntegerField("token version", default=0)
    last_password_change = models.DateTimeField("last password change", blank=True, null=True)

    profile_picture = models.URLField("profile picture URL", blank=True, null=True)
    date_joined = models.DateTimeField("date joined", default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["token_version"]),
        ]

    def __str__(self):
        return self.email

    def get_full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self) -> str:
        return self.first_name or self.email.split("@")[0]

    def set_password(self, raw_password):
        """
        Override to update last_password_change and persist immediately.
        This helps invalidate JWTs issued before this change.
        """
        super().set_password(raw_password)
        self.last_password_change = timezone.now()
        # Persist both password hash and timestamp
        # self.save(update_fields=["password", "last_password_change"])

    def increment_token_version(self):
        """
        Increment token_version to invalidate all previously issued JWTs that include this field.
        """
        self.token_version = (self.token_version or 0) + 1
        self.save(update_fields=["token_version"])
        return self.token_version

    # Optional helpers for simplejwt token blacklisting (if you use token_blacklist app)
    def blacklist_all_refresh_tokens(self) -> int:
        """
        Blacklist all outstanding refresh tokens for this user.
        Requires 'rest_framework_simplejwt.token_blacklist' in INSTALLED_APPS.
        Returns number of tokens blacklisted.
        """
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        except Exception as exc:
            raise RuntimeError(
                "simplejwt token_blacklist not installed. Add 'rest_framework_simplejwt.token_blacklist' to INSTALLED_APPS."
            ) from exc

        count = 0
        for ot in OutstandingToken.objects.filter(user=self):
            _, created = BlacklistedToken.objects.get_or_create(token=ot)
            if created:
                count += 1
        return count

    def revoke_refresh_token_by_jti(self, jti: str) -> bool:
        """
        Blacklist a single outstanding refresh token by its JTI. Returns True if blacklisted.
        """
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        except Exception as exc:
            raise RuntimeError(
                "simplejwt token_blacklist not installed. Add 'rest_framework_simplejwt.token_blacklist' to INSTALLED_APPS."
            ) from exc

        ot = OutstandingToken.objects.filter(user=self, jti=jti).first()
        if not ot:
            return False
        BlacklistedToken.objects.get_or_create(token=ot)
        return True



# Email verification (DB token, single-use)
class EmailVerificationToken(models.Model):
    """
    DB-backed single-use token for email verification.
    Store only token_hash (sha256) to avoid persisting raw tokens.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="email_tokens")
    token_hash = models.CharField(max_length=64, db_index=True)  # sha256 hex
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Email Verification Token"
        verbose_name_plural = "Email Verification Tokens"
        indexes = [
            models.Index(fields=["token_hash"]),
            models.Index(fields=["user"]),
        ]

    def set_raw_token(self, raw_token: str, ttl_hours: int = 24):
        """Set token_hash from raw token and set expiry."""
        self.token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        self.expires_at = timezone.now() + timedelta(hours=ttl_hours)

    def matches(self, raw_token: str) -> bool:
        return self.token_hash == hashlib.sha256(raw_token.encode()).hexdigest()

    def is_valid(self) -> bool:
        return (not self.used) and (self.expires_at > timezone.now())

    @staticmethod
    def generate_raw_token(nbytes: int = 32) -> str:
        """Return a cryptographically secure token for emailing to the user."""
        return secrets.token_urlsafe(nbytes)



# Option tables (flexible)
class Specialization(models.Model):
    """Specialization options (admin can add new rows later)."""
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = "Specialization"
        verbose_name_plural = "Specializations"
        ordering = ["name"]

    def __str__(self):
        return self.name


class AvailabilitySlot(models.Model):
    """Availability options (admin can add new rows later)."""
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = "Availability Slot"
        verbose_name_plural = "Availability Slots"
        ordering = ["name"]

    def __str__(self):
        return self.name


class UnavailableDate(models.Model):
    """Dates when a counsellor is unavailable."""
    counsellor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='unavailable_dates',
        limit_choices_to={'role': 'counsellor'}
    )
    date = models.DateField('unavailable date')
    reason = models.CharField(
        'reason',
        max_length=255,
        blank=True,
        null=True,
        help_text="Optional reason for unavailability (e.g., 'Holiday', 'Personal leave')"
    )
    created_at = models.DateTimeField('created at', auto_now_add=True)
    updated_at = models.DateTimeField('updated at', auto_now=True)

    class Meta:
        verbose_name = "Unavailable Date"
        verbose_name_plural = "Unavailable Dates"
        ordering = ["date"]
        unique_together = [['counsellor', 'date']]
        indexes = [
            models.Index(fields=['counsellor', 'date']),
        ]

    def __str__(self):
        return f"{self.counsellor.email} - {self.date} ({self.reason or 'Unavailable'})"



# Client profile
class ClientProfile(models.Model):
    """Profile for Client users. OneToOne to User."""
    class AgeGroup(models.TextChoices):
        UNDER_18 = "under_18", "Under 18"
        A18_25 = "18_25", "18-25"
        A26_40 = "26_40", "26-40"
        A41_60 = "41_60", "41-60"
        PLUS_60 = "60_plus", "+60"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="client_profile")
    age_group = models.CharField(max_length=20, choices=AgeGroup.choices, blank=True, null=True)
    agreed_terms = models.BooleanField(default=False)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Client Profile"
        verbose_name_plural = "Client Profiles"

    def clean(self):
        # role enforcement and terms acceptance
        if self.user and self.user.role != self.user.Roles.CLIENT:
            raise ValidationError("User role must be 'client' for ClientProfile.")
        if not self.agreed_terms:
            raise ValidationError("User must accept terms and conditions.")



def counsellor_license_upload_path(instance, filename):
    """
    Generate upload path for counsellor license documents.
    Format: licenses/{counsellor_name}_{email}/{filename}
    """
    # Get the user's full name or email as fallback
    user = instance.user
    name_part = user.get_full_name().strip() or user.email.split('@')[0]
    # Sanitize name for filesystem (remove special chars, replace spaces with underscores)
    name_part = "".join(c for c in name_part if c.isalnum() or c in (' ', '-', '_')).strip()
    name_part = name_part.replace(' ', '_')
    email_part = user.email.split('@')[0]  # Use email prefix
    folder_name = f"{name_part}_{email_part}"
    # Get file extension
    ext = os.path.splitext(filename)[1]
    # Create a safe filename
    safe_filename = f"license{ext}"
    return os.path.join('licenses', folder_name, safe_filename)


# Counsellor profile
class CounsellorProfile(models.Model):
    """Profile for Counsellor users. Holds counsellor-specific fields."""
    LICENSE_REGEX = RegexValidator(
        regex=r'^[A-Za-z0-9\-\/]{4,30}$',
        message="License number must be 4-30 chars; letters, digits, '-', '/' allowed."
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="counsellor_profile")
    license_number = models.CharField(max_length=30, validators=[LICENSE_REGEX], unique=True)
    license_document = models.FileField(
        "license document",
        upload_to=counsellor_license_upload_path,
        blank=True,
        null=True,
        help_text="Upload your professional license document (PDF or Image)"
    )
    specializations = models.ManyToManyField(Specialization, related_name="counsellors")
    fees_per_session = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))]
    )
    availability = models.ManyToManyField(AvailabilitySlot, blank=True, related_name="counsellors")
    bio = models.TextField("bio", blank=True, null=True)

    experience = models.TextField(
        "experience",
        blank=True,
        null=True,
        help_text="Free-form experience description (e.g. '10 years in CBT, special focus on anxiety')"
    )

    is_verified_professional = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)  # 🔥 NEW FIELD

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Counsellor Profile"
        verbose_name_plural = "Counsellor Profiles"
        ordering = ["-created_at"]

    def clean(self):
        # role enforcement and basic validations
        if self.user and self.user.role != self.user.Roles.COUNSELLOR:
            raise ValidationError("User role must be 'counsellor' for CounsellorProfile.")
        if not self.license_number:
            raise ValidationError({"license_number": "License number is required."})
        if self.fees_per_session is not None and self.fees_per_session < 0:
            raise ValidationError({"fees_per_session": "Fees must be zero or positive."})

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.email} — Counsellor"
