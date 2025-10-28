
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    ModelSerializer for registering a new user.
    - Accepts password + password2 (confirmation).
    - Validates using Django's password validators.
    - Creates the user via the custom manager (create_user).
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        # include fields we want to collect on signup
        fields = ("email", "first_name", "last_name", "phone", "role", "password", "password2")
        extra_kwargs = {
            "first_name": {"required": True},
            "last_name": {"required": True},
            "role": {"required": True},  
            "phone": {"required": True},
        }

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        # check password confirmation
        if attrs.get("password") != attrs.get("password2"):
            raise serializers.ValidationError({"password": "Password fields did not match."})
        return attrs

    @transaction.atomic 
    def create(self, validated_data):
        # remove password2 before creating user
        validated_data.pop("password2", None)
        password = validated_data.pop("password")

        # normalize email to lowercase
        if "email" in validated_data:
            validated_data["email"] = validated_data["email"].lower().strip()

        # use the custom manager's create_user for correct behavior
        user = User.objects.create_user(password=password, **validated_data)
        # Optionally: send verification email here (asynchronous task recommended)
        return user
    


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Add small extra claims to tokens (tv, pwd_ts, role) from user.jwt_payload_extra().
    Keep claims compact to avoid large JWTs.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        if hasattr(user, "jwt_payload_extra"):
            extra = user.jwt_payload_extra()
            for k, v in extra.items():
                token[k] = v
        return token



