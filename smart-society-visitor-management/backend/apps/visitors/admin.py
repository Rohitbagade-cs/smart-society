"""Django admin registrations for the visitors app."""

from django.contrib import admin

from apps.visitors.models import (
    AccessLog,
    Approval,
    AuditLog,
    Notification,
    OTPCode,
    VisitRequest,
    Visitor,
)


@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone", "visitor_type", "created_by", "created_at")
    list_filter = ("visitor_type", "created_at")
    search_fields = ("full_name", "phone", "id_proof_number")


@admin.register(VisitRequest)
class VisitRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "visitor",
        "resident",
        "status",
        "otp_verified",
        "expected_at",
        "created_at",
    )
    list_filter = ("status", "otp_verified", "created_at")
    search_fields = ("visitor__full_name", "resident__username", "qr_token")
    readonly_fields = ("qr_token",)


@admin.register(Approval)
class ApprovalAdmin(admin.ModelAdmin):
    list_display = ("id", "visit_request", "decided_by", "decision", "decided_at")
    list_filter = ("decision",)


@admin.register(AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    list_display = ("id", "visit_request", "gate", "direction", "timestamp", "recorded_by")
    list_filter = ("direction", "gate")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("recipient", "title", "is_read", "created_at")
    list_filter = ("is_read",)
    search_fields = ("title", "recipient__username")


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ("visit_request", "expires_at", "used")
    list_filter = ("used",)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "actor", "action", "entity", "entity_id", "ip_address")
    list_filter = ("action", "entity")
    search_fields = ("action", "entity", "actor__username")
    readonly_fields = ("timestamp",)

    def has_add_permission(self, request):
        return False  # audit rows are written by the app, not by hand
