"""
BACEN Normatives Ingestion — Banco Central do Brasil
Uses the official BCB OData API (olinda.bcb.gov.br) instead of internal APIs.

Fetches: Resolução BCB, Instrução Normativa BCB, Carta Circular, Comunicado, etc.
"""

import os
import sys
import asyncio
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.olinda_client import OlindaClient
from app.services.normalizer import generate_hash
from app.services.chunker import extract_provisions
from app.services.db_ingest import DBIngester
from app.schemas.ingest import RegulatoryDocumentSchema, RegulatoryAuthority
from app.models.audit import IngestRun, IngestSource
from app.database import async_session

AUTHORITY = RegulatoryAuthority.BACEN
SOURCE = IngestSource.BACEN_NORM

# Act types issued by BACEN (excludes CMN resolutions — those go to ingest_cmn)
BACEN_TIPOS = {
    "Resolução BCB",
    "Instrução Normativa BCB",
    "Carta Circular",
    "Comunicado",
    "Circular",
}


async def run_ingestion(days: int = 30):
    print(f"[*] Iniciando Ingestão de Normativos do BACEN (últimos {days} dias) — via Olinda OData")
    client = OlindaClient()

    async with async_session() as db:
        run = IngestRun(source=SOURCE, started_at=datetime.now(timezone.utc))
        db.add(run)
        await db.commit()
        await db.refresh(run)

        ingester = DBIngester(db)
        docs = await client.fetch_por_data(days=days)

        # Keep only BACEN act types (exclude CMN resolutions)
        docs = [d for d in docs if d.tipo in BACEN_TIPOS]
        print(f"[*] {len(docs)} normativos BACEN encontrados.")

        for doc in docs:
            print(f" [+] Processando {doc.tipo} {doc.numero} ({doc.data})...")

            texto = await client.fetch_content(doc)
            if not texto or len(texto.strip()) < 100:
                print(f" [!] Texto insuficiente para {doc.tipo} {doc.numero}")
                run.erros += 1
                continue

            content_hash = generate_hash(texto)
            chunks = extract_provisions(texto)
            canonical = client.canonical_url(doc)

            schema = RegulatoryDocumentSchema(
                authority=AUTHORITY,
                tipo_ato=doc.tipo,
                numero=doc.numero,
                id_fonte=canonical,
                titulo=f"{doc.tipo} {doc.numero} — {doc.assunto[:150]}",
                version_hash=content_hash,
                texto_integral=texto,
                provisions=chunks,
            )

            await ingester.ingest_regulatory_document(run, schema)

        run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        print(
            f"[*] Ingestão BACEN finalizada. "
            f"Novos: {run.itens_novos}, Atualizados: {run.itens_atualizados}, Erros: {run.erros}"
        )


if __name__ == "__main__":
    asyncio.run(run_ingestion())
