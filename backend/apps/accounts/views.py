
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import UserRegistrationSerializer , MyTokenObtainPairSerializer

from datetime import timedelta
from typing import Optional

from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer


from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from django.contrib.auth import get_user_model

User = get_user_model()



class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/signup/  -> registers a new user.

    Request body: {
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone" : 1234567890,
      "role" : "client"/"counsellor"/"admin"
      "password": "StrongPass123!",
      "password2": "StrongPass123!"
    }

    Response (201 Created): {
      "id": 12,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "client"
    }
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # return minimal safe user info (no sensitive fields)
        data = {
            "id": user.pk,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": getattr(user, "role", None),
        }
        return Response(data, status=status.HTTP_201_CREATED)




# Cookie configuration (via settings)
ACCESS_COOKIE_NAME = getattr(settings, "ACCESS_COOKIE_NAME", "access_token")
REFRESH_COOKIE_NAME = getattr(settings, "REFRESH_COOKIE_NAME", "refresh_token")
COOKIE_SECURE = getattr(settings, "JWT_COOKIE_SECURE", False)  # True in prod (HTTPS)
COOKIE_SAMESITE = getattr(settings, "JWT_COOKIE_SAMESITE", "Lax")
COOKIE_HTTPONLY = True


def _cookie_max_age(lifetime: Optional[timedelta]) -> Optional[int]:
    if lifetime is None:
        return None
    if isinstance(lifetime, timedelta):
        return int(lifetime.total_seconds())
    # if configured as int
    return int(lifetime)


class CookieTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Accepts credentials and sets HttpOnly cookies for access + refresh.
    Response body returns safe user info (no tokens).
    """
    serializer_class = MyTokenObtainPairSerializer
    permission_classes = []  # allow anonymous

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user  # set by TokenObtainPairSerializer.validate

        # Create tokens with extra claims using serializer.get_token
        refresh = MyTokenObtainPairSerializer.get_token(user)
        print("refresh object : " , refresh)

        access = refresh.access_token
        print("access object : " , access)

        # Ensure refresh token object is also a RefreshToken instance so rotation and blacklist work
        # RefreshToken type from simplejwt is compatible; convert str() if you want raw token strings
        refresh_str = str(refresh)
        access_str = str(access)
        print("refresh token : " , refresh_str)
        print("access token : " , access_str)

        # Build minimal safe user response
        data = {
            "id": user.pk,
            "email": user.email,
            "first_name": getattr(user, "first_name", ""),
            "last_name": getattr(user, "last_name", ""),
            "role": getattr(user, "role", ""),
        }
        response = Response(data, status=status.HTTP_200_OK)

        # Configure cookie lifetimes based on SIMPLE_JWT settings:
        sjwt = getattr(settings, "SIMPLE_JWT", {})
        access_lifetime = sjwt.get("ACCESS_TOKEN_LIFETIME")
        refresh_lifetime = sjwt.get("REFRESH_TOKEN_LIFETIME")

        response.set_cookie(
            ACCESS_COOKIE_NAME,
            access_str,
            max_age=_cookie_max_age(access_lifetime),
            httponly=COOKIE_HTTPONLY,
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
        )
        response.set_cookie(
            REFRESH_COOKIE_NAME,
            refresh_str,
            max_age=_cookie_max_age(refresh_lifetime),
            httponly=COOKIE_HTTPONLY,
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
        )

        return response



class CookieTokenRefreshView(TokenRefreshView):
    """
    POST /api/auth/refresh/
    Reads refresh token from cookie if not provided in body, validates it
    using simplejwt TokenRefreshSerializer, and returns new access (and refresh if rotation enabled)
    — sets cookies on successful refresh.
    """
    permission_classes = []
    serializer_class = TokenRefreshSerializer  # simplejwt's serializer

    def post(self, request, *args, **kwargs):
        # If body doesn't contain 'refresh', try reading from cookie
        data = request.data.copy()
        if "refresh" not in data:
            cookie_refresh = request.COOKIES.get(REFRESH_COOKIE_NAME)
            if cookie_refresh:
                data["refresh"] = cookie_refresh

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data  # contains access and maybe refresh

        access_token = validated.get("access")
        refresh_token = validated.get("refresh", None)  # present if ROTATE_REFRESH_TOKENS=True

        response = Response(status=status.HTTP_200_OK)

        # set access cookie
        sjwt = getattr(settings, "SIMPLE_JWT", {})
        access_lifetime = sjwt.get("ACCESS_TOKEN_LIFETIME")
        refresh_lifetime = sjwt.get("REFRESH_TOKEN_LIFETIME")

        response.set_cookie(
            ACCESS_COOKIE_NAME,
            access_token,
            max_age=_cookie_max_age(access_lifetime),
            httponly=COOKIE_HTTPONLY,
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
        )

        # If a new refresh token was issued (rotation), set it; otherwise keep existing refresh cookie unchanged.
        if refresh_token:
            response.set_cookie(
                REFRESH_COOKIE_NAME,
                refresh_token,
                max_age=_cookie_max_age(refresh_lifetime),
                httponly=COOKIE_HTTPONLY,
                secure=COOKIE_SECURE,
                samesite=COOKIE_SAMESITE,
            )

        # Optionally return something lightweight to the client (we return OK)
        response.data = {"detail": "Token refreshed"}
        return response




ACCESS_COOKIE_NAME = getattr(settings, "ACCESS_COOKIE_NAME", "access_token")
REFRESH_COOKIE_NAME = getattr(settings, "REFRESH_COOKIE_NAME", "refresh_token")


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Body (optional): {"refresh": "<refresh-token>", "all": true|false}
    - If refresh token provided via cookie, body or Authorization header -> blacklist it.
    - If user is authenticated and "all": true -> blacklist all outstanding refresh tokens for that user.
    - Clears access and refresh cookies in the response.
    - Idempotent: returns 200 even if token was already blacklisted / missing.
    """
    # allow anonymous because a client with a valid refresh cookie but expired access token
    # might not be authenticated by DRF. For "all" logout we require authentication below.
    permission_classes = []

    def _get_refresh_from_request(self, request) -> Optional[str]:
        # 1) check request body
        refresh = request.data.get("refresh") if isinstance(request.data, dict) else None
        if refresh:
            return refresh

        # 2) check refresh cookie
        cookie_refresh = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if cookie_refresh:
            return cookie_refresh

        # 3) check Authorization header (Bearer <token>)
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header.startswith("Bearer "):
            return auth_header.split(" ", 1)[1]

        return None

    def _clear_cookies(self, response):
        # Delete cookies by setting them expired. Adjust domain/path if you set them earlier.
        response.delete_cookie(ACCESS_COOKIE_NAME)
        response.delete_cookie(REFRESH_COOKIE_NAME)

    def post(self, request, *args, **kwargs):
        refresh_token_str = self._get_refresh_from_request(request)

        # If client asked to logout from all sessions, require an authenticated user
        logout_all = bool(request.data.get("all")) if isinstance(request.data, dict) else False
        if logout_all:
            # require authentication to perform logout-all
            if not request.user or not getattr(request.user, "is_authenticated", False):
                return Response(
                    {"detail": "Authentication required to logout from all sessions."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            # blacklist all outstanding refresh tokens for this user (uses simplejwt models)
            # If you implemented User.blacklist_all_refresh_tokens(), use it:
            try:
                count = request.user.blacklist_all_refresh_tokens()
            except Exception:
                # fallback: attempt a safe approach that doesn't crash
                count = 0
            # increment token_version to invalidate access tokens that include tv claim
            try:
                request.user.increment_token_version()
            except Exception:
                pass

            response = Response({"detail": f"Logged out of all sessions ({count} tokens blacklisted)."},
                                status=status.HTTP_200_OK)
            self._clear_cookies(response)
            return response

        # Normal single-session logout flow
        if not refresh_token_str:
            # No refresh token found — still clear cookies to be safe and return OK (idempotent).
            response = Response({"detail": "No refresh token provided; cookies cleared."}, status=status.HTTP_200_OK)
            self._clear_cookies(response)
            return response

        # Try to blacklist the refresh token (simplejwt provides blacklist on RefreshToken)
        try:
            token = RefreshToken(refresh_token_str)
            # This will create BlacklistedToken entry if token_blacklist is installed
            token.blacklist()
        except TokenError:
            # Token invalid/expired/previously blacklisted/etc. We still clear cookies and return OK (idempotent).
            response = Response({"detail": "Token invalid or expired; cookies cleared."}, status=status.HTTP_200_OK)
            self._clear_cookies(response)
            return response
        except Exception:
            # Unexpected error — return 200 after clearing cookies to avoid leaking details,
            # but you may log or audit the exception on server side.
            response = Response({"detail": "Logout processed; cookies cleared."}, status=status.HTTP_200_OK)
            self._clear_cookies(response)
            return response

        # Blacklisting succeeded
        response = Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        self._clear_cookies(response)
        return response

