"""
Gabi Hub — Health Check Endpoint
Detailed health status for Cloud Run startup/liveness probes.
"""

from fastapi import APIRouter
from sqlalchemy import text

from app.database import engine

router = APIRouter()


@router.get("/health")
async def health_check():
    """Quick liveness probe — always returns OK."""
    return {"status": "ok", "service": "gabi-api"}


@router.get("/health/ready")
async def readiness_check():
    """
    Deep readiness probe — checks DB connectivity.
    Used by Cloud Run startup probe.
    """
    checks = {}

    # Database
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.scalar()
        checks["database"] = {"status": "ok"}
    except Exception as e:
        checks["database"] = {"status": "error", "detail": str(e)[:100]}

    # Vertex AI (lightweight check — just import)
    try:
        import vertexai  # noqa
        checks["vertex_ai"] = {"status": "ok"}
    except Exception as e:
        checks["vertex_ai"] = {"status": "error", "detail": str(e)[:100]}

    # Firebase Admin
    try:
        import firebase_admin
        if firebase_admin._apps:
            checks["firebase"] = {"status": "ok"}
        else:
            checks["firebase"] = {"status": "not_initialized", "detail": "Will init on first auth request"}
    except Exception as e:
        checks["firebase"] = {"status": "error", "detail": str(e)[:100]}

    # Embeddings model
    try:
        from app.core.embeddings import embed
        test = embed("health check")
        checks["embeddings"] = {"status": "ok", "dimension": len(test)}
    except Exception as e:
        checks["embeddings"] = {"status": "error", "detail": str(e)[:100]}

    all_ok = all(c.get("status") == "ok" for c in checks.values())

    return {
        "status": "ready" if all_ok else "degraded",
        "service": "gabi-api",
        "checks": checks,
    }

