"""
Quick script to run seed packs directly (no HTTP auth needed).
"""
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import async_session
from app.core.seed_regulatory import seed_multiple, list_packs


async def main():
    print("=" * 60)
    print("GABI HUB — REGULATORY SEED PACKS")
    print("=" * 60)

    # Show available packs
    packs = list_packs()
    for p in packs:
        print(f"  📦 {p['id']}: {p['name']}")
    print()

    # Seed all packs
    pack_ids = ["ans", "bacen", "cvm", "susep", "lgpd"]
    print(f"Seeding {len(pack_ids)} packs: {', '.join(pack_ids)}")
    print()

    async with async_session() as db:
        results = await seed_multiple(db, pack_ids, force=False)
        for r in results:
            if "error" in r:
                print(f"  ❌ {r.get('pack', '?')}: {r['error']}")
            elif r.get("status") == "already_seeded":
                print(f"  ✅ {r['pack']}: Already seeded ({r['existing_docs']} docs)")
            else:
                print(f"  ✅ {r['pack']}: Seeded {r['docs_created']} docs, {r['total_chunks']} chunks")

    print()
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
