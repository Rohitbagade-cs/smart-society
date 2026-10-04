"""Django admin registrations for the society app."""

from django.contrib import admin

from apps.society.models import Society


@admin.register(Society)
class SocietyAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "city",
        "total_flats",
        "gates",
        "otp_enabled",
        "qr_enabled",
    )
