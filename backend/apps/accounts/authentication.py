
from typing import Optional

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


ACCESS_COOKIE_NAME = getattr(settings, "ACCESS_COOKIE_NAME", "access_token")


class CookieJWTAuthentication(JWTAuthentication):
    """
    Read the access token from the Authorization header (Bearer ...) OR from a cookie.
    - Returns (user, token) like JWTAuthentication.
    - Does NOT attempt to refresh tokens. If access token is expired/invalid,
      authentication fails and the client should use the refresh endpoint.
    """

    def get_header(self, request) -> Optional[bytes]:
        """
        Prefer Authorization header. If missing, read cookie and return a pseudo-header 'Bearer <token>'.
        This leverages JWTAuthentication's existing pipeline: get_raw_token -> get_validated_token -> get_user.
        """
        header = super().get_header(request)
        if header:
            return header

        # Try cookie
        raw_token = request.COOKIES.get(ACCESS_COOKIE_NAME)
        if not raw_token:
            return None

        # raw_token may already be "Bearer <token>" or just the token
        if raw_token.lower().startswith("bearer "):
            raw_token = raw_token.split(" ", 1)[1]

        try:
            return f"Bearer {raw_token}".encode()
        except Exception:
            return None

    def authenticate(self, request):
        """
        Use the parent authenticate, but normalize exceptions to AuthenticationFailed so DRF handles them.
        Do not auto-refresh here — let client call refresh endpoint or middleware handle it explicitly.
        """
        try:
            return super().authenticate(request)
        except AuthenticationFailed:
            #(DRF will handle -> unauthenticated / 401)
            raise
        except Exception as exc:
            # Convert any unexpected exception to AuthenticationFailed to avoid leaking internal errors
            raise AuthenticationFailed("Invalid authentication credentials")
