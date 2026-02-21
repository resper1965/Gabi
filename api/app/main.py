"""
Gabi Hub — Unified FastAPI Application
Serves all 4 modules: nGhost, Law & Comply, nTalkSQL, InsightCare
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm embedding model and Firebase on startup."""
    import threading
    from app.core.embeddings import _get_model
    from app.core.auth import _init_firebase
    threading.Thread(target=_get_model, daemon=True).start()
    _init_firebase()
    yield


app = FastAPI(
    title="Gabi Hub API",
    description="Unified AI Backend — nGhost + Law & Comply + nTalkSQL + InsightCare",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# ── Auth Router ──
from app.core.auth import router as auth_router
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])

# ── Chat Router ──
from app.modules.chat.router import router as chat_router
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])

