"""
Accounts views: JWT login, admin-only registration, me-profile,
and admin CRUD for users / residents / guards.
"""

from rest_framework import generics, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.accounts.models import ResidentProfile, SecurityGuardProfile, User
from apps.accounts.permissions import IsAdmin, IsGuard
from apps.accounts.serializers import (
    CustomTokenObtainPairSerializer,
    MyProfileUpdateSerializer,
    ResidentProfileSerializer,
    SecurityGuardProfileSerializer,
    UserRegisterSerializer,
    UserSerializer,
)
from apps.visitors.audit import log_audit


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ -> {access, refresh, user}."""

    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    """GET /api/auth/me/ -> profile of the currently authenticated user.
    PATCH /api/auth/me/ -> the user updates their own whitelisted fields."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = MyProfileUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit(
            request, "profile.update", "user", request.user.id, {"username": request.user.username}
        )
        return Response(UserSerializer(request.user).data)


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/ — admin-only user creation with an explicit role.
    Residents/guards cannot self-register.
    """

    permission_classes = [IsAdmin]
    serializer_class = UserRegisterSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        log_audit(
            self.request,
            "user.create",
            "user",
            user.id,
            {"username": user.username, "role": user.role},
        )


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------
class UserViewSet(viewsets.ModelViewSet):
    """Admin-only user management. Passwords are write-only, hashed on save."""

    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["username", "email", "first_name", "last_name", "phone"]
    ordering_fields = ["date_joined", "username"]

    def perform_create(self, serializer):
        user = serializer.save()
        log_audit(
            self.request, "user.create", "user", user.id,
            {"username": user.username, "role": user.role},
        )

    def perform_update(self, serializer):
        user = serializer.save()
        log_audit(
            self.request, "user.update", "user", user.id,
            {"username": user.username, "role": user.role},
        )

    def perform_destroy(self, instance):
        log_audit(
            self.request, "user.delete", "user", instance.id,
            {"username": instance.username},
        )
        instance.delete()


class ResidentViewSet(viewsets.ModelViewSet):
    """Resident profiles: guards may list/retrieve (needed to register
    visitors); only admins may create/update/delete."""

    queryset = ResidentProfile.objects.select_related("user").order_by("flat_no")
    serializer_class = ResidentProfileSerializer
    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["flat_no", "wing", "user__username", "phone"]
    ordering_fields = ["flat_no", "floor"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsGuard()]
        return [IsAdmin()]


class GuardViewSet(viewsets.ModelViewSet):
    """Admin CRUD for security-guard profiles (filterable by ?search=)."""

    queryset = SecurityGuardProfile.objects.select_related("user").order_by("gate")
    serializer_class = SecurityGuardProfileSerializer
    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["gate", "shift", "user__username", "phone"]
    ordering_fields = ["gate", "shift"]
