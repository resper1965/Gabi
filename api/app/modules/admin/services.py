"""
Gabi Hub — Admin Services
Business logic for admin operations.
"""

import os
import sys
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.law import KnowledgeDocument
from app.models.law import LegalDocument
from app.models.regulatory import RegulatoryDocument, RegulatoryAnalysis, RegulatoryVersion
from app.core.dynamic_rag import should_retrieve, retrieve_if_needed

async def get_system_stats(db: AsyncSession) -> dict:
    """System-wide statistics for the admin dashboard."""
    user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    ghost_docs = (await db.execute(select(func.count(KnowledgeDocument.id)))).scalar() or 0
    law_docs = (await db.execute(select(func.count(LegalDocument.id)))).scalar() or 0

    pending = (await db.execute(
        select(func.count(User.id)).where(User.status == "pending")
    )).scalar() or 0

    try:
        size_result = await db.execute(text("SELECT pg_database_size(current_database())"))
        db_size_bytes = size_result.scalar() or 0
        db_size_mb = round(db_size_bytes / (1024 * 1024), 1)
    except Exception:
        db_size_mb = 0

    return {
        "users": user_count,
        "pending_users": pending,
        "documents": {
            "ghost": ghost_docs,
            "law": law_docs,
            "total": ghost_docs + law_docs,
        },
        "database_size_mb": db_size_mb,
    }


async def get_usage_analytics(db: AsyncSession) -> dict:
    """Usage analytics: queries/day, module breakdown, top users."""
    daily = await db.execute(text("""
        SELECT date_trunc('day', created_at)::date AS day,
               module, COUNT(*) AS cnt
        FROM analytics_events
        WHERE created_at > now() - interval '7 days'
        GROUP BY day, module
        ORDER BY day
    """))
    queries_by_day = [
        {"day": str(row[0]), "module": row[1], "count": row[2]}
        for row in daily
    ]

    top_users = await db.execute(text("""
        SELECT user_id, COUNT(*) AS cnt
        FROM analytics_events
        WHERE created_at > now() - interval '7 days'
        GROUP BY user_id
        ORDER BY cnt DESC
        LIMIT 10
    """))
    top = [{"user_id": row[0], "count": row[1]} for row in top_users]

    module_totals = await db.execute(text("""
        SELECT module, COUNT(*) AS cnt
        FROM analytics_events
        WHERE created_at > now() - interval '7 days'
        GROUP BY module
    """))
    modules = {row[0]: row[1] for row in module_totals}

    total = await db.execute(text("""
        SELECT COUNT(*) FROM analytics_events
        WHERE created_at > now() - interval '7 days'
    """))
    total_count = total.scalar() or 0

    return {
        "period": "7d",
        "total_events": total_count,
        "queries_by_day": queries_by_day,
        "top_users": top,
        "module_totals": modules,
    }


async def simulate_rag_retrieval(query: str, module: str, db: AsyncSession) -> dict:
    intent = await should_retrieve(query, chat_history=[])
    chunks = []
    did_retrieve = False
    
    if intent.get("needs_rag"):
        chunks, did_retrieve = await retrieve_if_needed(
            question=query,
            chat_history=[],
            db=db,
            module=module,
            user_id=None,
            limit=5
        )
        
    return {
        "intent": intent,
        "did_retrieve": did_retrieve,
        "chunks_returned": len(chunks),
        "chunks": chunks
    }

async def list_regulatory_bases(db: AsyncSession) -> dict:
    law_res = await db.execute(
        select(LegalDocument.id, LegalDocument.title, LegalDocument.doc_type, LegalDocument.created_at)
        .where(LegalDocument.is_shared == True, LegalDocument.is_active == True)
    )
    law_docs = [dict(row._mapping) for row in law_res]

    reg_res = await db.execute(
        select(RegulatoryDocument.authority, RegulatoryDocument.tipo_ato, RegulatoryDocument.numero, 
               RegulatoryAnalysis.risco_nivel, RegulatoryAnalysis.resumo_executivo)
        .join(RegulatoryVersion, RegulatoryDocument.id == RegulatoryVersion.document_id)
        .join(RegulatoryAnalysis, RegulatoryVersion.id == RegulatoryAnalysis.version_id)
        .where(RegulatoryDocument.status == "active")
    )
    reg_docs = [dict(row._mapping) for row in reg_res]

    return {"law_documents": law_docs, "regulatory_insights": reg_docs}

async def run_regulatory_ingestion(trigger: str = "manual") -> dict:
    scripts_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "scripts")
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)

    results = {"started_at": datetime.now(timezone.utc).isoformat(), "trigger": trigger, "steps": []}

    scrapers = [
        ("BCB", "scripts.ingest_bcb_normativos", "run_ingestion"),
        ("CMN", "scripts.ingest_cmn_normativos", "run_ingestion"),
        ("CVM", "scripts.ingest_cvm", "run_cvm_ingestion"),
        ("SUSEP", "scripts.ingest_susep", "run_susep_ingestion"),
        ("ANS", "scripts.ingest_ans", "run_ans_ingestion"),
        ("ANPD", "scripts.ingest_anpd", "run_anpd_ingestion"),
        ("ANEEL", "scripts.ingest_aneel", "run_aneel_ingestion"),
    ]

    for source, module_path, func_name in scrapers:
        try:
            import importlib
            mod = importlib.import_module(module_path)
            fn = getattr(mod, func_name)
            await fn()
            results["steps"].append({"source": source, "status": "ok"})
        except Exception as e:
            results["steps"].append({"source": source, "status": "error", "detail": str(e)})

    results["finished_at"] = datetime.now(timezone.utc).isoformat()
    return results
