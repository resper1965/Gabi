import os
import sys
import asyncio
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# Add the project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.base import Base # Need to initialize DB connection
# Mocking a session maker for script context
from app.services.bcb_client import BCBClient
from app.services.db_ingest import DB好吧Ingester
from app.models.audit import IngestRun, IngestSource
from app.schemas.ingest import RssItemSchema

RSS_URL = "https://www.bcb.gov.br/api/feed/rss/noticias" # Standard BCB News Feed

async def get_db_session():
    # Placeholder for actual SQLAlchemy AsyncSession setup
    # from app.database import AsyncSessionLocal
    # return AsyncSessionLocal()
    pass

async def process_rss():
    print(f"Buscando feed RSS do BACEN em: {RSS_URL}")
    client = BCBClient()
    
    try:
        xml_data = await client.fetch_async(RSS_URL)
        tree = ET.fromstring(xml_data)
    except Exception as e:
        print(f"Erro ao buscar feed: {e}")
        return

    items = tree.findall('.//item')
    print(f"Encontrados {len(items)} itens no feed.")
    
    # run = IngestRun(source=IngestSource.BACEN_RSS)
    # session = await get_db_session()
    # session.add(run)
    # await session.commit()
    
    parsed_items = []
    for item in items:
        title = item.find("title").text if item.find("title") is not None else ""
        link = item.find("link").text if item.find("link") is not None else ""
        pubDate = item.find("pubDate").text if item.find("pubDate") is not None else ""
        desc = item.find("description").text if item.find("description") is not None else ""
        guid = item.find("guid").text if item.find("guid") is not None else link
        
        parsed_items.append(RssItemSchema(
            feed_origem="BACEN_NOTICIAS",
            guid=guid,
            titulo=title,
            link=link,
            resumo=desc
        ))
        
    print(f"Realizando ingestão de {len(parsed_items)} itens informativos (Corpus C)...")
    
    # ingester = DBIngester(session)
    # await ingester.ingest_rss_items(run, parsed_items)
    # run.finished_at = datetime.now(timezone.utc)
    # await session.commit()
    print("Ingestão de RSS concluída.")

if __name__ == "__main__":
    asyncio.run(process_rss())
