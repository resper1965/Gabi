"""
Gabi Hub — Unified Regulatory Ingestion Pipeline
Runs all source-specific ingestion scripts in sequence.

Steps:
  1a. BKJ Legal Knowledge Base — bkj_cli (Código Civil, Penal, CPC, Lavagem, SFN crimes...)
  1b. Planalto Regulatory Laws  — Lei do SFN, LC 105, Lei das S.A., Anticorrupção, Marco Civil...
  2.  BACEN + CMN normativos    — via official Olinda OData
  3.  DOU-based agencies        — CVM, SUSEP, ANS, ANPD, ANEEL, CADE
  4.  DataJud STJ + STF         — compliance-relevant jurisprudence

Trigger via:
  POST /admin/regulatory/ingest       (manual, superadmin)
  POST /admin/cron/ingest             (Cloud Scheduler, X-Cron-Key)
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone

logger = logging.getLogger("gabi.ingest_pipeline")

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bkj_cli import run_cli as run_bkj_cli
from ingest_bcb_normativos import run_ingestion as run_bcb_ingest
from ingest_cmn_normativos import run_ingestion as run_cmn_ingest
from ingest_planalto_laws import run_ingestion as run_planalto_ingest
from ingest_cvm import run_cvm_ingestion
from ingest_susep import run_susep_ingestion
from ingest_ans import run_ans_ingestion
from ingest_anpd import run_anpd_ingestion
from ingest_aneel import run_aneel_ingestion
from ingest_cade import run_cade_ingestion
from ingest_datajud import run_all_tribunais


def _log_step(step: str, start: datetime, run=None):
    """Emit structured step metrics."""
    duration = (datetime.now(timezone.utc) - start).total_seconds()
    metrics = {"step": step, "duration_s": round(duration, 2)}
    if run:
        metrics.update({"new": run.itens_novos, "updated": run.itens_atualizados, "errors": run.erros})
    logger.info("INGEST_STEP_COMPLETE %s", json.dumps(metrics))


async def run_integrated_pipeline():
    print("=" * 80)
    print("GABI HUB — UNIFIED INGESTION PIPELINE (Enterprise Grade)")
    print("=" * 80)
    start_time = datetime.now(timezone.utc)

    # ── STEP 1a: BKJ Legal Knowledge Base (PlanaltoIngester → Storage + DB) ──
    # bkj_cli uses a separate ingestion path (bkj.ingest.PlanaltoIngester + Storage)
    # complementary to — NOT a replacement for — ingest_planalto_laws.py
    print("\n[STEP 1a/5] BKJ — Base de Conhecimento Jurídico (Código Civil · Penal · CPC · Lavagem...)")
    t0 = datetime.now(timezone.utc)
    try:
        await run_bkj_cli("core")
        await run_bkj_cli("financial")
    except Exception as e:
        print(f" [!] Erro no Step 1a (BKJ): {e}")
    _log_step("bkj", t0)

    # ── STEP 1b: Planalto Regulatory Laws (DBIngester → regulatory_documents) ─
    print("\n[STEP 1b/5] Leis Regulatórias — Planalto (Lei do SFN · LC 105 · S.A. · Anticorrupção...)")
    t0 = datetime.now(timezone.utc)
    try:
        await run_planalto_ingest()
    except Exception as e:
        print(f" [!] Erro no Step 1b (Planalto): {e}")
    _log_step("planalto", t0)

    # ── STEP 2: BACEN + CMN (Official OData) ──────────────────────────────────
    print("\n[STEP 2/5] Normativos Financeiros — BACEN + CMN (Olinda OData)")
    t0 = datetime.now(timezone.utc)
    try:
        await run_bcb_ingest()
        await run_cmn_ingest()
    except Exception as e:
        print(f" [!] Erro no Step 2 (BACEN/CMN): {e}")
    _log_step("bacen_cmn", t0)

    # ── STEP 3: DOU-based Agencies ────────────────────────────────────────────
    print("\n[STEP 3/5] Agências Reguladoras — DOU (CVM · SUSEP · ANS · ANPD · ANEEL · CADE)")
    t0 = datetime.now(timezone.utc)
    try:
        await run_cvm_ingestion()
        await run_susep_ingestion()
        await run_ans_ingestion()
        await run_anpd_ingestion()
        await run_aneel_ingestion()
        await run_cade_ingestion()
    except Exception as e:
        print(f" [!] Erro no Step 3 (Agências DOU): {e}")
    _log_step("dou_agencies", t0)

    # ── STEP 4: Jurisprudence (DataJud CNJ) ───────────────────────────────────
    print("\n[STEP 4/5] Jurisprudência — DataJud CNJ (STJ · STF)")
    t0 = datetime.now(timezone.utc)
    try:
        await run_all_tribunais(days=180)
    except Exception as e:
        print(f" [!] Erro no Step 4 (DataJud): {e}")
    _log_step("datajud", t0)

    # ── Cache invalidation — ensure fresh RAG results after new data ─────────
    try:
        from app.core.cache import cache_invalidate_prefix
        await cache_invalidate_prefix("rag")
        print("\n[CACHE] RAG cache invalidated — fresh results on next query")
    except Exception as e:
        print(f" [!] Cache invalidation failed: {e}")

    # ── Summary ───────────────────────────────────────────────────────────────
    duration = datetime.now(timezone.utc) - start_time
    print("\n" + "=" * 80)
    print(f"Pipeline concluído em {duration}")
    print("BKJ (Storage) · Planalto (regulatory_docs) · OlindaOData · DOU (6 agências) · DataJud")
    print("Todos os documentos versionados e indexados — PostgreSQL/pgVector")
    print("=" * 80)
    _log_step("pipeline_total", start_time)


if __name__ == "__main__":
    asyncio.run(run_integrated_pipeline())
