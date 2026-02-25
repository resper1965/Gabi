import os
import sys
import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from urllib.parse import quote

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.bcb_client import BCBClient
from app.services.normalizer import html_to_text, extract_pdf_text, generate_hash
from app.services.chunker import extract_provisions
from app.services.db_ingest import DBIngester
from app.schemas.ingest import RegulatoryDocumentSchema, RegulatoryAuthority, ProvisionSchema
from app.models.audit import IngestRun, IngestSource
from app.database import async_session

# BCB Internal APIs (extracted from reverse-engineering)
BCB_SEARCH_API = "https://www.bcb.gov.br/api/search/app/normativos/buscanormativos"
BCB_CONTENT_API = "https://www.bcb.gov.br/api/conteudo/app/normativos/exibenormativo"

AUTHORITY = RegulatoryAuthority.BACEN
SOURCE = IngestSource.BACEN_NORM

async def fetch_latest_docs(client: BCBClient, days: int = 30):
    """Fetch the latest normative acts from the BCB API."""
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Query parameters based on R script reverse-engineering
    query_text = "ContentType:normativo AND contentSource:normativos"
    # Filter by date range
    refinement = f"Data:range(datetime({start_date.isoformat()}),datetime({end_date.isoformat()}))"
    
    url = f"{BCB_SEARCH_API}?querytext={quote(query_text)}&rowlimit=50&startrow=0&sortlist=Data1OWSDATE:descending"
    
    try:
        resp_json = await client.fetch_async(url)
        data = json.loads(resp_json)
        return data.get("Rows", [])
    except Exception as e:
        print(f"Error fetching from BCB Search API: {e}")
        return []

async def fetch_doc_content(client: BCBClient, doc_type: str, number: str):
    """Fetch the full content of a normative act."""
    p1 = quote(doc_type)
    p2 = quote(number)
    url = f"{BCB_CONTENT_API}?p1={p1}&p2={p2}"
    
    try:
        resp_json = await client.fetch_async(url)
        data = json.loads(resp_json)
        conteudo = data.get("conteudo", [])
        if conteudo:
            return conteudo[0] # Returns {Assunto, Texto, ...}
        return None
    except Exception as e:
        print(f"Error fetching content for {doc_type} {number}: {e}")
        return None

async def run_ingestion():
    print(f"[*] Instando Normativos do BACEN (Últimos 30 dias)")
    client = BCBClient()
    
    async with async_session() as db:
        run = IngestRun(source=SOURCE, started_at=datetime.now(timezone.utc))
        db.add(run)
        await db.commit()
        await db.refresh(run)
        
        ingester = DBIngester(db)
        docs = await fetch_latest_docs(client)
        print(f"[*] Encontrados {len(docs)} documentos em potencial.")
        
        for doc in docs:
            # Fields based on BCB API response
            doc_type = doc.get("TipodoNormativoOWSCHCS")
            doc_num = doc.get("NumeroOWSNMBR")
            if "." in str(doc_num):
                 doc_num = str(doc_num).split(".")[0]
            
            doc_pub_date_str = doc.get("Data1OWSDATE")
            doc_url = doc.get("Path") # Usually the display page
            
            print(f" [+] Processando {doc_type} {doc_num}...")
            
            # 1. Fetch Full Content (JSON)
            content_data = await fetch_doc_content(client, doc_type, doc_num)
            if not content_data:
                continue
                
            texto_html = content_data.get("Texto", "")
            assunto = content_data.get("Assunto", "")
            texto_limpo = html_to_text(texto_html)
            
            if not texto_limpo:
                print(f" [!] Texto vazio para {doc_type} {doc_num}")
                continue
                
            # 2. Versioning & Chunks
            content_hash = generate_hash(texto_limpo)
            chunks = extract_provisions(texto_limpo)
            
            # 3. Schema
            schema = RegulatoryDocumentSchema(
                authority=AUTHORITY,
                tipo_ato=doc_type,
                numero=str(doc_num),
                id_fonte=doc_url,
                titulo=f"{doc_type} {doc_num} - {assunto[:100]}",
                version_hash=content_hash,
                texto_integral=texto_limpo,
                provisions=[ProvisionSchema(texto_chunk=c, structure_path="Artigo Desconhecido") for c in chunks]
            )
            
            # 4. Ingest
            await ingester.ingest_regulatory_document(run, schema)
            
        run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        print(f"[*] Ingestão BACEN finalizada. Novos: {run.itens_novos}, Atualizados: {run.itens_atualizados}, Erros: {run.erros}")

if __name__ == "__main__":
    asyncio.run(run_ingestion())
