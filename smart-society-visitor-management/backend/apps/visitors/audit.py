"""
Audit helper: records security-relevant actions from views into AuditLog.
"""

from apps.visitors.models import AuditLog


def get_client_ip(request):
    """Best-effort client IP (honours X-Forwarded-For behind a proxy)."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_audit(request, action, entity, entity_id=None, details=None):
    """
    Write an audit entry.

    action     e.g. "user.create", "visit_request.approve", "access_log.entry"
    entity     model/table name, e.g. "user", "visitor", "visit_request"
    entity_id  primary key of the affected row (may be None)
    details    extra JSON context
    """
    user = getattr(request, "user", None)
    actor = user if user and user.is_authenticated else None
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        entity=entity,
        entity_id=entity_id,
        ip_address=get_client_ip(request),
        details=details or {},
    )
