"""
Planalto Laws Ingestion — Leis Estruturantes do Sistema Financeiro e Proteção de Dados
Fetches compiled law text from planalto.gov.br, strips revoked provisions,
chunks by article, and persists with versioning and embeddings.
"""

import os
import sys
import asyncio
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.bcb_client import BCBClient
from app.services.planalto_parser import parse_planalto_html, chunk_planalto_law
from app.services.normalizer import generate_hash
from app.services.db_ingest import DBIngester
from app.schemas.ingest import RegulatoryDocumentSchema, RegulatoryAuthority
from app.models.audit import IngestRun, IngestSource
from app.database import async_session

AUTHORITY = RegulatoryAuthority.PLANALTO
SOURCE = IngestSource.PLANALTO_NORM

# Compiled (always-current) versions on Planalto — no date filtering needed.
# Add laws here; the ingester handles versioning automatically via content hash.
PLANALTO_LAWS = [
    # ── Data protection ──────────────────────────────────────────────────────
    {
        "Url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm",
        "Tipo": "Lei",
        "Numero": "13709",
        "Titulo": "Lei Geral de Proteção de Dados Pessoais (LGPD)",
    },
    # ── Consumer defense ─────────────────────────────────────────────────────
    {
        "Url": "https://www.planalto.gov.br/ccivil_03/Leis/L8078compilado.htm",
        "Tipo": "Lei",
        "Numero": "8078",
        "Titulo": "Código de Defesa do Consumidor (CDC)",
    },
    # ── Financial system foundation ───────────────────────────────────────────
    {
        "Url": "https://www.planalto.gov.br/ccivil_03/leis/l4595.htm",
        "Tipo": "Lei",
        "Numero": "4595",
        "Titulo": "Lei do Sistema Financeiro Nacional — cria BCB e CMN",
    },
    # ── Banking secrecy ───────────────────────────────────────────────────────
    {
        "Url": "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp105.htm",
        "Tipo": "Lei Complementar",
        "Numero": "105",
        "Titulo": "Lei Complementar 105/2001 — Sigilo das Operações de Instituições Financeiras",
    },
    # ── Capital markets ───────────────────────────────────────────────────────
    {
        "Url": "https://www.planalto.gov.br/ccivil_03/leis/l6404compilado.htm",
        "Tipo": "Lei",
        "Numero": "6404",
        "Titulo": "Lei das Sociedades por Ações (Lei das S.A.)",
    },
    # ── Anti-corruption / compliance ─────────────────────────────────────────
    {
        "Url": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12846.htm",
        "Tipo": "Lei",
        "Numero": "12846",
        "Titulo": "Lei Anticorrupção (Lei de Integridade Empresarial)",
    },
    # ── Internet / cybersecurity ──────────────────────────────────────────────
    {
        "Url": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm",
        "Tipo": "Lei",
        "Numero": "12965",
        "Titulo": "Marco Civil da Internet",
    },
]


async def run_ingestion():
    print(f"[*] Iniciando Ingestão de Leis Estruturantes — Planalto ({len(PLANALTO_LAWS)} leis)")
    client = BCBClient()

    async with async_session() as db:
        run = IngestRun(source=SOURCE, started_at=datetime.now(timezone.utc))
        db.add(run)
        await db.commit()
        await db.refresh(run)

        ingester = DBIngester(db)

        for lei in PLANALTO_LAWS:
            print(f"\n[{lei['Tipo']} {lei['Numero']}] {lei['Titulo']}")
            print(f"  URL: {lei['Url']}")

            try:
                html_raw = await client.fetch_async(lei["Url"])
                texto = parse_planalto_html(html_raw)
            except Exception as e:
                print(f"  [!] Erro ao baixar: {e}")
                run.erros += 1
                continue

            if not texto or len(texto.strip()) < 500:
                print(f"  [!] Texto insuficiente ou vazio para {lei['Numero']}")
                run.erros += 1
                continue

            content_hash = generate_hash(texto)
            chunks = chunk_planalto_law(texto)

            schema = RegulatoryDocumentSchema(
                authority=AUTHORITY,
                tipo_ato=lei["Tipo"],
                numero=lei["Numero"],
                id_fonte=lei["Url"],
                titulo=lei["Titulo"],
                version_hash=content_hash,
                texto_integral=texto,
                provisions=chunks,
            )

            print(f"  -> {len(chunks)} artigos/seções extraídos. Hash: {content_hash[:8]}")
            await ingester.ingest_regulatory_document(run, schema)

        run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        print(
            f"\n[*] Ingestão Planalto finalizada. "
            f"Novos: {run.itens_novos}, Atualizados: {run.itens_atualizados}, Erros: {run.erros}"
        )


if __name__ == "__main__":
    asyncio.run(run_ingestion())
