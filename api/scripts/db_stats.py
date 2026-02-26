import asyncio
from sqlalchemy import text
from app.database import async_session

async def check():
    async with async_session() as session:
        # Check RegulatoryProvisions
        res = await session.execute(text("SELECT count(*), count(embedding) FROM regulatory_provisions"))
        prov_total, prov_emb = res.first()
        
        # Check RegulatoryAnalyses
        res = await session.execute(text("SELECT count(*) FROM regulatory_analyses"))
        analysis_count = res.scalar()
        
        print(f"Regulatory Provisions: {prov_total} total, {prov_emb} with embedding")
        print(f"Regulatory Analyses: {analysis_count}")

if __name__ == "__main__":
    asyncio.run(check())
