
from django.urls import path
from .views import (
    SignupView, VerifyEmailView, ResendVerificationView, LoginView, TokenRefreshView,
    ProfileView, ProfilePictureUploadView, LogoutView, TherapistListView, TherapistDetailView
)


urlpatterns = [
    path("signup/", SignupView.as_view(), name="auth-signup"),
    path("verify-email/", VerifyEmailView.as_view(), name="auth-verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="auth-resend-verification"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),  
    path("profile/", ProfileView.as_view(), name="profile"),
    path("profile/upload-photo/", ProfilePictureUploadView.as_view(), name="profile-upload-photo"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("therapists/", TherapistListView.as_view(), name="therapist-list"),
    path("therapists/<int:pk>/", TherapistDetailView.as_view(), name="therapist-detail"),
]



