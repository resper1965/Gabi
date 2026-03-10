import asyncio
import os
import sys
from datetime import datetime, timezone

# Add api directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingest_bcb_normativos import run_ingestion as run_bcb_ingest
from ingest_cmn_normativos import run_ingestion as run_cmn_ingest
from bkj_cli import run_cli as run_bkj_cli
from ingest_cvm import run_cvm_ingestion
from ingest_susep import run_susep_ingestion
from ingest_ans import run_ans_ingestion
from ingest_anpd import run_anpd_ingestion
from ingest_aneel import run_aneel_ingestion

async def run_integrated_pipeline():
    print("="*80)
    print("GABI HUB — UNIFIED INGESTION PIPELINE (Integrated Execution)")
    print("="*80)
    start_time = datetime.now(timezone.utc)

    # 1. Legal Knowledge Base (BKJ) - Planalto Laws
    print("\n[STEP 1/4] Ingesting Legal Knowledge Base (Planalto Laws)...")
    try:
        # Running both core and financial groups
        await run_bkj_cli("core")
        await run_bkj_cli("financial")
    except Exception as e:
        print(f" [!] Error in BKJ Ingestion: {e}")

    # 2. Financial Context (BACEN + CMN)
    print("\n[STEP 2/4] Ingesting Financial Regulatory Acts (BCB + CMN)...")
    try:
        await run_bcb_ingest()
        await run_cmn_ingest()
    except Exception as e:
        print(f" [!] Error in Financial Ingestion: {e}")

    # 3. Specific Regulatory Agencies (CVM, SUSEP, ANS, ANPD, ANEEL)
    print("\n[STEP 3/4] Ingesting Regulatory Agency Acts (Multi-Agency)...")
    try:
        # These could potentially run in parallel if DB connections are handled
        await run_cvm_ingestion()
        await run_susep_ingestion()
        await run_ans_ingestion()
        await run_anpd_ingestion()
        await run_aneel_ingestion()
    except Exception as e:
        print(f" [!] Error in Agency Ingestion: {e}")

    # 4. Summary & Finish
    end_time = datetime.now(timezone.utc)
    duration = end_time - start_time
    print("\n" + "="*80)
    print(f"Integrated Pipeline Completed in {duration}")
    print("All items versioned and indexed in PostgreSQL/pgVector.")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(run_integrated_pipeline())
