"""
Gabi Hub — Unified FastAPI Application
Serves 3 modules: nGhost, Law & Comply (+ Insurance), nTalkSQL
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app import __version__
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
    logger.info("Starting Gabi Hub API v%s", __version__)
    try:
        _init_firebase()
        logger.info("Firebase initialized")
    except (ImportError, RuntimeError, ValueError) as e:
        logger.warning("Firebase init failed (non-fatal): %s", e)

    # Initialize OpenTelemetry (non-blocking)
    try:
        from app.core.telemetry import init_telemetry
        init_telemetry()
    except ImportError as e:
        logger.info("Telemetry init skipped: %s", e)

    # Validate optional dependencies at startup (TD-6)
    try:
        from app.core.startup_checks import check_dependencies, check_embedding_model
        check_dependencies()
        check_embedding_model()
    except (ImportError, ValueError, RuntimeError) as e:
        logger.warning("Startup checks failed (non-fatal): %s", e)

    # NOTE: users.org_id column must exist (managed by Alembic migration).
    # Previously: self-healing ALTER TABLE ran here. Removed in favor of proper migration control.

    logger.info("Startup complete")
    yield
    logger.info("Shutting down Gabi Hub API")


app = FastAPI(
    title="Gabi Hub API",
    description="Unified AI Backend — nGhost + Law & Comply (Legal + Insurance) + nTalkSQL",
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs" if settings.gcp_project_id == "" or settings.enable_docs else None,  # Enable locally or via GABI_ENABLE_DOCS=true
    redoc_url=None,
)

# ── Middleware (order matters: last added = first executed) ──

# 1. Global error handler — sanitizes exceptions, never leaks internals
from app.middleware.error_handler import ErrorHandlerMiddleware
app.add_middleware(ErrorHandlerMiddleware)

# 1.5 FinOps — flush per-request token usage to DB
from app.middleware.finops import FinOpsMiddleware
app.add_middleware(FinOpsMiddleware)

# 2. Security headers — HSTS, CSP, X-Frame-Options
from app.middleware.security_headers import SecurityHeadersMiddleware
app.add_middleware(SecurityHeadersMiddleware)

# 3. Request logging — structured JSON with correlation
from app.middleware.request_logging import RequestLoggingMiddleware
app.add_middleware(RequestLoggingMiddleware)

# 4. Trusted Host — reject requests with invalid Host header
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

# 5. CORS — tightened: explicit methods and headers
# MUST BE LAST ADDED so it surrounds everything (outermost layer)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)

# ── Health Check ──
from app.core.health import router as health_router
app.include_router(health_router, tags=["Health"])

# ── Module Routers ──
from app.modules.law.router import router as law_router
from app.modules.ntalk.router import router as ntalk_router

app.include_router(law_router, prefix="/api/law", tags=["Law & Comply"])
app.include_router(ntalk_router, prefix="/api/ntalk", tags=["nTalkSQL"])


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

# ── Organization Router ──
from app.modules.org.router import router as org_router
app.include_router(org_router, tags=["Organizations"])

# ── Platform Admin Router ──
from app.modules.platform.router import router as platform_router
app.include_router(platform_router, tags=["Platform Admin"])
