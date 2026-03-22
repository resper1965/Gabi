import asyncio
import logging
from typing import List

from app.database import async_session
from app.models.regulatory import RegulatoryAnalysis, RegulatoryProvision
from app.schemas.ingest import ProvisionSchema
from app.services.analyzer import analyze_normative

logger = logging.getLogger("gabi.processing_worker")

async def process_regulatory_version_bg(version_id: int, texto_integral: str, provisions: List[ProvisionSchema]):
    """Background task to run AI analysis and chunk embeddings without blocking ingestion."""
    logger.info("Starting background AI processing for version_id=%s", version_id)

    async with async_session() as session:
        # 1. AI Analysis
        try:
            analysis_data = await analyze_normative(texto_integral)
            analysis = RegulatoryAnalysis(
                version_id=version_id,
                resumo_executivo=analysis_data.get("resumo_executivo"),
                risco_nivel=analysis_data.get("risco_nivel", "Médio"),
                risco_justificativa=analysis_data.get("risco_justificativa"),
                extra_data=analysis_data
            )
            session.add(analysis)
        except Exception as e:
            logger.warning("AI Analysis failed in background for version %s: %s", version_id, e)

        # 2. Provisions & Embeddings
        if provisions:
            from app.core.embeddings import embed_batch
            texts = [prov.texto_chunk for prov in provisions]
            try:
                embeddings = await asyncio.to_thread(embed_batch, texts)
            except Exception as e:
                logger.warning("Embedding generation failed in background (version %s): %s", version_id, e)
                embeddings = [None] * len(provisions)

            for prov, emb in zip(provisions, embeddings):
                db_prov = RegulatoryProvision(
                    version_id=version_id,
                    structure_path=prov.structure_path,
                    texto_chunk=prov.texto_chunk,
                    embedding=emb,
                )
                session.add(db_prov)

        try:
            await session.commit()
            logger.info("Successfully completed and committed AI processing for version %s", version_id)
        except Exception as e:
            await session.rollback()
            logger.error("Failed to commit background AI processing for version %s: %s", version_id, e)

def dispatch_regulatory_processing(version_id: int, texto_integral: str, provisions: List[ProvisionSchema]):
    """Fire and forget the background processing task."""
    # Ensure it's attached to the running async loop
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(process_regulatory_version_bg(version_id, texto_integral, provisions))
    except RuntimeError:
        logger.error("Cannot dispatch background processing: no running event loop found.")
