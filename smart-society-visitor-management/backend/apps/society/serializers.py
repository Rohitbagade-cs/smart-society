"""Serializers for the society configuration singleton."""

from rest_framework import serializers

from apps.society.models import Society


class SocietySerializer(serializers.ModelSerializer):
    class Meta:
        model = Society
        fields = [
            "id",
            "name",
            "address",
            "city",
            "total_flats",
            "gates",
            "contact_email",
            "contact_phone",
            "visiting_hours_start",
            "visiting_hours_end",
            "otp_enabled",
            "qr_enabled",
        ]
        read_only_fields = ["id"]
