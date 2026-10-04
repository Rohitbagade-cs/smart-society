"""
Society app: a single configuration row (id=1) for the housing society.
"""

from django.db import models


class Society(models.Model):
    """Singleton society configuration. Only one row is expected (pk=1)."""

    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    total_flats = models.PositiveIntegerField(default=0)
    gates = models.CharField(
        max_length=200, default="Main Gate",
        help_text="Comma-separated gate names, e.g. 'Main Gate, Service Gate'",
    )
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    visiting_hours_start = models.TimeField(null=True, blank=True)
    visiting_hours_end = models.TimeField(null=True, blank=True)
    otp_enabled = models.BooleanField(default=True)
    qr_enabled = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "societies"

    def __str__(self):
        return self.name

    @classmethod
    def get_config(cls):
        """Return the singleton config row, creating it with defaults if needed."""
        obj, _ = cls.objects.get_or_create(
            pk=1, defaults={"name": "Smart Society", "city": ""}
        )
        return obj
