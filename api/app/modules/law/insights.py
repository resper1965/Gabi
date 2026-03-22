"""
Law & Comply — Unified Regulatory Insights Endpoints
Serves AI-generated analyses + stats for the Radar Regulatório 2.0.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.auth import CurrentUser, get_current_user

router = APIRouter()


@router.get("/insights")
async def list_regulatory_insights(
    authority: str | None = None,
    since: str | None = None,
    until: str | None = None,
    limit: int = Query(default=100, le=500),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List AI-generated regulatory insights (analyses).
    Filters: authority (comma-sep), since/until (ISO date), limit.
    """
    from app.models.regulatory import RegulatoryAnalysis, RegulatoryVersion, RegulatoryDocument

    query = (
        select(RegulatoryAnalysis, RegulatoryVersion, RegulatoryDocument)
        .join(RegulatoryVersion, RegulatoryAnalysis.version_id == RegulatoryVersion.id)
        .join(RegulatoryDocument, RegulatoryVersion.document_id == RegulatoryDocument.id)
        .order_by(RegulatoryAnalysis.analisado_em.desc())
        .limit(limit)
    )

    if authority:
        authorities = [a.strip().upper() for a in authority.split(",")]
        query = query.where(RegulatoryDocument.authority.in_(authorities))

    if since:
        try:
            since_dt = datetime.fromisoformat(since)
            query = query.where(RegulatoryAnalysis.analisado_em >= since_dt)
        except ValueError:
            pass

    if until:
        try:
            until_dt = datetime.fromisoformat(until)
            query = query.where(RegulatoryAnalysis.analisado_em <= until_dt)
        except ValueError:
            pass

    result = await db.execute(query)

    insights = []
    for analysis, version, doc in result.all():
        insights.append({
            "id": analysis.id,
            "doc_id": doc.id,
            "authority": doc.authority,
            "tipo_ato": doc.tipo_ato,
            "numero": doc.numero,
            "data_publicacao": doc.data_publicacao.isoformat() if doc.data_publicacao else None,
            "resumo_executivo": analysis.resumo_executivo,
            "risco_nivel": analysis.risco_nivel,
            "risco_justificativa": analysis.risco_justificativa,
            "analisado_em": analysis.analisado_em.isoformat() if analysis.analisado_em else None,
            "extra_data": analysis.extra_data or {},
        })

    return insights


@router.get("/insights/stats")
async def get_insight_stats(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dashboard KPIs for the Radar Regulatório.
    Returns: total docs, risk distribution, per-authority counts,
    new docs in last 7d, last update timestamp, and weekly timeline.
    """
    from app.models.regulatory import RegulatoryAnalysis, RegulatoryDocument

    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    now - timedelta(days=30)

    # Total documents
    total_docs_q = select(func.count(RegulatoryDocument.id))
    total_docs = (await db.execute(total_docs_q)).scalar() or 0

    # Total insights (analyses)
    total_insights_q = select(func.count(RegulatoryAnalysis.id))
    total_insights = (await db.execute(total_insights_q)).scalar() or 0

    # Risk distribution
    risk_q = (
        select(
            RegulatoryAnalysis.risco_nivel,
            func.count(RegulatoryAnalysis.id),
        )
        .group_by(RegulatoryAnalysis.risco_nivel)
    )
    risk_result = await db.execute(risk_q)
    risk_counts = {"Alto": 0, "Médio": 0, "Baixo": 0}
    for nivel, cnt in risk_result.all():
        # Normalize Medio → Médio
        key = "Médio" if nivel in ("Medio", "Médio") else nivel
        risk_counts[key] = risk_counts.get(key, 0) + cnt

    # Per-authority counts
    auth_q = (
        select(
            RegulatoryDocument.authority,
            func.count(RegulatoryDocument.id),
        )
        .group_by(RegulatoryDocument.authority)
        .order_by(func.count(RegulatoryDocument.id).desc())
    )
    auth_result = await db.execute(auth_q)
    authority_counts = {str(auth): cnt for auth, cnt in auth_result.all()}

    # New docs in last 7 days (by analysis date)
    new_7d_q = (
        select(func.count(RegulatoryAnalysis.id))
        .where(RegulatoryAnalysis.analisado_em >= seven_days_ago)
    )
    new_7d = (await db.execute(new_7d_q)).scalar() or 0

    # Last update timestamp
    last_update_q = select(func.max(RegulatoryAnalysis.analisado_em))
    last_update = (await db.execute(last_update_q)).scalar()

    # Weekly timeline (last 4 weeks) — count of new analyses per week with risk breakdown
    timeline = []
    for week in range(4):
        week_start = now - timedelta(days=(week + 1) * 7)
        week_end = now - timedelta(days=week * 7)

        week_q = (
            select(
                RegulatoryAnalysis.risco_nivel,
                func.count(RegulatoryAnalysis.id),
            )
            .where(
                RegulatoryAnalysis.analisado_em >= week_start,
                RegulatoryAnalysis.analisado_em < week_end,
            )
            .group_by(RegulatoryAnalysis.risco_nivel)
        )
        week_result = await db.execute(week_q)
        week_data = {"alto": 0, "medio": 0, "baixo": 0, "total": 0}
        for nivel, cnt in week_result.all():
            if nivel == "Alto":
                week_data["alto"] = cnt
            elif nivel in ("Medio", "Médio"):
                week_data["medio"] = cnt
            else:
                week_data["baixo"] = cnt
            week_data["total"] += cnt

        timeline.append({
            "week_start": week_start.strftime("%d/%m"),
            "week_end": week_end.strftime("%d/%m"),
            "label": f"Sem {4 - week}",
            **week_data,
        })

    timeline.reverse()  # oldest first

    return {
        "total_docs": total_docs,
        "total_insights": total_insights,
        "risk_counts": risk_counts,
        "authority_counts": authority_counts,
        "new_7d": new_7d,
        "last_update": last_update.isoformat() if last_update else None,
        "timeline": timeline,
    }
