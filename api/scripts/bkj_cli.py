import asyncio
import os
import sys
from datetime import datetime, timezone
from sqlalchemy.orm import Session

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bkj.ingest.planalto_laws import PlanaltoIngester
from bkj.libs.storage import Storage
from app.database import async_session
from app.models.audit import IngestRun, IngestSource
from app.models.legal import LegalDomain

# --- SEEDS ---

CORE_LAWS = [
    {
        "name": "Código Civil",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm",
        "act_type": "Lei",
        "number": "10406",
        "domain": LegalDomain.CIVIL
    },
    {
        "name": "Código Penal",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "act_type": "Decreto-Lei",
        "number": "2848",
        "domain": LegalDomain.PENAL
    },
    {
        "name": "Código de Processo Civil",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm",
        "act_type": "Lei",
        "number": "13105",
        "domain": LegalDomain.PROCESSUAL
    },
    {
        "name": "Código de Defesa do Consumidor",
        "url": "https://www.planalto.gov.br/ccivil_03/Leis/L8078compilado.htm",
        "act_type": "Lei",
        "number": "8078",
        "domain": LegalDomain.CONSUMIDOR
    },
    {
        "name": "LGPD",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm",
        "act_type": "Lei",
        "number": "13709",
        "domain": LegalDomain.ADMINISTRATIVO
    }
]

FINANCIAL_LAWS = [
    {
        "name": "Lei Anticorrupção",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12846.htm",
        "act_type": "Lei",
        "number": "12846",
        "domain": LegalDomain.ADMINISTRATIVO
    },
    {
        "name": "Lei de Lavagem de Dinheiro",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9613.htm",
        "act_type": "Lei",
        "number": "9613",
        "domain": LegalDomain.ADMINISTRATIVO
    },
    {
        "name": "Lei do Processo Sancionador",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13506.htm",
        "act_type": "Lei",
        "number": "13506",
        "domain": LegalDomain.SANCIONADOR
    },
    {
        "name": "Lei de Crimes contra o SFN",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l7492.htm",
        "act_type": "Lei",
        "number": "7492",
        "domain": LegalDomain.PENAL
    }
]

async def run_cli(mode: str):
    async with async_session() as db:
        storage_path = os.getenv("STORAGE_PATH", "./storage/bkj")
        storage = Storage(storage_path)
        ingester = PlanaltoIngester(db, storage)
        
        # Create IngestRun
        run = IngestRun(
            source=IngestSource.PLANALTO_NORM,
            started_at=datetime.now(timezone.utc)
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)
        
        laws_to_run = []
        if mode == "core":
            laws_to_run = CORE_LAWS
        elif mode == "financial":
            laws_to_run = FINANCIAL_LAWS
        elif mode == "all":
            laws_to_run = CORE_LAWS + FINANCIAL_LAWS
        
        print(f"[*] Starting BKJ Ingestion Run #{run.id} mode={mode}")
        await ingester.run_ingestion(run.id, laws_to_run)
        
        run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        print(f"[*] Ingestion Run #{run.id} finished.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python api/scripts/bkj_cli.py [core|financial|all]")
        sys.exit(1)
        
    mode = sys.argv[1]
    asyncio.run(run_cli(mode))
