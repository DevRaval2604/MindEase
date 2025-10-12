
from typing import Optional
from django.db import models
from django.contrib.auth.models import (AbstractBaseUser, PermissionsMixin, BaseUserManager)
from django.utils import timezone
from django.core.validators import RegexValidator


class UserManager(BaseUserManager):
    def create_user(self, email: str, password: Optional[str] = None, **extra_fields):
        """
        Create and save a regular user with the given email and password.
        """
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if not password:
            raise ValueError("Superusers must have a password.")
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    User model with helper methods for refresh-token blacklisting.

    Security features:
    - email as unique identifier
    - last_password_change timestamp to reject old tokens
    - token_version to invalidate all tokens for the user at once
    - helper methods to blacklist refresh tokens via simplejwt token_blacklist models
    """

    class Roles(models.TextChoices):
        CLIENT = "client", "Client"
        # KID = "kid", "Kid"
        # TEEN = "teen", "Teen"
        # ADULT = "adult", "Adult"
        # PARENT = "parent", "Parent"
        COUNSELLOR = "counsellor", "Counsellor"
        ADMIN = "admin", "Admin"

    email = models.EmailField("email address", unique=True, db_index=True)
    first_name = models.CharField("first name", max_length=150, blank=True)
    last_name = models.CharField("last name", max_length=150, blank=True)

    phone_regex = RegexValidator(
        regex=r'^\d{10}$',
        message="Phone number must be exactly 10 digits (e.g. 9876543210)."
    )

    phone = models.CharField("phone number", validators=[phone_regex], max_length=10, blank=True, null=True)

    role = models.CharField("role", max_length=20, choices=Roles.choices, default=Roles.CLIENT)

    is_staff = models.BooleanField("staff status", default=False)
    is_active = models.BooleanField("active", default=True)
    email_verified = models.BooleanField("email verified", default=False)

    # Security / invalidation helpers
    token_version = models.PositiveIntegerField(
        "token version", default=0,
        help_text="Increment to invalidate all tokens for this user."
    )
    
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
        Override to update last_password_change so tokens issued earlier can be invalidated.
        """
        super().set_password(raw_password)
        self.last_password_change = timezone.now()
        # persist password + timestamp immediately
        

    def increment_token_version(self):
        """
        Increment token_version to globally invalidate all issued tokens for this user.
        Useful for 'logout all sessions' or admin-forced invalidation.
        """
        self.token_version = (self.token_version or 0) + 1
        self.save(update_fields=["token_version"])

    def jwt_payload_extra(self) -> dict:
        """
        Return small dict to include in JWT claims:
          - tv: token_version
          - pwd_ts: timestamp of last password change (seconds since epoch)
          - role: user role
        Keep payload compact.
        """
        return {
            "tv": self.token_version,
            "pwd_ts": int(self.last_password_change.timestamp()) if self.last_password_change else 0,
            "role": self.role,
        }

    # --- Token blacklisting helpers (uses simplejwt's token_blacklist models) ---
    def blacklist_all_refresh_tokens(self) -> int:
        """
        Blacklist all outstanding refresh tokens for this user.
        Returns the number of tokens blacklisted.
        Requires 'rest_framework_simplejwt.token_blacklist' to be installed and migrated.
        """
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        except Exception as exc:
            raise RuntimeError(
                "Token blacklist models not available. Ensure 'rest_framework_simplejwt.token_blacklist' is in INSTALLED_APPS and migrations applied."
            ) from exc

        count = 0
        outstanding_qs = OutstandingToken.objects.filter(user=self)
        for ot in outstanding_qs:
            _, created = BlacklistedToken.objects.get_or_create(token=ot)
            if created:
                count += 1
        return count

    def revoke_refresh_token(self, jti: str) -> bool:
        """
        Revoke (blacklist) a single refresh token by its JTI.
        Returns True if the token was found and blacklisted, False otherwise.
        """
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        except Exception:
            raise RuntimeError(
                "Token blacklist models not available. Ensure 'rest_framework_simplejwt.token_blacklist' is in INSTALLED_APPS and migrations applied."
            )

        ot = OutstandingToken.objects.filter(user=self, jti=jti).first()
        if ot is None:
            return False
        BlacklistedToken.objects.get_or_create(token=ot)
        return True

    def is_refresh_token_blacklisted(self, jti: str) -> bool:
        """
        Check whether a refresh token (by JTI) is blacklisted.
        """
        try:
            from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
        except Exception:
            raise RuntimeError(
                "Token blacklist models not available. Ensure 'rest_framework_simplejwt.token_blacklist' is in INSTALLED_APPS and migrations applied."
            )
        return BlacklistedToken.objects.filter(token__jti=jti).exists()
