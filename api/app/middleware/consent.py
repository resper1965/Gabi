"""
Gabi Hub — Consent Tracking Middleware
Tracks user consent on first access (LGPD compliance).
Records consent timestamp and terms version in user profile.
"""

import logging
from datetime import datetime, timezone

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("gabi.consent")

# Paths that don't require consent check
EXEMPT_PATHS = {
    "/health",
    "/health/ready",
    "/health/live",
    "/docs",
    "/openapi.json",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/me",
    "/api/auth/consent",  # The consent endpoint itself
}

CURRENT_TERMS_VERSION = "2026.1"


class ConsentMiddleware(BaseHTTPMiddleware):
    """
    Checks if the authenticated user has given consent.
    If not, returns 451 (Unavailable For Legal Reasons) with consent prompt.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip exempt paths
        if request.url.path in EXEMPT_PATHS or request.url.path.startswith("/health"):
            return await call_next(request)

        # Skip if no auth header (will fail at auth level anyway)
        if "authorization" not in request.headers:
            return await call_next(request)

        # Check consent flag (set by auth middleware after token verification)
        user_consent = getattr(request.state, "user_consent_given", None)

        if user_consent is False:
            return JSONResponse(
                status_code=451,
                content={
                    "detail": "Consentimento necessário para usar a plataforma.",
                    "action": "POST /api/auth/consent",
                    "terms_version": CURRENT_TERMS_VERSION,
                    "terms_url": "/docs/termos-de-uso",
                },
            )

        return await call_next(request)
