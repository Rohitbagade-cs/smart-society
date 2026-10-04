"""Django admin registrations for the accounts app."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.accounts.models import ResidentProfile, SecurityGuardProfile, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "role", "is_active", "date_joined")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "email", "phone")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Society", {"fields": ("role", "phone")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Society", {"fields": ("role", "phone")}),
    )


@admin.register(ResidentProfile)
class ResidentProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "flat_no", "wing", "floor", "phone", "family_members")
    search_fields = ("flat_no", "wing", "user__username", "phone")


@admin.register(SecurityGuardProfile)
class SecurityGuardProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "shift", "gate", "phone")
    list_filter = ("shift", "gate")
    search_fields = ("gate", "user__username", "phone")
