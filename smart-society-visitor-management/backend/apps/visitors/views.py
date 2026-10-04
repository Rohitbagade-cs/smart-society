"""
Visitors views: the full gate workflow.

- VisitorViewSet          guards/admins — CRUD + search/type/date filters
- VisitRequestViewSet    guards/admins create; residents see only their own;
                         /respond/ (resident), /send-otp/ (guard), /qr/ (PNG)
- OTPVerifyView          guard verifies the 6-digit OTP
- AccessLogViewSet       guards/admins — entry/exit with status transitions
- NotificationViewSet    per-user inbox + unread count
- DailyReportView / MonthlyReportView   admin reports
- AuditLogViewSet        admin, read-only, filterable
"""

from django.conf import settings
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import IsAdmin, IsGuard, IsGuardOrResident, IsResident
from apps.society.models import Society
from apps.visitors.audit import log_audit
from apps.visitors.models import (
    AccessLog,
    Approval,
    AuditLog,
    Notification,
    OTPCode,
    VisitRequest,
    Visitor,
)
from apps.visitors.serializers import (
    AccessLogSerializer,
    ApprovalSerializer,
    AuditLogSerializer,
    NotificationSerializer,
    VisitRequestCreateSerializer,
    VisitRequestSerializer,
    VisitorSerializer,
)
from apps.visitors.utils import (
    build_qr_payload,
    generate_otp_code,
    generate_qr_token,
    hash_otp_code,
    otp_expiry,
    render_qr_png,
)


def _notify(recipient, title, message, related_request=None):
    """Create an in-app notification row."""
    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        related_request=related_request,
    )


class VisitorViewSet(viewsets.ModelViewSet):
    """Guard/admin visitor registry. Searchable by name/phone, filterable."""

    serializer_class = VisitorSerializer
    permission_classes = [IsGuard]

    def get_queryset(self):
        qs = Visitor.objects.select_related("created_by").order_by("-created_at")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(full_name__icontains=search) | qs.filter(
                phone__icontains=search
            )
        vtype = self.request.query_params.get("type")
        if vtype:
            qs = qs.filter(visitor_type=vtype)
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        visitor = serializer.save(created_by=self.request.user)
        log_audit(
            self.request, "visitor.create", "visitor", visitor.id,
            {"full_name": visitor.full_name, "visitor_type": visitor.visitor_type},
        )

    def perform_update(self, serializer):
        visitor = serializer.save()
        log_audit(
            self.request, "visitor.update", "visitor", visitor.id,
            {"full_name": visitor.full_name},
        )

    def perform_destroy(self, instance):
        log_audit(
            self.request, "visitor.delete", "visitor", instance.id,
            {"full_name": instance.full_name},
        )
        instance.delete()


