import asyncio

from ingest_bcb_rss import process_rss
from ingest_bcb_normativos import run_ingestion as bcb_ingest
from ingest_cmn_normativos import run_ingestion as cmn_ingest

async def main():
    print("="*60)
    print("Iniciando Ingestão Total (BACEN + CMN)")
    print("="*60)
    
    print("\n[1/3] Ingerindo RSS Institucional do BACEN...")
    await process_rss()
    
    print("\n[2/3] Ingerindo Normativos do BACEN...")
    await bcb_ingest()
    
    print("\n[3/3] Ingerindo Normativos do CMN...")
    await cmn_ingest()
    
    print("\n" + "="*60)
    print("Todo o pipeline de Ingestão BACEN/CMN concluído.")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())
