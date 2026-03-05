"""
Law & Comply — Unified Regulatory Insights Endpoint
Serves AI-generated analyses for all regulatory authorities.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.auth import CurrentUser, get_current_user

router = APIRouter()


@router.get("/insights")
async def list_regulatory_insights(
    authority: str | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List ALL AI-generated regulatory insights (analyses).
    Optionally filter by authority (BCB, CMN, CVM, ANS, SUSEP, ANPD, ANEEL).
    """
    from app.models.regulatory import RegulatoryAnalysis, RegulatoryVersion, RegulatoryDocument

    query = (
        select(RegulatoryAnalysis, RegulatoryVersion, RegulatoryDocument)
        .join(RegulatoryVersion, RegulatoryAnalysis.version_id == RegulatoryVersion.id)
        .join(RegulatoryDocument, RegulatoryVersion.document_id == RegulatoryDocument.id)
        .order_by(RegulatoryAnalysis.analisado_em.desc())
        .limit(50)
    )

    # Optional authority filter
    if authority:
        authorities = [a.strip().upper() for a in authority.split(",")]
        query = query.where(RegulatoryDocument.authority.in_(authorities))

    result = await db.execute(query)

    insights = []
    for analysis, version, doc in result.all():
        insights.append({
            "id": analysis.id,
            "doc_id": doc.id,
            "authority": doc.authority,
            "tipo_ato": doc.tipo_ato,
            "numero": doc.numero,
            "resumo_executivo": analysis.resumo_executivo,
            "risco_nivel": analysis.risco_nivel,
            "risco_justificativa": analysis.risco_justificativa,
            "analisado_em": analysis.analisado_em,
            "extra_data": analysis.extra_data
        })

    return insights