class VisitRequestViewSet(viewsets.ModelViewSet):
    """
    Visit-request lifecycle.

    - List: guards/admins see all; residents see only their own.
    - Create: guards/admins register a visitor request for a resident.
    - /respond/: resident approves/rejects their own pending request.
    - /send-otp/: guard issues a 6-digit OTP to the resident.
    - /qr/: PNG QR pass for the request.
    """

    serializer_class = VisitRequestSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action == "scan_qr":
            return [IsGuard()]
        if self.action == "create":
            # Guards register walk-ins; residents pre-register (invite) their own visitors.
            return [IsGuardOrResident()]
        if self.action in ("respond",):
            return [IsResident()]
        return super().get_permissions()  # IsAuthenticated default

    def get_queryset(self):
        user = self.request.user
        qs = (
            VisitRequest.objects.select_related("visitor", "resident")
            .prefetch_related("approvals")
            .order_by("-created_at")
        )
        if user.role == User.Role.RESIDENT:
            # Residents see only their own visit requests.
            qs = qs.filter(resident=user)
        # Guards and admins see everything.
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return VisitRequestCreateSerializer
        return VisitRequestSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        # Residents invite their own visitors: they ARE the approver, so the
        # request is pre-authorized (no manual approval round-trip). The
        # resident_id is forced to the caller — a spoofed id is ignored.
        pre_authorized = request.user.role == User.Role.RESIDENT
        if pre_authorized:
            data["resident_id"] = request.user.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Build the visitor row (nested payload or existing row).
        if data.get("visitor"):
            visitor = Visitor.objects.create(
                created_by=request.user, **data["visitor"]
            )
        else:
            visitor = data["visitor_obj"]

        visit_request = VisitRequest.objects.create(
            visitor=visitor,
            resident=data["resident_obj"],
            purpose=data["purpose"],
            expected_at=data["expected_at"],
            status=(
                VisitRequest.Status.APPROVED
                if pre_authorized
                else VisitRequest.Status.PENDING
            ),
            qr_token=generate_qr_token(),
            created_by=request.user,
        )
        if pre_authorized:
            log_audit(
                request, "visit_request.pre_authorize", "visit_request", visit_request.id,
                {"visitor": visitor.full_name, "resident": visit_request.resident.username},
            )
        else:
            _notify(
                visit_request.resident,
                "New visitor request",
                f"{visitor.full_name} ({visitor.get_visitor_type_display()}) "
                f"wants to visit you: {visit_request.purpose}. "
                "Please approve or reject.",
                related_request=visit_request,
            )
            log_audit(
                request, "visit_request.create", "visit_request", visit_request.id,
                {"visitor": visitor.full_name, "resident": visit_request.resident.username},
            )
        return Response(
            VisitRequestSerializer(visit_request).data,
            status=status.HTTP_201_CREATED,
        )

    # ------------------------------------------------------------------
    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        """
        Resident approves/rejects their own pending request.
        Body: {"action": "approve"|"reject", "note": "..."}.
        """
        visit_request = self.get_object()

        # Residents may only respond to their own requests.
        if (
            request.user.role == User.Role.RESIDENT
            and visit_request.resident_id != request.user.id
        ):
            raise PermissionDenied("You can only respond to your own visit requests.")
        if visit_request.status != VisitRequest.Status.PENDING:
            raise ValidationError("Only pending requests can be responded to.")

        action_value = request.data.get("action")
        if action_value not in ("approve", "reject"):
            raise ValidationError(
                {"action": "Must be 'approve' or 'reject'."}
            )
        note = request.data.get("note", "")

        visit_request.status = (
            VisitRequest.Status.APPROVED
            if action_value == "approve"
            else VisitRequest.Status.REJECTED
        )
        visit_request.save(update_fields=["status"])

        approval = Approval.objects.create(
            visit_request=visit_request,
            decided_by=request.user,
            decision=Approval.Decision.APPROVE
            if action_value == "approve"
            else Approval.Decision.REJECT,
            note=note,
        )

        # Notify the guard who registered the request.
        if visit_request.created_by:
            _notify(
                visit_request.created_by,
                f"Visitor request {action_value}d",
                f"Resident {visit_request.resident.username} {action_value}d the "
                f"visit of {visit_request.visitor.full_name}.",
                related_request=visit_request,
            )

        log_audit(
            request, f"visit_request.{action_value}", "visit_request", visit_request.id,
            {"decision": action_value, "note": note},
        )
        return Response(ApprovalSerializer(approval).data)

    # ------------------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="send-otp")
    def send_otp(self, request, pk=None):
        """
        Guard issues a 6-digit OTP for a visit request (10-minute TTL).
        The raw code is never stored — only its SHA-256 hash. In DEBUG the
        raw code is returned so the guard can relay it without an SMS vendor.
        """
        self.check_permissions(request)  # action-level guard below
        if request.user.role not in (User.Role.ADMIN, User.Role.GUARD):
            raise PermissionDenied("Only guards can send OTPs.")
        visit_request = self.get_object()

        # Invalidate any previous unused OTPs for this request.
        OTPCode.objects.filter(
            visit_request=visit_request, used=False
        ).update(used=True)

        code = generate_otp_code()
        OTPCode.objects.create(
            visit_request=visit_request,
            code_hash=hash_otp_code(code),
            expires_at=otp_expiry(),
        )
        _notify(
            visit_request.resident,
            "Visitor OTP",
            f"An OTP was generated for the visit of "
            f"{visit_request.visitor.full_name}. It is valid for 10 minutes.",
            related_request=visit_request,
        )
        log_audit(
            request, "otp.send", "visit_request", visit_request.id, {}
        )
        payload = {"detail": "OTP sent to the resident.", "expires_in_minutes": 10}
        if settings.DEBUG:
            payload["otp_code"] = code  # DEBUG only
        return Response(payload)

    # ------------------------------------------------------------------
    @action(detail=True, methods=["get"])
    def qr(self, request, pk=None):
        """Return the visitor pass as a PNG QR code."""
        visit_request = self.get_object()
        if visit_request.status in (
            VisitRequest.Status.CANCELLED,
            VisitRequest.Status.REJECTED,
        ):
            raise ValidationError("QR pass is not available for this request.")
        society = Society.get_config()
        payload = build_qr_payload(visit_request, society.name)
        png = render_qr_png(payload)
        return HttpResponse(png, content_type="image/png")

    # ------------------------------------------------------------------
    @action(detail=False, methods=["post"], url_path="scan-qr")
    def scan_qr(self, request):
        """
        Guard-side QR validation — simulates scanning the visitor's QR pass.
        Body: {"token": "<qr_token>"} — the token embedded in the QR image.
        Returns the visit request when the pass is genuine and usable.
        """
        token = (request.data.get("token") or "").strip()
        if not token:
            raise ValidationError({"token": "QR token is required."})
        try:
            visit_request = (
                VisitRequest.objects.select_related("visitor", "resident")
                .prefetch_related("approvals")
                .get(qr_token=token)
            )
        except VisitRequest.DoesNotExist:
            raise ValidationError({"token": "Invalid or unknown QR pass."})
        if visit_request.status in (
            VisitRequest.Status.CANCELLED,
            VisitRequest.Status.REJECTED,
        ):
            raise ValidationError(
                {"token": f"This pass is {visit_request.get_status_display().lower()}."}
            )
        log_audit(
            request, "qr.scan", "visit_request", visit_request.id, {"result": "valid"}
        )
        return Response(VisitRequestSerializer(visit_request).data)


