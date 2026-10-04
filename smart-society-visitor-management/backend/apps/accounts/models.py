"""
Accounts app: custom User with role-based access, plus resident and guard profiles.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user. `role` drives every permission decision in the API."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        GUARD = "guard", "Security Guard"
        RESIDENT = "resident", "Resident"

    role = models.CharField(max_length=16, choices=Role.choices, default=Role.RESIDENT)
    phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_guard(self):
        return self.role in (self.Role.ADMIN, self.Role.GUARD)

    @property
    def is_resident(self):
        return self.role in (self.Role.ADMIN, self.Role.RESIDENT)


class ResidentProfile(models.Model):
    """Extended profile for resident-role users."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="resident_profile"
    )
    flat_no = models.CharField(max_length=20)
    wing = models.CharField(max_length=20, blank=True)
    floor = models.PositiveSmallIntegerField(default=0)
    phone = models.CharField(max_length=20, blank=True)
    family_members = models.PositiveSmallIntegerField(default=1)

    def __str__(self):
        return f"{self.flat_no} — {self.user.username}"


class SecurityGuardProfile(models.Model):
    """Extended profile for security-guard-role users."""

    class Shift(models.TextChoices):
        MORNING = "morning", "Morning"
        EVENING = "evening", "Evening"
        NIGHT = "night", "Night"

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="guard_profile"
    )
    shift = models.CharField(max_length=16, choices=Shift.choices, default=Shift.MORNING)
    gate = models.CharField(max_length=60, default="Main Gate")
    phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.user.username} — {self.shift} @ {self.gate}"
