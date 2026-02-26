import asyncio
import sys
import os

# Add api directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from app.database import async_session
from app.models.regulatory import RegulatoryVersion, RegulatoryAnalysis
from app.services.analyzer import analyze_normative
from dotenv import load_dotenv

load_dotenv()

async def populate_analyses():
    print("Starting AI Analysis Population...")
    
    async with async_session() as session:
        # 1. Find versions without analysis
        # Using a subquery to find version IDs that are NOT in RegulatoryAnalysis
        stmt = select(RegulatoryVersion).outerjoin(RegulatoryAnalysis).where(RegulatoryAnalysis.id == None)
        versions = (await session.execute(stmt)).scalars().all()
        
        print(f"Found {len(versions)} versions pending analysis.")
        
        for i, version in enumerate(versions):
            print(f"[{i+1}/{len(versions)}] Analyzing version ID: {version.id}...")
            
            try:
                # 2. Call Analyzer service
                analysis_data = await analyze_normative(version.texto_integral)
                
                # 3. Create RegulatoryAnalysis record
                analysis = RegulatoryAnalysis(
                    version_id=version.id,
                    resumo_executivo=analysis_data.get("resumo_executivo"),
                    risco_nivel=analysis_data.get("risco_nivel", "Médio"),
                    risco_justificativa=analysis_data.get("risco_justificativa"),
                    extra_data=analysis_data # Store the full JSON
                )
                
                session.add(analysis)
                await session.commit()
                print(f"Successfully analyzed version {version.id}")
                
            except Exception as e:
                print(f"Error analyzing version {version.id}: {e}")
                await session.rollback()
                
    print("Population finished.")

if __name__ == "__main__":
    asyncio.run(populate_analyses())