class OTPVerifyView(APIView):
    """
    POST /api/otp/verify/ {"visit_request_id": N, "otp_code": "123456"}
    Guard-side verification: checks hash + expiry, then marks otp_verified.
    """

    permission_classes = [IsGuard]

    def post(self, request):
        visit_request_id = request.data.get("visit_request_id")
        otp_code = request.data.get("otp_code")
        if not visit_request_id or not otp_code:
            raise ValidationError("visit_request_id and otp_code are required.")

        try:
            visit_request = VisitRequest.objects.get(id=visit_request_id)
        except VisitRequest.DoesNotExist:
            raise ValidationError("Visit request not found.")

        otp = (
            OTPCode.objects.filter(
                visit_request=visit_request,
                used=False,
                expires_at__gt=timezone.now(),
            )
            .order_by("-id")
            .first()
        )
        if not otp or otp.code_hash != hash_otp_code(str(otp_code)):
            raise ValidationError("Invalid or expired OTP.")

        otp.used = True
        otp.save(update_fields=["used"])
        visit_request.otp_verified = True
        visit_request.save(update_fields=["otp_verified"])
        log_audit(
            request, "otp.verify", "visit_request", visit_request.id, {}
        )
        return Response({"detail": "OTP verified.", "otp_verified": True})


class AccessLogViewSet(viewsets.ModelViewSet):
    """
    Guards record physical entry/exit at a gate.

    - direction "in":  requires status approved (or otp_verified for
                       pre-registered visitors) -> status becomes checked_in.
    - direction "out": requires status checked_in -> checked_out.
    """

    serializer_class = AccessLogSerializer
    permission_classes = [IsGuard]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = AccessLog.objects.select_related(
            "visit_request", "visit_request__visitor", "recorded_by"
        ).order_by("-timestamp")
        date = self.request.query_params.get("date")  # YYYY-MM-DD
        if date:
            qs = qs.filter(timestamp__date=date)
        gate = self.request.query_params.get("gate")
        if gate:
            qs = qs.filter(gate__icontains=gate)
        return qs

    def create(self, request, *args, **kwargs):
        visit_request_id = request.data.get("visit_request_id")
        gate = request.data.get("gate", "Main Gate")
        direction = request.data.get("direction")
        if direction not in (AccessLog.Direction.IN, AccessLog.Direction.OUT):
            raise ValidationError({"direction": "Must be 'in' or 'out'."})
        try:
            visit_request = VisitRequest.objects.select_related(
                "visitor", "resident"
            ).get(id=visit_request_id)
        except VisitRequest.DoesNotExist:
            raise ValidationError({"visit_request_id": "Visit request not found."})

        if direction == AccessLog.Direction.IN:
            allowed = visit_request.status == VisitRequest.Status.APPROVED
            if not allowed and visit_request.otp_verified:
                # Pre-registered visitor verified via OTP but not yet approved:
                # treat OTP verification as authorization for entry.
                allowed = visit_request.status == VisitRequest.Status.PENDING
            if not allowed:
                raise ValidationError(
                    "Entry requires an approved (or OTP-verified) request."
                )
            visit_request.status = VisitRequest.Status.CHECKED_IN
            event = "entry"
        else:  # "out"
            if visit_request.status != VisitRequest.Status.CHECKED_IN:
                raise ValidationError(
                    "Exit requires the visitor to be checked in first."
                )
            visit_request.status = VisitRequest.Status.CHECKED_OUT
            event = "exit"

        visit_request.save(update_fields=["status"])
        access_log = AccessLog.objects.create(
            visit_request=visit_request,
            gate=gate,
            direction=direction,
            recorded_by=request.user,
        )
        if direction == AccessLog.Direction.IN:
            _notify(
                visit_request.resident,
                "Visitor arrived",
                f"{visit_request.visitor.full_name} checked in at {gate}.",
                related_request=visit_request,
            )
        log_audit(
            request, f"access_log.{event}", "access_log", access_log.id,
            {"visit_request_id": visit_request.id, "gate": gate, "direction": direction},
        )
        return Response(
            AccessLogSerializer(access_log).data, status=status.HTTP_201_CREATED
        )


