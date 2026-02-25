import os
import sys
import asyncio

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.bcb_client import BCBClient
from app.services.normalizer import html_to_text, extract_pdf_text, generate_hash
from app.services.chunker import extract_provisions
from app.schemas.ingest import RegulatoryDocumentSchema, RegulatoryAuthority
from app.models.audit import IngestSource

AUTHORITY = RegulatoryAuthority.SUSEP
SOURCE_NORM = IngestSource.SUSEP_NORM

# In a real scenario, this would scrape the BNPortal or gov.br
# Example: https://www2.susep.gov.br/safe/bnportal/internet/pt-BR/
SUSEP_MOCK_DOCS = [
    {
        "Url": "https://www.in.gov.br/en/web/dou/-/circular-susep-n-666-de-18-de-novembro-de-2022-444444",
        "Tipo": "Circular",
        "Numero": "666",
        "Ano": "2022",
        "Titulo": "Circular SUSEP 666 Substituta"
    }
]

async def run_susep_ingestion():
    print(f"Buscando Normativos da SUSEP...")
    client = BCBClient()
    
    docs_to_process = SUSEP_MOCK_DOCS
    print("Conectando ao banco de dados e preparando IngestRun...")
    
    for doc in docs_to_process:
        print(f"[{doc['Tipo']} {doc['Numero']}] Processando URL: {doc['Url']}")
        is_pdf = str(doc.get("Arquivo", "")).lower().endswith(".pdf") or str(doc.get("Url", "")).lower().endswith(".pdf")
        
        try:
            if is_pdf:
                raw_bytes = await client.fetch_binary_async(doc["Url"])
                texto = extract_pdf_text(raw_bytes)
            else:
                html_raw = await client.fetch_async(doc["Url"])
                texto = html_to_text(html_raw)
        except Exception as e:
            print(f"Erro ao baixar {doc['Url']}: {e}")
            continue
            
        content_hash = generate_hash(texto)
        chunks = extract_provisions(texto)
        
        schema = RegulatoryDocumentSchema(
            authority=AUTHORITY,
            tipo_ato=doc["Tipo"],
            numero=str(doc["Numero"]),
            id_fonte=doc["Url"],
            titulo=doc["Titulo"],
            version_hash=content_hash,
            texto_integral=texto,
            provisions=chunks
        )
        print(f" -> Sucesso: Extratos gerados {len(chunks)} chunks. Hash: {content_hash[:8]}")
        
    print("Ingestão da SUSEP concluída.")
    
if __name__ == "__main__":
    asyncio.run(run_susep_ingestion())
