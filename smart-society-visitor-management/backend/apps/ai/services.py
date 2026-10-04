"""AI services for the Smart Society Visitor Management system.

LLM access goes through Gemini's OpenAI-compatible chat-completions endpoint
(https://generativelanguage.googleapis.com/v1beta/openai). Credentials come
ONLY from local environment variables — never from chat or code:

    LLM_API_KEY   Gemini API key (required)
    LLM_BASE_URL  override, defaults to the Gemini OpenAI-compatible base URL
    LLM_MODEL     override, defaults to gemini-2.5-flash

No third-party HTTP library is needed: the client uses the stdlib (urllib).

Also hosts the rule-based security-flag engine (no LLM needed).
"""

import json
import os
import re
import urllib.error
import urllib.request
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

VISITOR_TYPES = ("guest", "delivery", "service", "cab", "other")


class LLMNotConfigured(Exception):
    """Raised when no LLM_API_KEY is available."""


def _llm_settings():
    return (
        os.environ.get("LLM_API_KEY", "").strip(),
        os.environ.get(
            "LLM_BASE_URL",
            "https://generativelanguage.googleapis.com/v1beta/openai",
        ).rstrip("/"),
        os.environ.get("LLM_MODEL", "gemini-2.5-flash").strip(),
    )


def chat_complete(messages, temperature=0.2, max_tokens=4000):
    """One chat-completions call. Returns the assistant's text reply.

    Raises LLMNotConfigured when no key is set, RuntimeError on API failure.

    Note: max_tokens must be generous because Gemini is a reasoning model —
    its internal thinking consumes part of the token budget before the
    visible answer starts. A tight budget truncates the answer mid-sentence.
    """
    api_key, base_url, model = _llm_settings()
    if not api_key:
        raise LLMNotConfigured(
            "LLM_API_KEY is not set. Set it as a local environment variable "
            "and restart the backend."
        )
    payload = json.dumps(
        {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")[:400]
        raise RuntimeError(f"LLM request failed (HTTP {exc.code}): {detail}")
    except urllib.error.URLError as exc:
        raise RuntimeError(f"LLM request failed: {exc.reason}")
    choices = data.get("choices") or []
    text = (choices[0].get("message", {}) or {}).get("content") or ""
    return text.strip()


def _flat_of(user):
    """Best-effort flat number for a resident user (None when unknown)."""
    try:
        return user.resident_profile.flat_no
    except Exception:
        return None


# ---------------------------------------------------------------------------
# 1. Ask-your-data chatbot: grounded Q&A over live tables
# ---------------------------------------------------------------------------

CHAT_SYSTEM = (
    "You are the AI assistant for a housing society's visitor management system. "
    "Answer the admin's question using ONLY the live data snapshot below. "
    "If the snapshot does not contain the answer, say so honestly instead of guessing. "
    "Keep answers short and plain — simple sentences, no markdown tables."
)


def build_society_context():
    """Compact grounded snapshot of live data for the chatbot."""
    from apps.society.models import Society
    from apps.visitors.models import AccessLog, VisitRequest

    society = Society.get_config()
    now = timezone.localtime()
    today = now.date()
    week_start = today - timedelta(days=6)

    today_qs = VisitRequest.objects.filter(created_at__date=today).select_related(
        "visitor", "resident"
    )
    week_qs = VisitRequest.objects.filter(created_at__date__gte=week_start)

    lines = [
        f"Society: {society.name}, {society.city}. "
        f"Visiting hours: {society.visiting_hours_start} to {society.visiting_hours_end}.",
        f"Today ({today}): {today_qs.count()} visit requests.",
        f"Last 7 days: {week_qs.count()} visit requests.",
        "Requests pending resident approval right now: "
        f"{VisitRequest.objects.filter(status='pending').count()}.",
        "Visitors currently checked in (inside): "
        f"{VisitRequest.objects.filter(status='checked_in').count()}.",
    ]

    by_type = (
        week_qs.values("visitor__visitor_type")
        .annotate(n=Count("id"))
        .order_by("-n")
    )
    if by_type:
        lines.append(
            "Requests by visitor type (last 7 days): "
            + ", ".join(
                f"{row['visitor__visitor_type']}: {row['n']}" for row in by_type
            )
        )

    logs = (
        AccessLog.objects.filter(timestamp__date=today)
        .select_related("visit_request__visitor", "visit_request__resident")
        .order_by("-timestamp")[:15]
    )
    for log in logs:
        vr = log.visit_request
        who = vr.visitor.full_name if vr and vr.visitor else "?"
        flat = _flat_of(vr.resident) if vr else None
        lines.append(
            f"Access log {log.timestamp.strftime('%H:%M')}: {who} "
            f"(flat {flat or '?'}) {log.direction} at {log.gate}."
        )

    for r in today_qs.order_by("-created_at")[:10]:
        v = r.visitor
        lines.append(
            f"Request #{r.id}: {v.full_name if v else '?'} "
            f"({v.visitor_type if v else '?'}) visiting flat {_flat_of(r.resident) or '?'} "
            f"({r.resident.username}), status {r.status}, purpose: {r.purpose}."
        )
    return "\n".join(lines)


def answer_question(question):
    context = build_society_context()
    return chat_complete(
        [
            {"role": "system", "content": CHAT_SYSTEM},
            {
                "role": "user",
                "content": f"Live data snapshot:\n{context}\n\nQuestion: {question}",
            },
        ]
    )


# ---------------------------------------------------------------------------
# 2. Voice check-in: parse a guard's spoken note into registration fields
# ---------------------------------------------------------------------------

PARSE_SYSTEM = (
    "You extract visitor registration details from a security guard's spoken note. "
    "Reply with ONLY a JSON object — no other text. Keys: full_name, visitor_type "
    "(exactly one of: guest, delivery, service, cab, other), phone, flat, purpose, "
    "vehicle_number. Use null for anything not mentioned in the note."
)

PARSE_FIELDS = (
    "full_name",
    "visitor_type",
    "phone",
    "flat",
    "purpose",
    "vehicle_number",
)


def parse_visit_note(transcript):
    reply = chat_complete(
        [
            {"role": "system", "content": PARSE_SYSTEM},
            {"role": "user", "content": transcript},
        ],
        temperature=0.0,
        max_tokens=1000,
    )
    match = re.search(r"\{.*\}", reply, re.DOTALL)
    if not match:
        raise RuntimeError("Could not parse the note into visitor details.")
    data = json.loads(match.group(0))
    vt = str(data.get("visitor_type") or "").strip().lower()
    data["visitor_type"] = vt if vt in VISITOR_TYPES else None
    return {k: data.get(k) for k in PARSE_FIELDS}


# ---------------------------------------------------------------------------
# 3. Auto visitor-type classification from name + purpose
# ---------------------------------------------------------------------------

CLASSIFY_SYSTEM = (
    "Classify the visitor into exactly one word: guest, delivery, service, cab, other. "
    "delivery = parcels/food/courier; service = plumber/electrician/maid/technician; "
    "cab = taxi/driver; guest = personal visit (a vague purpose like just 'visit' "
    "or 'meeting' means guest); other = anything else unclear. "
    "Reply with ONLY that word."
)


def classify_visitor_type(name, purpose, phone=""):
    """Classify name + purpose into a visitor-type key.

    Returns (visitor_type, source) where source is "history" when the visitor
    was seen before (their most common past type is reused — no LLM call),
    or "ai" when the LLM classified a brand-new visitor from the text.
    """
    from django.db.models import Count

    from apps.visitors.models import Visitor

    # 1) Known visitor? Reuse their most common past type.
    qs = Visitor.objects.none()
    if phone:
        qs = Visitor.objects.filter(phone=phone.strip())
    if not qs.exists() and name:
        qs = Visitor.objects.filter(full_name__iexact=name.strip())
    if qs.exists():
        common = (
            qs.values("visitor_type").annotate(n=Count("id")).order_by("-n").first()
        )
        if common and common["visitor_type"] in VISITOR_TYPES:
            return common["visitor_type"], "history"

    # 2) New visitor? Ask the LLM from name + purpose.
    reply = chat_complete(
        [
            {"role": "system", "content": CLASSIFY_SYSTEM},
            {"role": "user", "content": f"Name: {name}\nPurpose: {purpose}"},
        ],
        temperature=0.0,
        max_tokens=500,
    )
    word = re.sub(r"[^a-z]", "", reply.lower())
    return (word if word in VISITOR_TYPES else "other"), "ai"


# ---------------------------------------------------------------------------
# 4. Suspicious-visit flags: rule-based, no LLM needed
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# 5. AI security briefing: LLM turns the week's findings into a readable brief
# ---------------------------------------------------------------------------

BRIEFING_SYSTEM = (
    "You are a security analyst for a housing society. Write a short security "
    "briefing in under 120 words: what happened, what looks risky, and one "
    "recommended action. Plain sentences, no markdown tables. If there are no "
    "findings, say the week was quiet and give one general tip."
)


def security_briefing():
    """LLM-written briefing over this week's rule-based findings + live snapshot."""
    flags = suspicious_flags()
    if flags:
        findings = "\n".join(
            f"- [{f['severity']}] {f['title']}: {f['detail']}" for f in flags
        )
    else:
        findings = "No suspicious patterns detected this week."
    return chat_complete(
        [
            {"role": "system", "content": BRIEFING_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"Week's findings:\n{findings}\n\n"
                    f"Society snapshot:\n{build_society_context()}\n\n"
                    "Write the briefing."
                ),
            },
        ],
        temperature=0.3,
    )

def suspicious_flags():
    """Detect suspicious patterns in the last 7 days. Returns a list of flags."""
    from apps.society.models import Society
    from apps.visitors.models import AccessLog, VisitRequest

    flags = []
    now = timezone.localtime()
    week_ago = now - timedelta(days=7)
    society = Society.get_config()

    # 1. Frequent visitors: 5+ requests in 7 days.
    frequent = (
        VisitRequest.objects.filter(created_at__gte=week_ago)
        .values("visitor__id", "visitor__full_name", "visitor__phone")
        .annotate(n=Count("id"))
        .filter(n__gte=5)
        .order_by("-n")[:10]
    )
    for row in frequent:
        flags.append(
            {
                "severity": "high" if row["n"] >= 10 else "medium",
                "title": f"Frequent visitor: {row['visitor__full_name']}",
                "detail": (
                    f"{row['n']} visit requests in the last 7 days "
                    f"(phone {row['visitor__phone'] or '—'})."
                ),
            }
        )

    # 2. After-hours entries (outside the society's visiting hours).
    start, end = society.visiting_hours_start, society.visiting_hours_end
    if start and end:
        logs = (
            AccessLog.objects.filter(timestamp__gte=week_ago, direction="in")
            .select_related("visit_request__visitor")[:300]
        )
        count = 0
        examples = []
        for log in logs:
            t = timezone.localtime(log.timestamp).time()
            if t < start or t > end:
                count += 1
                if len(examples) < 3:
                    vr = log.visit_request
                    who = vr.visitor.full_name if vr and vr.visitor else "?"
                    examples.append(
                        f"{who} at {t.strftime('%H:%M')} ({log.gate})"
                    )
        if count:
            detail = "Recent: " + "; ".join(examples)
            if count > len(examples):
                detail += f" (+{count - len(examples)} more)"
            flags.append(
                {
                    "severity": "high",
                    "title": (
                        f"{count} after-hours "
                        f"{'entry' if count == 1 else 'entries'} "
                        f"(outside {start.strftime('%H:%M')}–{end.strftime('%H:%M')})"
                    ),
                    "detail": detail,
                }
            )

    # 3. Rejected request followed by a fresh request for the same visitor.
    rejected = (
        VisitRequest.objects.filter(status="rejected", created_at__gte=week_ago)
        .select_related("visitor")
        .order_by("-created_at")[:50]
    )
    seen = set()
    for r in rejected:
        if not r.visitor_id or r.visitor_id in seen:
            continue
        retry = VisitRequest.objects.filter(
            visitor_id=r.visitor_id,
            created_at__gt=r.created_at,
            status__in=("pending", "approved"),
        ).exists()
        if retry:
            seen.add(r.visitor_id)
            flags.append(
                {
                    "severity": "medium",
                    "title": f"Rejected request retried: {r.visitor.full_name}",
                    "detail": (
                        f"Request #{r.id} was rejected, then a new request was "
                        "raised for the same visitor."
                    ),
                }
            )

    # 4. Long stays: entered 12+ hours ago, never checked out.
    cutoff = now - timedelta(hours=12)
    long_stays = (
        AccessLog.objects.filter(
            direction="in",
            timestamp__lte=cutoff,
            visit_request__status="checked_in",
        )
        .select_related("visit_request__visitor", "visit_request__resident")
        .order_by("timestamp")[:10]
    )
    for log in long_stays:
        vr = log.visit_request
        who = vr.visitor.full_name if vr and vr.visitor else "?"
        flat = _flat_of(vr.resident) if vr else None
        flags.append(
            {
                "severity": "low",
                "title": f"Long stay: {who}",
                "detail": (
                    f"Entered at {timezone.localtime(log.timestamp).strftime('%d %b %H:%M')} "
                    f"({log.gate}) and never checked out — "
                    f"request #{vr.id}, flat {flat or '—'}."
                ),
            }
        )

    return flags
