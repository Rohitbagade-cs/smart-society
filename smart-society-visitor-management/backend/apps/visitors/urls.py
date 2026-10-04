"""URL routes for the visitors app (registered under /api/ by config.urls)."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.visitors.views import (
    AccessLogViewSet,
    AuditLogViewSet,
    DailyReportView,
    MonthlyReportView,
    NotificationViewSet,
    OTPVerifyView,
    VisitRequestViewSet,
    VisitorPassQrView,
    VisitorPassView,
    VisitorViewSet,
)

router = DefaultRouter()
router.register("visitors", VisitorViewSet, basename="visitors")
router.register("visit-requests", VisitRequestViewSet, basename="visit-requests")
router.register("access-logs", AccessLogViewSet, basename="access-logs")
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("audit-logs", AuditLogViewSet, basename="audit-logs")

urlpatterns = [
    path("otp/verify/", OTPVerifyView.as_view(), name="otp-verify"),
    path("reports/daily/", DailyReportView.as_view(), name="reports-daily"),
    path("reports/monthly/", MonthlyReportView.as_view(), name="reports-monthly"),
    # Public visitor pass (no login; the qr_token is the unguessable key).
    path("visitor-pass/<str:token>/", VisitorPassView.as_view(), name="visitor-pass"),
    path("visitor-pass/<str:token>/qr/", VisitorPassQrView.as_view(), name="visitor-pass-qr"),
] + router.urls
