"""URL routes for the accounts app (registered under /api/ by config.urls)."""

from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import (
    GuardViewSet,
    LoginView,
    MeView,
    RegisterView,
    ResidentViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("residents", ResidentViewSet, basename="residents")
router.register("guards", GuardViewSet, basename="guards")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
] + router.urls
