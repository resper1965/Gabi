import asyncio
import os
import sys

# Ensure project root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.bkj_cli import run_cli

if __name__ == "__main__":
    asyncio.run(run_cli("financial"))
