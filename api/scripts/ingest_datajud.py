"""
DataJud Ingestion — STJ and STF compliance-relevant jurisprudence.
Uses the CNJ public DataJud API (no registration required).
Stores jurisprudence as regulatory documents under BACEN/CVM/ANS/ANPD authority
depending on the topic, but primarily for cross-reference in RAG queries.
"""

import os
import sys
import asyncio
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.datajud_client import DataJudClient
from app.services.normalizer import generate_hash
from app.services.chunker import extract_provisions
from app.services.db_ingest import DBIngester
from app.schemas.ingest import RegulatoryDocumentSchema, RegulatoryAuthority
from app.models.audit import IngestRun, IngestSource
from app.database import async_session

TRIBUNAL_TO_SOURCE = {
    "STJ": IngestSource.DATAJUD_STJ,
    "STF": IngestSource.DATAJUD_STF,
}


def _build_texto(item) -> str:
    """Build a structured text blob from a JurisprudenciaItem."""
    parts = [
        f"TRIBUNAL: {item.tribunal}",
        f"PROCESSO: {item.numero_processo}",
        f"CLASSE: {item.classe}",
        f"ASSUNTO: {item.assunto}",
    ]
    if item.orgao_julgador:
        parts.append(f"ÓRGÃO JULGADOR: {item.orgao_julgador}")
    if item.relator:
        parts.append(f"RELATOR: {item.relator}")
    if item.data_julgamento:
        parts.append(f"DATA DE JULGAMENTO: {item.data_julgamento}")
    parts.append("")
    parts.append("EMENTA:")
    parts.append(item.ementa)
    return "\n".join(parts)


async def run_datajud_ingestion(tribunal: str, days: int = 180):
    print(f"[*] Iniciando Ingestão DataJud — {tribunal} (últimos {days} dias)")
    client = DataJudClient()
    source = TRIBUNAL_TO_SOURCE[tribunal]

    async with async_session() as db:
        run = IngestRun(source=source, started_at=datetime.now(timezone.utc))
        db.add(run)
        await db.commit()
        await db.refresh(run)

        ingester = DBIngester(db)
        items = await client.fetch_jurisprudencia(tribunal, days=days)
        print(f"[*] {len(items)} acórdãos únicos recuperados do {tribunal}.")

        for item in items:
            texto = _build_texto(item)
            content_hash = generate_hash(texto)
            # Jurisprudence text is already structured; use simple chunking
            chunks = extract_provisions(texto)

            # Store under PLANALTO authority — jurisprudence is interpretation of law
            schema = RegulatoryDocumentSchema(
                authority=RegulatoryAuthority.PLANALTO,
                tipo_ato=f"Acórdão {tribunal}",
                numero=item.numero_processo.replace("/", "-"),
                id_fonte=item.id_fonte,
                titulo=f"[{tribunal}] {item.classe} {item.numero_processo} — {item.assunto[:120]}",
                version_hash=content_hash,
                texto_integral=texto,
                provisions=chunks,
            )

            await ingester.ingest_regulatory_document(run, schema)

        run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        print(
            f"[*] DataJud {tribunal} finalizado. "
            f"Novos: {run.itens_novos}, Atualizados: {run.itens_atualizados}, Erros: {run.erros}"
        )


async def run_all_tribunais(days: int = 180):
    await run_datajud_ingestion("STJ", days=days)
    await run_datajud_ingestion("STF", days=days)


if __name__ == "__main__":
    asyncio.run(run_all_tribunais())
