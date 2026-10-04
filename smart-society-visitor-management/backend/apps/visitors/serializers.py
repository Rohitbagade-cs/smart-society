"""
Serializers for the visitor lifecycle: Visitor, VisitRequest, Approval,
AccessLog, Notification, OTPCode, AuditLog.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.visitors.models import (
    AccessLog,
    Approval,
    AuditLog,
    Notification,
    OTPCode,
    VisitRequest,
    Visitor,
)

User = get_user_model()


class VisitorSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True
    )

    class Meta:
        model = Visitor
        fields = [
            "id",
            "full_name",
            "phone",
            "id_proof_type",
            "id_proof_number",
            "photo_url",
            "visitor_type",
            "vehicle_number",
            "created_by",
            "created_by_username",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]


class ApprovalSerializer(serializers.ModelSerializer):
    decided_by_username = serializers.CharField(
        source="decided_by.username", read_only=True
    )

    class Meta:
        model = Approval
        fields = [
            "id",
            "visit_request",
            "decided_by",
            "decided_by_username",
            "decision",
            "decided_at",
            "note",
        ]
        read_only_fields = ["id", "decided_at"]


class AccessLogSerializer(serializers.ModelSerializer):
    recorded_by_username = serializers.CharField(
        source="recorded_by.username", read_only=True
    )
    visitor_name = serializers.CharField(
        source="visit_request.visitor.full_name", read_only=True
    )

    class Meta:
        model = AccessLog
        fields = [
            "id",
            "visit_request",
            "visitor_name",
            "gate",
            "direction",
            "timestamp",
            "recorded_by",
            "recorded_by_username",
        ]
        read_only_fields = ["id", "timestamp", "recorded_by"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "recipient",
            "title",
            "message",
            "is_read",
            "created_at",
            "related_request",
        ]
        read_only_fields = ["id", "recipient", "created_at", "related_request"]


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(
        source="actor.username", read_only=True, default=None
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor",
            "actor_username",
            "action",
            "entity",
            "entity_id",
            "timestamp",
            "ip_address",
            "details",
        ]


class VisitRequestSerializer(serializers.ModelSerializer):
    """Read/detail serializer for visit requests."""

    visitor = VisitorSerializer(read_only=True)
    resident_username = serializers.CharField(
        source="resident.username", read_only=True
    )
    resident_flat = serializers.CharField(
        source="resident.resident_profile.flat_no", read_only=True, default=None
    )
    approvals = ApprovalSerializer(many=True, read_only=True)

    class Meta:
        model = VisitRequest
        fields = [
            "id",
            "visitor",
            "resident",
            "resident_username",
            "resident_flat",
            "purpose",
            "expected_at",
            "status",
            "qr_token",
            "otp_verified",
            "created_by",
            "created_at",
            "approvals",
        ]
        read_only_fields = [
            "id",
            "status",
            "qr_token",
            "otp_verified",
            "created_by",
            "created_at",
        ]


class VisitRequestCreateSerializer(serializers.Serializer):
    """
    Create serializer for POST /api/visit-requests/.

    Accepts either:
      - "visitor": nested visitor payload (a new Visitor row is created), or
      - "visitor_id": id of an existing Visitor row,
    plus "resident_id", "purpose" and "expected_at".
    """

    visitor = VisitorSerializer(required=False)
    visitor_id = serializers.IntegerField(required=False)
    resident_id = serializers.IntegerField()
    purpose = serializers.CharField(max_length=255)
    expected_at = serializers.DateTimeField()

    def validate(self, attrs):
        if not attrs.get("visitor") and not attrs.get("visitor_id"):
            raise serializers.ValidationError(
                "Provide either 'visitor' (nested) or 'visitor_id'."
            )
        if attrs.get("visitor") and attrs.get("visitor_id"):
            raise serializers.ValidationError(
                "Provide only one of 'visitor' or 'visitor_id'."
            )
        if attrs.get("visitor_id"):
            try:
                attrs["visitor_obj"] = Visitor.objects.get(id=attrs["visitor_id"])
            except Visitor.DoesNotExist:
                raise serializers.ValidationError(
                    {"visitor_id": "Visitor not found."}
                )
        try:
            attrs["resident_obj"] = User.objects.get(id=attrs["resident_id"])
        except User.DoesNotExist:
            raise serializers.ValidationError({"resident_id": "Resident not found."})
        if attrs["resident_obj"].role != User.Role.RESIDENT:
            raise serializers.ValidationError(
                {"resident_id": "Selected user is not a resident."}
            )
        return attrs
