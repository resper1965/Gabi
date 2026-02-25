import os
import sys
import asyncio
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.bcb_client import BCBClient # We can reuse the HTTP client
from app.services.planalto_parser import parse_planalto_html, chunk_planalto_law
from app.services.normalizer import generate_hash
from app.schemas.ingest import RegulatoryDocumentSchema, RegulatoryAuthority
from app.models.audit import IngestSource

AUTHORITY = RegulatoryAuthority.PLANALTO
SOURCE = IngestSource.PLANALTO_NORM

PLANALTO_LAWS = [
    {
        "Url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm",
        "Tipo": "Lei",
        "Numero": "13.709",
        "Ano": "2018",
        "Titulo": "Lei Geral de Proteção de Dados Pessoais (LGPD)"
    },
    {
        "Url": "https://www.planalto.gov.br/ccivil_03/Leis/L8078compilado.htm",
        "Tipo": "Lei",
        "Numero": "8.078",
        "Ano": "1990",
        "Titulo": "Código de Defesa do Consumidor (CDC)"
    }
]

async def run_ingestion():
    print(f"Buscando Leis no Planalto...")
    client = BCBClient() # Reusing the retry/backoff client
    
    docs_to_process = PLANALTO_LAWS
    print("Conectando ao banco de dados e preparando IngestRun...")
    
    for doc in docs_to_process:
        print(f"[{doc['Tipo']} {doc['Numero']}] Processando URL: {doc['Url']}")
        
        try:
            # Planalto may block generic user actions, BCBClient has a browser-like UA
            html_raw = await client.fetch_async(doc["Url"])
            texto_limpo = parse_planalto_html(html_raw)
        except Exception as e:
            print(f"Erro ao baixar {doc['Url']}: {e}")
            continue
            
        content_hash = generate_hash(texto_limpo)
        chunks = chunk_planalto_law(texto_limpo)
        
        schema = RegulatoryDocumentSchema(
            authority=AUTHORITY,
            tipo_ato=doc["Tipo"],
            numero=str(doc["Numero"]),
            id_fonte=doc["Url"],
            titulo=doc["Titulo"],
            version_hash=content_hash,
            texto_integral=texto_limpo,
            provisions=chunks
        )
        
        print(f" -> Sucesso: Extratos gerados {len(chunks)} Artigos/seções. Hash: {content_hash[:8]}")
        # await ingester.ingest_regulatory_document(run, schema)
        
    print("Ingestão do Planalto (Leis Estruturantes) concluída.")
    
if __name__ == "__main__":
    asyncio.run(run_ingestion())
