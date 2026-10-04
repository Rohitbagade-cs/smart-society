"""
Visitors app models: the full visitor lifecycle.

Visitor -> VisitRequest -> Approval -> AccessLog, with OTP verification,
QR tokens, resident notifications, and a full audit trail.
"""

from django.conf import settings
from django.db import models


class Visitor(models.Model):
    """A person visiting the society. Registered once, reused across visits."""

    class VisitorType(models.TextChoices):
        GUEST = "guest", "Guest"
        DELIVERY = "delivery", "Delivery"
        SERVICE = "service", "Service"
        CAB = "cab", "Cab"
        OTHER = "other", "Other"

    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    id_proof_type = models.CharField(max_length=40, blank=True)  # e.g. Aadhaar, PAN
    id_proof_number = models.CharField(max_length=60, blank=True)
    photo_url = models.URLField(max_length=500, blank=True)
    visitor_type = models.CharField(
        max_length=16, choices=VisitorType.choices, default=VisitorType.GUEST
    )
    vehicle_number = models.CharField(max_length=30, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="visitors_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["full_name"]),
            models.Index(fields=["phone"]),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.visitor_type})"


class VisitRequest(models.Model):
    """A resident-gated request for a visitor to enter the society."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CHECKED_IN = "checked_in", "Checked In"
        CHECKED_OUT = "checked_out", "Checked Out"
        CANCELLED = "cancelled", "Cancelled"

    visitor = models.ForeignKey(
        Visitor, on_delete=models.CASCADE, related_name="visit_requests"
    )
    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="visit_requests",
    )
    purpose = models.CharField(max_length=255)
    expected_at = models.DateTimeField()
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PENDING
    )
    qr_token = models.CharField(max_length=32, unique=True)  # secrets.token_hex(16)
    otp_verified = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="visit_requests_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["resident", "status"]),
        ]

    def __str__(self):
        return f"VisitRequest #{self.id}: {self.visitor.full_name} -> {self.resident.username} [{self.status}]"


class Approval(models.Model):
    """Resident decision on a visit request."""

    class Decision(models.TextChoices):
        APPROVE = "approve", "Approve"
        REJECT = "reject", "Reject"

    visit_request = models.ForeignKey(
        VisitRequest, on_delete=models.CASCADE, related_name="approvals"
    )
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="approvals_made",
    )
    decision = models.CharField(max_length=8, choices=Decision.choices)
    decided_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ["-decided_at"]

    def __str__(self):
        return f"Approval #{self.id}: {self.decision} on request #{self.visit_request_id}"


class AccessLog(models.Model):
    """Physical entry/exit events recorded at a gate by a guard."""

    class Direction(models.TextChoices):
        IN = "in", "In"
        OUT = "out", "Out"

    visit_request = models.ForeignKey(
        VisitRequest, on_delete=models.CASCADE, related_name="access_logs"
    )
    gate = models.CharField(max_length=60, default="Main Gate")
    direction = models.CharField(max_length=3, choices=Direction.choices)
    timestamp = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="access_logs_recorded",
    )

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["timestamp"]),
            models.Index(fields=["gate"]),
        ]

    def __str__(self):
        return f"AccessLog #{self.id}: request #{self.visit_request_id} {self.direction} @ {self.gate}"


class Notification(models.Model):
    """In-app notification delivered to a user."""

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    related_request = models.ForeignKey(
        VisitRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification to {self.recipient.username}: {self.title}"


class OTPCode(models.Model):
    """Single-use OTP hash for guard-side visitor verification (10-min TTL)."""

    visit_request = models.ForeignKey(
        VisitRequest, on_delete=models.CASCADE, related_name="otp_codes"
    )
    code_hash = models.CharField(max_length=64)  # SHA-256 hex of the 6-digit code
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"OTP for request #{self.visit_request_id} (used={self.used})"


class AuditLog(models.Model):
    """Immutable record of security-relevant actions in the system."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=60)  # e.g. user.create, visitor.create
    entity = models.CharField(max_length=60)  # e.g. user, visitor, visit_request
    entity_id = models.IntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["action"]),
            models.Index(fields=["entity"]),
            models.Index(fields=["timestamp"]),
        ]

    def __str__(self):
        actor = self.actor.username if self.actor else "system"
        return f"AuditLog: {actor} {self.action} {self.entity}#{self.entity_id}"
