
from django.db import transaction, IntegrityError
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import (
    User,
    ClientProfile,
    CounsellorProfile,
    Specialization,
    AvailabilitySlot,
)


from django.contrib.auth import authenticate



class ClientSignupSerializer(serializers.Serializer):
    # Basic user fields
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True, max_length=10)

    # Passwords
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    # Account & client-specific fields
    account_type = serializers.ChoiceField(
        choices=[User.Roles.CLIENT, User.Roles.COUNSELLOR],
        default=User.Roles.CLIENT
    )
    age_group = serializers.ChoiceField(choices=ClientProfile.AgeGroup.choices, required=False, allow_null=True)
    agreed_terms = serializers.BooleanField()

    # Counsellor-specific fields (required only when account_type == counsellor)
    license_number = serializers.CharField(required=False, allow_blank=True, max_length=30)
    specializations = serializers.ListField(child=serializers.IntegerField(), required=False)
    fees_per_session = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    availability = serializers.ListField(child=serializers.IntegerField(), required=False)

    # This validate email 
    def validate_email(self, value: str) -> str:
        """Normalize and ensure email uniqueness (case-insensitive)."""
        value = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    # This validate phone number
    def validate_phone(self, value: str) -> str:
        """Ensure phone is 10 digits and unique (if provided)."""
        if value in (None, ""):
            return value
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Phone number must be exactly 10 digits.")
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("This phone number is already used.")
        return value


    # This validate passwords , terms & conditions , counsellor fields via methods
    def validate(self, attrs: dict) -> dict:
        """
        Run composed validations:
         - password match + Django password validators
         - agreed_terms
         - counsellor-specific requirements (when account_type == counsellor)
        """
        self._validate_passwords(attrs)
        self._validate_agreed_terms(attrs)

        if attrs.get("account_type") == User.Roles.COUNSELLOR:
            self._validate_counsellor_fields(attrs)

        return attrs


    # This validate password and confirm passwords matching
    def _validate_passwords(self, attrs: dict):
        pw = attrs.get("password")
        pw2 = attrs.get("confirm_password")
        if pw != pw2:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        # Use Django's configured validators (length, complexity, common-passwords, etc.)
        validate_password(pw)


    # This validate terms agreement 
    def _validate_agreed_terms(self, attrs: dict):
        agreed = attrs.get("agreed_terms")
        if not agreed:
            raise serializers.ValidationError({"agreed_terms": "You must accept terms and conditions."})


    # This validate counsellor fields 
    def _validate_counsellor_fields(self, attrs: dict):
        """
        Ensure required counsellor fields exist and referenced IDs are valid.
        We check presence here; detailed existence checks happen below / in create().
        """
        missing = []
        if not attrs.get("license_number"):
            missing.append("license_number")
        if not attrs.get("specializations"):
            missing.append("specializations")
        if attrs.get("fees_per_session") is None:
            missing.append("fees_per_session")

        if missing:
            raise serializers.ValidationError({
                field: "This field is required for counsellor accounts." for field in missing
            })

        # Validate the specialization/availability IDs are positive ints
        # (actual existence validation is done in create() to avoid race conditions)
        for fld in ("specializations", "availability"):
            ids = attrs.get(fld) or []
            if any((not isinstance(i, int) or i <= 0) for i in ids):
                raise serializers.ValidationError({fld: "IDs must be positive integers."})

    

    def create(self, validated_data: dict) -> User:
        """
        Atomically create User and the appropriate profile (Client or Counsellor).
        Catches DB IntegrityError to translate duplicates to serializer-friendly errors.
        """
        account_type = validated_data.pop("account_type")
        password = validated_data.pop("password")
        validated_data.pop("confirm_password", None)
        agreed_terms = validated_data.pop("agreed_terms", False)

        license_number = validated_data.pop("license_number", None)
        specializations_ids = validated_data.pop("specializations", []) or []
        fees_per_session = validated_data.pop("fees_per_session", None)
        availability_ids = validated_data.pop("availability", []) or []
        age_group = validated_data.pop("age_group", None)

        # Build basic user kwargs
        user_kwargs = {
            "email": validated_data.get("email"),
            "password": password,
            "first_name": validated_data.get("first_name", ""),
            "last_name": validated_data.get("last_name", ""),
            "phone": validated_data.get("phone", None),
            "role": account_type,
        }

        with transaction.atomic():
            try:
                # Create user (UserManager create_user will handle is_active default)
                user = User.objects.create_user(**user_kwargs)
            except IntegrityError as exc:
                # Translate DB uniqueness errors to field-level errors (best-effort)
                msg = str(exc).lower()

                if "phone" in msg:
                    raise serializers.ValidationError({"phone": ["This phone number is already used."]})
                if "email" in msg:
                    raise serializers.ValidationError({"email": ["A user with this email already exists."]})
                
                raise serializers.ValidationError({"non_field_errors": ["Could not create account. Try again."]})

            # Create profile depending on account_type
            if account_type == User.Roles.CLIENT:
                ClientProfile.objects.create(
                    user=user,
                    age_group=age_group,
                    agreed_terms=agreed_terms
                )
            else:
                # Counsellor: ensure specializations/availability IDs actually exist
                specs_qs = list(Specialization.objects.filter(id__in = specializations_ids))
                if len(specs_qs) != len(set(specializations_ids)):
                    raise serializers.ValidationError({"specializations": "One or more specializations are invalid."})

                avails_qs = list(AvailabilitySlot.objects.filter(id__in=availability_ids))
                if len(avails_qs) != len(set(availability_ids)):
                    raise serializers.ValidationError({"availability": "One or more availability slots are invalid."})

                counsellor = CounsellorProfile.objects.create(
                    user=user,
                    license_number=license_number,
                    fees_per_session=fees_per_session,
                    bio="",
                )

                if specs_qs:
                    counsellor.specializations.set(specs_qs)
                if avails_qs:
                    counsellor.availability.set(avails_qs)
                    
                counsellor.save()

            return user


class SignupResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "is_active")


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField()


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()



class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password", "")

        if not email or not password:
            raise serializers.ValidationError("Must include 'email' and 'password'.")

        # Use Django's authenticate. Because your USERNAME_FIELD is email,
        # authenticate should work with username=email. We pass request for auth backends.
        request = self.context.get("request")
        user = authenticate(request=request, username=email, password=password)

        if user is None:
            # generic invalid credentials response
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            # enforce email verification / activation
            raise serializers.ValidationError("Please verify your email before logging in.")

        # attach user for view
        attrs["user"] = user
        return attrs



# Shared user partial serializer (used as nested via source='user') 
class UserProfilePartialSerializer(serializers.Serializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", required=False, allow_blank=True)
    last_name = serializers.CharField(source="user.last_name", required=False, allow_blank=True)
    phone = serializers.CharField(source="user.phone", required=False, allow_blank=True, allow_null=True)
    profile_picture = serializers.URLField(source="user.profile_picture", required=False, allow_blank=True, allow_null=True)
    bio = serializers.CharField(source="user.bio", required=False, allow_blank=True, allow_null=True)
    gender = serializers.ChoiceField(source="user.gender", choices=User.Gender.choices, required=False, allow_null=True)
    date_of_birth = serializers.DateField(
        source="user.date_of_birth",
        required=False,
        allow_null=True,
        input_formats=["%Y-%m-%d", "%d-%m-%Y"],
    )


#  Client profile serializer 
class ClientProfileSerializer(serializers.ModelSerializer, UserProfilePartialSerializer):
    # The inheritance above lets us reuse user fields defined in UserProfilePartialSerializer.
    # But we need to include them in fields via explicit declaration in Meta.fields below.

    class Meta:
        model = ClientProfile
        fields = (
            # user fields (via source="user.*")
            "email", "first_name", "last_name", "phone", "profile_picture", "bio", "gender", "date_of_birth",
            # client fields
            "age_group",
            "agreed_terms",
        )

    def update(self, instance, validated_data):
        # validated_data may contain a nested 'user' dict
        user_data = validated_data.pop("user", {})
        if user_data:
            for attr, val in user_data.items():
                setattr(instance.user, attr, val)
            instance.user.save(update_fields=[k for k in user_data.keys() if k])

        # update profile fields
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


# Simple serializers for nested representation
class SpecializationNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = ("id", "name")


class AvailabilitySlotNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = ("id", "name")


# Counsellor profile serializer 
class CounsellorProfileSerializer(serializers.ModelSerializer, UserProfilePartialSerializer):
    # For reading: return full objects with names
    # For writing: accept lists of primary keys
    specializations = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    
    # Fields for writing (will be handled in to_internal_value and update)
    specializations_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    availability_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = CounsellorProfile
        fields = (
            # user fields (via source="user.*")
            "email", "first_name", "last_name", "phone", "profile_picture", "bio", "gender", "date_of_birth",
            # counsellor fields
            "license_number",
            "specializations",
            "fees_per_session",
            "experience",
            "availability",
            "is_verified_professional",
            # write-only fields
            "specializations_ids",
            "availability_ids",
        )
        read_only_fields = ("is_verified_professional", "email")
    
    def get_specializations(self, obj):
        return [{"id": s.id, "name": s.name} for s in obj.specializations.all()]
    
    def get_availability(self, obj):
        return [{"id": a.id, "name": a.name} for a in obj.availability.all()]

    def to_internal_value(self, data):
        # Handle specializations and availability from frontend
        # Frontend might send "specializations" as list of IDs or "specializations_ids"
        if "specializations" in data and isinstance(data["specializations"], list):
            data["specializations_ids"] = data.pop("specializations")
        if "availability" in data and isinstance(data["availability"], list):
            data["availability_ids"] = data.pop("availability")
        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        # user fields first
        user_data = validated_data.pop("user", {})
        if user_data:
            for attr, val in user_data.items():
                setattr(instance.user, attr, val)
            instance.user.save(update_fields=[k for k in user_data.keys() if k])

        # handle M2M (specializations, availability) specially
        specializations_ids = validated_data.pop("specializations_ids", None)
        availability_ids = validated_data.pop("availability_ids", None)

        # update simple fields on counsellor profile
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        if specializations_ids is not None:
            instance.specializations.set(specializations_ids)
        if availability_ids is not None:
            instance.availability.set(availability_ids)

        return instance