class NotificationViewSet(viewsets.ModelViewSet):
    """Per-user inbox. Residents/guards see only their own notifications."""

    serializer_class = NotificationSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        # Only allow flipping is_read; title/message stay immutable.
        instance = self.get_object()
        if set(request.data.keys()) - {"is_read"}:
            raise ValidationError("Only 'is_read' may be updated.")
        instance.is_read = bool(request.data.get("is_read", True))
        instance.save(update_fields=["is_read"])
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"count": count})


class DailyReportView(APIView):
    """GET /api/reports/daily/?date=YYYY-MM-DD — admin daily gate summary."""

    permission_classes = [IsAdmin]

    def get(self, request):
        date_str = request.query_params.get("date")
        target = (
            timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
            if date_str
            else timezone.localdate()
        )
        requests = VisitRequest.objects.filter(created_at__date=target)
        logs = (
            AccessLog.objects.select_related("visit_request__visitor")
            .filter(timestamp__date=target)
            .order_by("timestamp")
        )
        by_type = (
            requests.values("visitor__visitor_type")
            .annotate(count=Count("id"))
            .order_by("visitor__visitor_type")
        )
        data = {
            "date": str(target),
            "total_requests": requests.count(),
            "checked_in": requests.filter(
                status=VisitRequest.Status.CHECKED_IN
            ).count(),
            "checked_out": requests.filter(
                status=VisitRequest.Status.CHECKED_OUT
            ).count(),
            "pending_approvals": requests.filter(
                status=VisitRequest.Status.PENDING
            ).count(),
            "by_type": {
                item["visitor__visitor_type"]: item["count"] for item in by_type
            },
            "logs": AccessLogSerializer(logs, many=True).data,
        }
        return Response(data)


