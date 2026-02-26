"""
Gabi Hub — Unified FastAPI Application
Serves all 4 modules: nGhost, Law & Comply, nTalkSQL, InsightCare
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import get_settings
from app.core.logging_config import setup_logging

# ── Initialize settings, then structured logging ──
settings = get_settings()
setup_logging(level=settings.log_level)
logger = logging.getLogger("gabi.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm services on startup (non-blocking — app starts even if services fail)."""
    from app.core.auth import _init_firebase
    logger.info("Starting Gabi Hub API v0.3.0")
    try:
        _init_firebase()
        logger.info("Firebase initialized")
    except Exception as e:
        logger.warning("Firebase init failed (non-fatal): %s", e)
    logger.info("Startup complete")
    yield
    logger.info("Shutting down Gabi Hub API")


app = FastAPI(
    title="Gabi Hub API",
    description="Unified AI Backend — nGhost + Law & Comply + nTalkSQL + InsightCare",
    version="0.3.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.gcp_project_id == "" else None,  # Disable docs in prod
    redoc_url=None,
)

# ── Middleware (order matters: last added = first executed) ──

# 1. CORS — tightened: explicit methods and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)

# 2. Request logging — structured JSON with correlation
from app.middleware.request_logging import RequestLoggingMiddleware
app.add_middleware(RequestLoggingMiddleware)

# 3. Security headers — HSTS, CSP, X-Frame-Options
from app.middleware.security_headers import SecurityHeadersMiddleware
app.add_middleware(SecurityHeadersMiddleware)

# 4. Global error handler — sanitizes exceptions, never leaks internals
from app.middleware.error_handler import ErrorHandlerMiddleware
app.add_middleware(ErrorHandlerMiddleware)

# ── Health Check ──
from app.core.health import router as health_router
app.include_router(health_router, tags=["Health"])

# ── Module Routers ──
from app.modules.ghost.router import router as ghost_router
from app.modules.law.router import router as law_router
from app.modules.ntalk.router import router as ntalk_router
from app.modules.insightcare.router import router as insightcare_router

app.include_router(ghost_router, prefix="/api/ghost", tags=["nGhost"])
app.include_router(law_router, prefix="/api/law", tags=["Law & Comply"])
app.include_router(ntalk_router, prefix="/api/ntalk", tags=["nTalkSQL"])
app.include_router(insightcare_router, prefix="/api/insightcare", tags=["InsightCare"])

# ── Admin Router ──
from app.modules.admin.router import router as admin_router
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])

# ── LGPD Compliance (Data Subject Rights) ──
from app.modules.admin.lgpd_router import router as lgpd_router
app.include_router(lgpd_router, prefix="/api/admin/lgpd", tags=["LGPD"])

# ── Auth Router ──
from app.core.auth import router as auth_router
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])

# ── Chat Router ──
from app.modules.chat.router import router as chat_router
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])

