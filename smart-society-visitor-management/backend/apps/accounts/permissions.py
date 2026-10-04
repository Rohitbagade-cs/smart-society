"""
Role-based permission classes shared by all apps.

Roles: admin | guard | resident.
- IsAdmin:   admins only (user management, reports, audit logs, config writes).
- IsGuard:   guards and admins (gate operations: register visitors, entry/exit).
- IsResident: residents (their own data) — admins also pass where marked.
"""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow only users with the admin role."""

    message = "Admin access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == "admin")


class IsGuard(BasePermission):
    """Allow guards and admins (gate operations)."""

    message = "Security guard access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.role in ("admin", "guard")
        )


class IsGuardOrResident(BasePermission):
    """Allow guards and residents (gate operations + self-invites). Admins pass too."""

    message = "Security guard or resident access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.role in ("admin", "guard", "resident")
        )


class IsResident(BasePermission):
    """Allow residents (and admins acting on behalf)."""

    message = "Resident access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.role in ("admin", "resident")
        )
