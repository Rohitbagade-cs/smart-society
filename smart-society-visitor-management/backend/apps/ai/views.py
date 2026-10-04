"""AI endpoints: ask-your-data chat, voice-note parsing, type classification, security flags."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsGuard
from apps.ai import services


def _llm_error(exc):
    """Map LLM failures to HTTP responses (never leaks the API key)."""
    if isinstance(exc, services.LLMNotConfigured):
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)


class AiChatView(APIView):
    """POST /api/ai/chat/ — admin asks a question, answered from live data."""

    permission_classes = [IsAdmin]

    def post(self, request):
        question = (request.data.get("question") or "").strip()
        if not question:
            return Response(
                {"detail": "question is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            answer = services.answer_question(question)
        except Exception as exc:  # LLM failures -> 502/503, never 500
            return _llm_error(exc)
        return Response({"answer": answer})


class ParseVisitView(APIView):
    """POST /api/ai/parse-visit/ — guard's spoken note -> registration fields."""

    permission_classes = [IsGuard]

    def post(self, request):
        transcript = (request.data.get("transcript") or "").strip()
        if not transcript:
            return Response(
                {"detail": "transcript is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            parsed = services.parse_visit_note(transcript)
        except Exception as exc:
            return _llm_error(exc)
        return Response(parsed)


class ClassifyTypeView(APIView):
    """POST /api/ai/classify-type/ — name + purpose -> visitor type key."""

    permission_classes = [IsGuard]

    def post(self, request):
        name = (request.data.get("name") or "").strip()
        purpose = (request.data.get("purpose") or "").strip()
        phone = (request.data.get("phone") or "").strip()
        if not (name or purpose):
            return Response(
                {"detail": "name or purpose is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            visitor_type, source = services.classify_visitor_type(name, purpose, phone)
        except Exception as exc:
            return _llm_error(exc)
        return Response({"visitor_type": visitor_type, "source": source})


class SuspiciousFlagsView(APIView):
    """GET /api/ai/suspicious/ — rule-based security flags (no LLM needed)."""

    permission_classes = [IsGuard]

    def get(self, request):
        return Response(services.suspicious_flags())


class SecurityBriefingView(APIView):
    """POST /api/ai/security-briefing/ — LLM-written weekly security briefing."""

    permission_classes = [IsGuard]

    def post(self, request):
        try:
            briefing = services.security_briefing()
        except Exception as exc:
            return _llm_error(exc)
        return Response({"briefing": briefing})


class LookupVisitorView(APIView):
    """POST /api/ai/lookup-visitor/ — find a past visitor by phone/name.

    Returns their most recent details (type, vehicle, ID proof) so the
    guard form can be auto-filled. No LLM needed.
    """

    permission_classes = [IsGuard]

    def post(self, request):
        from apps.visitors.models import Visitor

        name = (request.data.get("name") or "").strip()
        phone = (request.data.get("phone") or "").strip()
        visitor = None
        if phone:
            visitor = (
                Visitor.objects.filter(phone=phone).order_by("-created_at").first()
            )
        if visitor is None and name:
            visitor = (
                Visitor.objects.filter(full_name__iexact=name)
                .order_by("-created_at")
                .first()
            )
        if visitor is None:
            return Response({"found": False})
        return Response(
            {
                "found": True,
                "full_name": visitor.full_name,
                "phone": visitor.phone,
                "visitor_type": visitor.visitor_type,
                "vehicle_number": visitor.vehicle_number or None,
                "id_proof_type": visitor.id_proof_type or None,
                "id_proof_number": visitor.id_proof_number or None,
            }
        )
