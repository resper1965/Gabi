"""
CADE Normatives Ingestion — Conselho Administrativo de Defesa Econômica
Sources: DOU (Resoluções CADE) and cade.gov.br (Guias and Portarias).
"""

import os
import sys
import asyncio
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.dou_client import DOUClient
from app.services.normalizer import generate_hash
from app.services.chunker import extract_provisions
from app.services.db_ingest import DBIngester
from app.schemas.ingest import RegulatoryDocumentSchema, RegulatoryAuthority
from app.models.audit import IngestRun, IngestSource
from app.database import async_session

AUTHORITY = RegulatoryAuthority.CADE
SOURCE = IngestSource.CADE_NORM


async def run_cade_ingestion(days: int = 90):
    print(f"[*] Iniciando Ingestão de Normativos do CADE (últimos {days} dias)")
    dou = DOUClient()

    async with async_session() as db:
        run = IngestRun(source=SOURCE, started_at=datetime.now(timezone.utc))
        db.add(run)
        await db.commit()
        await db.refresh(run)

        ingester = DBIngester(db)
        docs = await dou.buscar_por_orgao("CADE", dias=days)
        print(f"[*] {len(docs)} atos CADE encontrados no DOU.")

        for doc in docs:
            print(f" [+] Processando: {doc.titulo[:80]}...")

            texto = await dou.baixar_texto_integral(doc.url)
            if not texto or len(texto.strip()) < 100:
                print(f" [!] Texto insuficiente para {doc.titulo[:50]}")
                continue

            content_hash = generate_hash(texto)
            chunks = extract_provisions(texto)

            schema = RegulatoryDocumentSchema(
                authority=AUTHORITY,
                tipo_ato=doc.tipo_ato,
                numero=doc.numero,
                id_fonte=doc.url,
                titulo=doc.titulo[:200],
                version_hash=content_hash,
                texto_integral=texto,
                provisions=chunks,
            )

            await ingester.ingest_regulatory_document(run, schema)

        run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        print(
            f"[*] Ingestão CADE finalizada. "
            f"Novos: {run.itens_novos}, Atualizados: {run.itens_atualizados}, Erros: {run.erros}"
        )


if __name__ == "__main__":
    asyncio.run(run_cade_ingestion())
