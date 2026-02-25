import asyncio
import sys
import os

from ingest_all_integrated import run_integrated_pipeline

async def main():
    await run_integrated_pipeline()

if __name__ == "__main__":
    asyncio.run(main())