class MonthlyReportView(APIView):
    """GET /api/reports/monthly/?year=YYYY&month=M — admin monthly summary."""

    permission_classes = [IsAdmin]

    def get(self, request):
        now = timezone.localdate()
        try:
            year = int(request.query_params.get("year", now.year))
            month = int(request.query_params.get("month", now.month))
        except (TypeError, ValueError):
            raise ValidationError("year and month must be integers.")
        requests = VisitRequest.objects.filter(
            created_at__year=year, created_at__month=month
        )
        by_day = (
            requests.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        by_type = (
            requests.values("visitor__visitor_type")
            .annotate(count=Count("id"))
            .order_by("visitor__visitor_type")
        )
        return Response(
            {
                "year": year,
                "month": month,
                "total_requests": requests.count(),
                "by_day": [
                    {"date": str(item["day"]), "count": item["count"]}
                    for item in by_day
                ],
                "by_type": {
                    item["visitor__visitor_type"]: item["count"]
                    for item in by_type
                },
            }
        )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin, read-only audit trail. Filter with ?action= & ?entity=."""

    queryset = AuditLog.objects.select_related("actor").order_by("-timestamp")
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        action_param = self.request.query_params.get("action")
        if action_param:
            qs = qs.filter(action__icontains=action_param)
        entity_param = self.request.query_params.get("entity")
        if entity_param:
            qs = qs.filter(entity__icontains=entity_param)
        return qs


# ---------------------------------------------------------------------------
# Public visitor pass — the link guards share with visitors (SMS/WhatsApp).
# No login required: the 32-char hex qr_token is the unguessable key, the same
# pattern as password-reset links. Rejected/cancelled passes return 404.
# ---------------------------------------------------------------------------
class VisitorPassView(APIView):
    """GET /api/visitor-pass/<token>/ -> pass details JSON (public)."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def _get_request(self, token):
        try:
            return VisitRequest.objects.select_related(
                "visitor", "resident", "resident__resident_profile"
            ).get(qr_token=token)
        except VisitRequest.DoesNotExist:
            raise NotFound("This pass link is invalid.")

    def get(self, request, token):
        vr = self._get_request(token)
        if vr.status in (VisitRequest.Status.CANCELLED, VisitRequest.Status.REJECTED):
            raise NotFound("This pass is no longer valid.")
        society = Society.get_config()
        profile = getattr(vr.resident, "resident_profile", None)
        return Response(
            {
                "request_id": vr.id,
                "society": society.name,
                "visitor_name": vr.visitor.full_name,
                "visitor_type": vr.visitor.get_visitor_type_display()
                if hasattr(vr.visitor, "get_visitor_type_display")
                else vr.visitor.visitor_type,
                "flat": getattr(profile, "flat_no", None),
                "resident_name": vr.resident.get_full_name() or vr.resident.username,
                "purpose": vr.purpose,
                "expected_at": vr.expected_at,
                "status": vr.status,
                "otp_verified": vr.otp_verified,
            }
        )


class VisitorPassQrView(APIView):
    """GET /api/visitor-pass/<token>/qr/ -> QR pass PNG (public)."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            vr = VisitRequest.objects.select_related("visitor").get(qr_token=token)
        except VisitRequest.DoesNotExist:
            raise NotFound("This pass link is invalid.")
        if vr.status in (VisitRequest.Status.CANCELLED, VisitRequest.Status.REJECTED):
            raise NotFound("This pass is no longer valid.")
        society = Society.get_config()
        png = render_qr_png(build_qr_payload(vr, society.name))
        return HttpResponse(png, content_type="image/png")
