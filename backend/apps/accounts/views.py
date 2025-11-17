from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema, OpenApiExample
from .serializers import ClientSignupSerializer, SignupResponseSerializer
from .utils import create_email_verification_token, send_verification_email
import hashlib
from django.utils import timezone
from django.db import transaction
from .models import EmailVerificationToken, User
from .serializers import VerifyEmailSerializer, ResendVerificationSerializer , LoginSerializer,  ClientProfileSerializer, CounsellorProfileSerializer
from django.conf import settings
from rest_framework.permissions import AllowAny , IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from django.shortcuts import get_object_or_404
from .models import ClientProfile, CounsellorProfile
from typing import Optional
from django.db.models import Prefetch
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import base64




# Signup API Documentation
@extend_schema(
    request=ClientSignupSerializer,
    responses={
        201: SignupResponseSerializer,
        400: None,
        429: None
    },
    examples=[
        OpenApiExample(
            "ClientExample",
            summary="Client signup sample",
            value={
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "phone": "9876543210",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
                "account_type": "client",
                "age_group": "18_25",
                "agreed_terms": True
            },
            request_only=True
        )
    ],
)


class SignupView(APIView):
    """
    POST /api/auth/signup/
    Creates new user (client or counsellor). New users are created is_active=False
    and must verify email before being allowed to log in.

    Throttling uses DRF ScopedRateThrottle with scope 'signup'.
    Rates are configured in settings.DEFAULT_THROTTLE_RATES['signup'].
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "signup"

    authentication_classes = []   
    permission_classes = [AllowAny]

    def post(self, request):
        # Handle both JSON and multipart/form-data (for file uploads)
        data = request.data.copy()
        
        # If request has files, it's multipart/form-data
        # Parse list fields from FormData (they come as strings or multiple values)
        if request.FILES:
            # Handle specializations and availability lists
            # They might come as JSON strings or multiple values
            for field in ['specializations', 'availability']:
                if field in data:
                    value = data[field]
                    if isinstance(value, str):
                        try:
                            # Try to parse as JSON array
                            import json
                            data[field] = json.loads(value)
                        except (json.JSONDecodeError, TypeError):
                            # If not JSON, treat as single value in list
                            data[field] = [value] if value else []
                    elif not isinstance(value, list):
                        # Convert single value to list
                        data[field] = [value] if value else []
        
        serializer = ClientSignupSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        try:
            user = serializer.save()
        except IntegrityError as exc:
            # Defensive mapping of DB errors to friendly JSON errors
            msg = str(exc).lower()
            if "email" in msg:
                return Response({"email": ["A user with this email already exists."]},status=status.HTTP_400_BAD_REQUEST)
            if "phone" in msg:
                return Response({"phone": ["This phone number is already used."]},status=status.HTTP_400_BAD_REQUEST)
            
            return Response({"detail": "Could not create account. Try again."},status=status.HTTP_400_BAD_REQUEST)

        raw_token, token_obj = create_email_verification_token(user, ttl_hours=24)
        send_verification_email(user, raw_token)

        resp = SignupResponseSerializer(user, context={"request": request})
        return Response(
            {"detail": "Account created. Please verify your email to activate the account.", "user": resp.data},
            status=status.HTTP_201_CREATED
        )




class VerifyEmailView(APIView):
    """
    POST /api/auth/verify-email/
    Body: { "token": "<raw_token>" }
    """
    authentication_classes = []       
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw = serializer.validated_data["token"]
        token_hash = hashlib.sha256(raw.encode()).hexdigest()

        with transaction.atomic():
            # lock the matching token row to prevent race conditions
            token_qs = EmailVerificationToken.objects.select_for_update().filter(token_hash=token_hash)
            if not token_qs.exists():
                return Response({"detail": "Invalid verification link."}, status=status.HTTP_400_BAD_REQUEST)

            token = token_qs.first()
            if token.used:
                return Response({"detail": "This verification link has already been used."}, status=status.HTTP_400_BAD_REQUEST)
            if token.expires_at < timezone.now():
                return Response({"detail": "Verification link expired."}, status=status.HTTP_400_BAD_REQUEST)

            # mark token used and activate user
            token.used = True
            token.save(update_fields=["used"])

            user = token.user
            user.email_verified = True
            user.is_active = True
            user.save(update_fields=["email_verified", "is_active"])

        return Response({"detail": "Email verified. You can now log in."}, status=status.HTTP_200_OK)




class ResendVerificationView(APIView):
    """
    POST /api/auth/resend-verification/
    Body: { "email": "<user email>" }
    Throttled using scope 'resend_verification' (Configured in settings).
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "resend_verification"

    authentication_classes = []       
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()

        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Resend verification request for email: {email}")
        print(f"DEBUG: Resend verification request for: {email}")

        # respond generically to avoid enumeration
        try:
            user = User.objects.get(email__iexact=email)
            logger.info(f"User found: {user.email} (is_active={user.is_active}, email_verified={user.email_verified})")
            print(f"DEBUG: User found: {user.email}")
        except User.DoesNotExist:
            logger.warning(f"User not found for email: {email}")
            print(f"DEBUG: User not found for: {email}")
            return Response({"detail": "If an account exists, a verification email has been sent."}, status=status.HTTP_200_OK)

        if user.email_verified or user.is_active:
            logger.info(f"User {user.email} is already verified/active (is_active={user.is_active}, email_verified={user.email_verified})")
            print(f"DEBUG: User {user.email} is already verified (is_active={user.is_active}, email_verified={user.email_verified})")
            return Response({
                "detail": "Your email is already verified. You can log in now.",
                "verified": True,
                "is_active": user.is_active,
                "email_verified": user.email_verified,
            }, status=status.HTTP_200_OK)

        # invalidate previous unused tokens
        EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)
        logger.info(f"Invalidated old tokens for {user.email}")

        try:
            raw_token, token_obj = create_email_verification_token(user, ttl_hours=24)
            logger.info(f"Created verification token for {email}, sending email to {user.email}...")
            print(f"DEBUG: Created token for {email}, sending email to {user.email}...")
            print(f"DEBUG: Token (first 20 chars): {raw_token[:20]}...")
            
            send_verification_email(user, raw_token)
            # Log success for debugging
            logger.info(f"Verification email sent successfully to {user.email}")
            print(f"SUCCESS: Email sent successfully to {user.email}")
            print(f"DEBUG: Check backend console for SMTP details")
        except Exception as e:
            # Log the error for debugging
            error_msg = str(e)
            logger.error(f"Failed to send verification email to {email}: {error_msg}", exc_info=True)
            print(f"ERROR: Failed to send email to {email}: {error_msg}")
            import traceback
            traceback.print_exc()
            # Return a more specific error in development, generic in production
            if settings.DEBUG:
                return Response(
                    {"detail": f"Failed to send verification email: {error_msg}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            else:
                return Response(
                    {"detail": "Failed to send verification email. Please try again later."}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        return Response({
            "detail": "If an account exists, a verification email has been sent.",
            "debug_info": {
                "email": user.email,
                "token_created": True,
            } if settings.DEBUG else None
        }, status=status.HTTP_200_OK)
    
    def throttled(self, request, wait):
        # Custom throttled response
        from rest_framework.exceptions import Throttled
        raise Throttled(detail=f"Too many requests. Please try again in {wait} seconds.")





def _token_lifetimes_seconds():
    # read lifetimes from SIMPLE_JWT settings (fallback safe defaults)
    access_delta = settings.SIMPLE_JWT.get("ACCESS_TOKEN_LIFETIME")
    refresh_delta = settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME")
    # these are datetime.timedelta objects; convert to seconds (int)
    access_seconds = int(access_delta.total_seconds()) if access_delta else 300
    refresh_seconds = int(refresh_delta.total_seconds()) if refresh_delta else 60 * 60 * 24 * 7
    return access_seconds, refresh_seconds


class LoginView(APIView):
    """
    POST /api/auth/login/
    Body: { "email": "...", "password": "..." }

    Returns 200 OK and sets HttpOnly cookies:
      - access_token (short-lived)
      - refresh_token (longer-lived)
    The response body returns user info (no tokens in JSON).
    """
    authentication_classes = []  
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        # Create tokens
        refresh = RefreshToken.for_user(user)

        # Optional: add small custom claims useful for server-side checks
        # keep payload small (SimpleJWT will include them in both refresh and derived access token)
        refresh["role"] = getattr(user, "role", "")
        refresh["tv"] = getattr(user, "token_version", 0)
        # last_password_change may be None
        pwd_ts = 0

        if getattr(user, "last_password_change", None):
            pwd_ts = int(user.last_password_change.timestamp())
        refresh["pwd_ts"] = pwd_ts

        access_token = refresh.access_token

        # cookie parameters
        access_cookie_name = getattr(settings, "ACCESS_COOKIE_NAME", "access_token")
        refresh_cookie_name = getattr(settings, "REFRESH_COOKIE_NAME", "refresh_token")
        secure = getattr(settings, "JWT_COOKIE_SECURE", False)
        samesite = getattr(settings, "JWT_COOKIE_SAMESITE", "Lax")
        http_only = True
        path = "/"

        access_max_age, refresh_max_age = _token_lifetimes_seconds()

        resp_data = {
            "detail": "Login successful.",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": getattr(user, "role", "")
            }
        }

        response = Response(resp_data, status=status.HTTP_200_OK)

        # Set cookies (HttpOnly)
        # Note: use max_age (seconds) and secure/samesite according to settings
        response.set_cookie(
            access_cookie_name,
            str(access_token),
            max_age=access_max_age,
            secure=secure,
            httponly=http_only,
            samesite=samesite,
            path=path,
        )
        
        response.set_cookie(
            refresh_cookie_name,
            str(refresh),
            max_age=refresh_max_age,
            secure=secure,
            httponly=http_only,
            samesite=samesite,
            path=path,
        )

        return response


class TherapistListView(APIView):
    """
    GET /api/auth/therapists/
    Returns a list of counsellors with their profile information.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only include users with role counsellor
        qs = User.objects.filter(role=User.Roles.COUNSELLOR)
        # Prefetch related counsellor_profile and m2m fields
        qs = qs.select_related('counsellor_profile').prefetch_related(
            Prefetch('counsellor_profile__specializations'),
            Prefetch('counsellor_profile__availability')
        )

        result = []
        for u in qs:
            prof = getattr(u, 'counsellor_profile', None)
            item = {
                'id': u.id,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'full_name': u.get_full_name(),
                'phone': u.phone,
                'profile_picture': u.profile_picture,
            }
            if prof:
                item.update({
                    'license_number': prof.license_number,
                    'fees_per_session': str(prof.fees_per_session) if prof.fees_per_session is not None else None,
                    'experience': prof.experience,
                    'bio': prof.bio,
                    'is_verified_professional': prof.is_verified_professional,
                    'is_approved': prof.is_approved,
                    'specializations': [{'id': s.id, 'name': s.name} for s in prof.specializations.all()],
                    'availability': [{'id': a.id, 'name': a.name} for a in prof.availability.all()],
                })
            result.append(item)

        return Response(result)


class TherapistDetailView(APIView):
    """
    GET /api/auth/therapists/<id>/
    Returns full counsellor profile for a single therapist.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            user = User.objects.select_related('counsellor_profile').get(id=pk, role=User.Roles.COUNSELLOR)
        except User.DoesNotExist:
            return Response({'detail': 'Counsellor not found.'}, status=404)

        prof = getattr(user, 'counsellor_profile', None)
        data = {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.get_full_name(),
            'phone': user.phone,
            'profile_picture': user.profile_picture,
        }
        if prof:
            data.update({
                'license_number': prof.license_number,
                'fees_per_session': str(prof.fees_per_session) if prof.fees_per_session is not None else None,
                'experience': prof.experience,
                'bio': prof.bio,
                'is_verified_professional': prof.is_verified_professional,
                'is_approved': prof.is_approved,
                'specializations': [{'id': s.id, 'name': s.name} for s in prof.specializations.all()],
                'availability': [{'id': a.id, 'name': a.name} for a in prof.availability.all()],
            })

        return Response(data)




class TokenRefreshView(APIView):
    """
    POST /api/auth/token/refresh/
    - Reads refresh token from cookie (default) or JSON body { "refresh": "<token>" }.
    - On success: sets new access cookie (and optionally rotates refresh cookie).
    - Response: 200 OK { "detail": "Token refreshed." }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # 1) obtain raw refresh token: prefer cookie, then body
        refresh_cookie_name = getattr(settings, "REFRESH_COOKIE_NAME", "refresh_token")
        raw_refresh = request.COOKIES.get(refresh_cookie_name) or request.data.get("refresh")

        if not raw_refresh:
            return Response({"detail": "Refresh token not provided."}, status=status.HTTP_401_UNAUTHORIZED)

        # If the cookie value was stored as "Bearer <token>" normalize it:
        if isinstance(raw_refresh, str) and raw_refresh.lower().startswith("bearer "):
            raw_refresh = raw_refresh.split(" ", 1)[1]

        try:
            # validate incoming refresh token
            old_refresh = RefreshToken(raw_refresh)
        except TokenError:
            return Response({"detail": "Invalid or expired refresh token."}, status=status.HTTP_401_UNAUTHORIZED)

        # At this point the refresh token is valid; obtain user id from token
        user_id = old_refresh.get("user_id") or old_refresh.get("user")  # fallback keys
        try:
            user = User.objects.get(id=user_id)
        except Exception:
            return Response({"detail": "Invalid token user."}, status=status.HTTP_401_UNAUTHORIZED)

        # create new access token
        new_access = old_refresh.access_token

        # attach minimal useful claims if desired (token already has claims issued on creation)
        # e.g., you can set role/token_version/pwd_ts here if you want to refresh claims
        # new_access["role"] = getattr(user, "role", "")
        # new_access["tv"] = getattr(user, "token_version", 0)

        # Determine cookie lifetimes
        access_max_age, refresh_max_age = _token_lifetimes_seconds()
        secure = getattr(settings, "JWT_COOKIE_SECURE", False)
        samesite = getattr(settings, "JWT_COOKIE_SAMESITE", "Lax")
        access_cookie_name = getattr(settings, "ACCESS_COOKIE_NAME", "access_token")
        refresh_cookie_name = getattr(settings, "REFRESH_COOKIE_NAME", "refresh_token")
        http_only = True
        path = "/"

        # Rotation support
        rotate = settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False)
        blacklist_after_rotation = settings.SIMPLE_JWT.get("BLACKLIST_AFTER_ROTATION", False)

        if rotate:
            # Create a fresh refresh token for the user
            new_refresh = RefreshToken.for_user(user)
            # If requested, blacklist the old refresh token (requires token_blacklist app)
            if blacklist_after_rotation:
                try:
                    old_refresh.blacklist()
                except AttributeError:
                    # blacklist not available (token_blacklist not installed) -- ignore but warn in server logs
                    pass
            refresh_to_set = str(new_refresh)
        else:
            # reuse the same refresh token (no rotation)
            refresh_to_set = str(old_refresh)

        # Set cookies on response
        response = Response({"detail": "Token refreshed."}, status=status.HTTP_200_OK)

        # Set access cookie (short-lived)
        response.set_cookie(
            access_cookie_name,
            str(new_access),
            max_age=access_max_age,
            secure=secure,
            httponly=http_only,
            samesite=samesite,
            path=path,
        )

        # Set refresh cookie (rotated or original)
        response.set_cookie(
            refresh_cookie_name,
            refresh_to_set,
            max_age=refresh_max_age,
            secure=secure,
            httponly=http_only,
            samesite=samesite,
            path=path,
        )

        return response
    



class ProfileView(APIView):
    """
    GET  /api/profile/     -> returns current user's profile (client or counsellor)
    PATCH /api/profile/    -> partial update of user+profile fields
    """
    permission_classes = [IsAuthenticated]

    def _get_serializer_for_user(self, user, *args, **kwargs):
        if user.role == user.Roles.CLIENT:
            # ensure client profile exists
            profile = getattr(user, "client_profile", None)
            if not profile:
                # 404 is ok; but you can create default profile if desired
                raise get_object_or_404(ClientProfile, user=user)
            return ClientProfileSerializer(profile, *args, **kwargs)
        else:
            # counsellor (or admin acting as counsellor)
            profile = getattr(user, "counsellor_profile", None)
            if not profile:
                raise get_object_or_404(CounsellorProfile, user=user)
            return CounsellorProfileSerializer(profile, *args, **kwargs)

    def get(self, request):
        serializer = self._get_serializer_for_user(request.user)
        return Response(serializer.data)

    def patch(self, request):
        # Normalize incoming data: accept friendly frontend keys like 'fullName'
        data = request.data.copy()
        # support frontends that send fullName
        full = data.get('fullName') or data.get('full_name')
        if full and (not data.get('first_name') and not data.get('last_name')):
            parts = str(full).strip().split(' ', 1)
            data['first_name'] = parts[0] if parts else ''
            data['last_name'] = parts[1] if len(parts) > 1 else ''

        # allow avatar key alias
        if data.get('avatar') and not data.get('profile_picture'):
            data['profile_picture'] = data.get('avatar')

        serializer = self._get_serializer_for_user(request.user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # Optional: support PUT if you want full-replacement updates
    def put(self, request):
        # Normalize incoming data similar to PATCH to be forgiving of frontend keys
        data = request.data.copy()
        full = data.get('fullName') or data.get('full_name')
        if full and (not data.get('first_name') and not data.get('last_name')):
            parts = str(full).strip().split(' ', 1)
            data['first_name'] = parts[0] if parts else ''
            data['last_name'] = parts[1] if len(parts) > 1 else ''

        if data.get('avatar') and not data.get('profile_picture'):
            data['profile_picture'] = data.get('avatar')

        serializer = self._get_serializer_for_user(request.user, data=data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ProfilePictureUploadView(APIView):
    """
    POST /api/auth/profile/upload-photo/
    Accepts multipart/form-data with a file field 'profile_picture' OR a JSON body with
    { "data_url": "data:image/png;base64,..." } to upload and store the image, returning
    { "profile_picture": "<url>" }.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Prefer actual uploaded file
        upload = request.FILES.get('profile_picture')
        if upload:
            try:
                # Save file using default storage
                filename = f'profile_pictures/user_{request.user.id}_{upload.name}'
                saved_path = default_storage.save(filename, upload)
                url = default_storage.url(saved_path)
                # Persist to user.profile_picture
                request.user.profile_picture = url
                request.user.save(update_fields=['profile_picture'])
                return Response({'profile_picture': url}, status=200)
            except Exception as e:
                return Response({'detail': f'Failed to save uploaded file: {str(e)}'}, status=500)

        # Otherwise accept data_url JSON
        data_url = request.data.get('data_url') or request.data.get('profile_picture')
        if not data_url:
            return Response({'detail': 'No file or data_url provided.'}, status=400)

        # data_url expected like: data:image/png;base64,AAA...
        try:
            header, encoded = data_url.split(',', 1)
            file_data = base64.b64decode(encoded)
        except Exception:
            return Response({'detail': 'Invalid data_url format.'}, status=400)

        # Try to infer image extension from the data URL header (safe and avoids external deps)
        # header expected like: data:image/png;base64
        ext = 'png'
        try:
            if header and header.startswith('data:'):
                mime_part = header.split(';', 1)[0]  # 'data:image/png'
                if '/' in mime_part:
                    ext = mime_part.split('/', 1)[1]
                    # sanitize common variants like 'jpeg' -> 'jpg'
                    if ext == 'jpeg':
                        ext = 'jpg'
                    # strip parameters if present
                    ext = ext.split('+')[0]
        except Exception:
            ext = 'png'

        filename = f'profile_pictures/user_{request.user.id}.{ext}'
        try:
            saved_path = default_storage.save(filename, ContentFile(file_data))
            url = default_storage.url(saved_path)
            request.user.profile_picture = url
            request.user.save(update_fields=['profile_picture'])
            return Response({'profile_picture': url}, status=200)
        except Exception as e:
            return Response({'detail': f'Failed to save image: {str(e)}'}, status=500)






class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Body (optional JSON):
      {
        "refresh": "<refresh_token>",   # optional if cookie present
        "all": true                     # optional: logout from all sessions
      }

    Behavior:
      - Prefer refresh token from cookie (REFRESH_COOKIE_NAME) then request body.
      - Try to blacklist the provided refresh token (if token_blacklist is installed).
      - If {"all": true} and token valid → increment user's token_version and blacklist all outstanding refresh tokens.
      - Always clear access & refresh cookies on response (idempotent).
      - Returns 200 OK.
    """
    permission_classes = [AllowAny]  # allow even if access token expired; we use refresh token to find user

    def post(self, request):
        refresh_cookie_name = getattr(settings, "REFRESH_COOKIE_NAME", "refresh_token")
        access_cookie_name = getattr(settings, "ACCESS_COOKIE_NAME", "access_token")

        # 1) obtain raw refresh token (cookie preferred)
        raw_refresh: Optional[str] = request.COOKIES.get(refresh_cookie_name) or request.data.get("refresh")

        # normalize if stored as "Bearer <token>"
        if isinstance(raw_refresh, str) and raw_refresh.lower().startswith("bearer "):
            raw_refresh = raw_refresh.split(" ", 1)[1]

        # Prepare response early so we can always clear cookies (idempotent)
        response = Response({"detail": "Logged out."}, status=status.HTTP_200_OK)

        # Always clear cookies (client will remove them)
        # Use delete_cookie to ensure Set-Cookie with Max-Age=0 is returned
        response.delete_cookie(access_cookie_name, path="/")
        response.delete_cookie(refresh_cookie_name, path="/")

        if not raw_refresh:
            # Nothing else to do — return success (idempotent)
            return response

        # Try to parse/blacklist the provided refresh token
        try:
            token = RefreshToken(raw_refresh)
        except TokenError:
            # invalid/expired token — still return success but nothing to blacklist
            return response

        # Attempt to blacklist this refresh token (if blacklist app installed)
        try:
            token.blacklist()
        except Exception:
            # blacklist may not be available; ignore failure (we still clear cookies)
            pass

        # Optional: logout from all sessions if requested and we can identify the user
        if request.data.get("all") in (True, "true", "1", 1):
            user_id = token.get("user_id") or token.get("user")
            if user_id:
                try:
                    user = User.objects.get(id=user_id)
                    # increment token_version to invalidate access tokens issued earlier
                    user.increment_token_version()
                    # blacklist outstanding refreshes if helper exists
                    try:
                        user.blacklist_all_refresh_tokens()
                    except Exception:
                        pass
                except User.DoesNotExist:
                    pass

        return response

