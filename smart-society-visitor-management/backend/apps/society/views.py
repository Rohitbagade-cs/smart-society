"""Society config views: readable by everyone, writable by admins only."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsAdmin
from apps.society.models import Society
from apps.society.serializers import SocietySerializer
from apps.visitors.audit import log_audit


class SocietyViewSet(viewsets.ModelViewSet):
    """Singleton society configuration (always pk=1)."""

    serializer_class = SocietySerializer
    queryset = Society.objects.all()
    http_method_names = ["get", "put", "patch", "head", "options"]

    def get_object(self):
        return Society.get_config()

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [IsAdmin()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        society = serializer.save()
        log_audit(
            self.request, "society.update", "society", society.id,
            {"name": society.name},
        )
