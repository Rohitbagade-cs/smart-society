"""URL routes for the AI app (registered under /api/ by config.urls)."""

from django.urls import path

from apps.ai.views import (
    AiChatView,
    ClassifyTypeView,
    LookupVisitorView,
    ParseVisitView,
    SecurityBriefingView,
    SuspiciousFlagsView,
)

urlpatterns = [
    path("ai/chat/", AiChatView.as_view(), name="ai-chat"),
    path("ai/parse-visit/", ParseVisitView.as_view(), name="ai-parse-visit"),
    path("ai/classify-type/", ClassifyTypeView.as_view(), name="ai-classify-type"),
    path("ai/lookup-visitor/", LookupVisitorView.as_view(), name="ai-lookup-visitor"),
    path("ai/suspicious/", SuspiciousFlagsView.as_view(), name="ai-suspicious"),
    path(
        "ai/security-briefing/",
        SecurityBriefingView.as_view(),
        name="ai-security-briefing",
    ),
]
