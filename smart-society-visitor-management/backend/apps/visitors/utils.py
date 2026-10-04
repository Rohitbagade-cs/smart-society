"""
QR / OTP utility functions for the visitors app.
"""

import hashlib
import json
import secrets
from datetime import timedelta

import qrcode
from django.utils import timezone


def generate_qr_token(length_bytes=16):
    """Return a unique 32-char hex token for VisitRequest.qr_token."""
    return secrets.token_hex(length_bytes)


def generate_otp_code():
    """Return a zero-padded 6-digit OTP string."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp_code(code):
    """SHA-256 hex digest of an OTP code (we never store the raw code)."""
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def build_qr_payload(visit_request, society_name):
    """
    Build the JSON payload encoded into the visitor QR pass.
    Guards scan this at the gate to verify the request.
    """
    return {
        "token": visit_request.qr_token,
        "request_id": visit_request.id,
        "society": society_name,
        "visitor": visit_request.visitor.full_name,
        "status": visit_request.status,
    }


def render_qr_png(payload):
    """Render the payload as PNG bytes (qrcode lib, error-corrected)."""
    data = json.dumps(payload)
    img = qrcode.make(data, error_correction=qrcode.constants.ERROR_CORRECT_M)
    from io import BytesIO

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def otp_expiry(minutes=10):
    """Expiry timestamp for a freshly generated OTP."""
    return timezone.now() + timedelta(minutes=minutes)
