
from django.urls import path
from .views import RegisterView , CookieTokenObtainPairView, CookieTokenRefreshView , LogoutView


urlpatterns = [
    path("signup/", RegisterView.as_view(), name="auth-signup"),
    path("login/", CookieTokenObtainPairView.as_view(), name="auth-login"),
    path("refresh/", CookieTokenRefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
]



