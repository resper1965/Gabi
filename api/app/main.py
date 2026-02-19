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
    """Pre-warm embedding model on startup."""
    import threading
    from app.core.embeddings import _get_model
    threading.Thread(target=_get_model, daemon=True).start()
    yield


app = FastAPI(
    title="Gabi Hub API",
    description="Unified AI Backend — nGhost + Law & Comply + nTalkSQL + InsightCare",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Module Routers ──
from app.modules.ghost.router import router as ghost_router
from app.modules.law.router import router as law_router
from app.modules.ntalk.router import router as ntalk_router
from app.modules.insightcare.router import router as insightcare_router

app.include_router(ghost_router, prefix="/api/ghost", tags=["nGhost"])
app.include_router(law_router, prefix="/api/law", tags=["Law & Comply"])
app.include_router(ntalk_router, prefix="/api/ntalk", tags=["nTalkSQL"])
app.include_router(insightcare_router, prefix="/api/insightcare", tags=["InsightCare"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gabi-hub", "modules": ["ghost", "law", "ntalk", "insightcare"]}
