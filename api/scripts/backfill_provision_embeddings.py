"""
Backfill embeddings for RegulatoryProvision rows ingested before the
embedding-generation fix (commit feat/rag-embedding-fix).

Provisions stored without a vector cannot appear in _search_provisions
(which filters WHERE rp.embedding IS NOT NULL). This script re-generates
and persists the missing vectors without touching other fields.

Usage:
    python -m scripts.backfill_provision_embeddings
    python -m scripts.backfill_provision_embeddings --batch-size 25 --dry-run
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.database import async_session
from app.models.regulatory import RegulatoryProvision
from app.core.embeddings import embed_batch

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("gabi.backfill_provisions")


async def backfill(batch_size: int = 50, dry_run: bool = False) -> None:
    async with async_session() as session:
        # Collect all IDs without embeddings up front to allow progress tracking
        id_result = await session.execute(
            select(RegulatoryProvision.id).where(RegulatoryProvision.embedding.is_(None))
        )
        ids_without: list[int] = [r[0] for r in id_result]
        total = len(ids_without)

        if total == 0:
            logger.info("Nothing to do — all provisions already have embeddings.")
            return

        logger.info(
            "Found %d provisions without embeddings. Batch size: %d. Dry run: %s",
            total, batch_size, dry_run,
        )

        if dry_run:
            return

        processed = 0
        errors = 0

        for i in range(0, total, batch_size):
            batch_ids = ids_without[i : i + batch_size]

            stmt = select(RegulatoryProvision).where(RegulatoryProvision.id.in_(batch_ids))
            rows = (await session.execute(stmt)).scalars().all()

            texts = [r.texto_chunk for r in rows]
            try:
                embeddings: list[list[float]] = await asyncio.to_thread(embed_batch, texts)
            except Exception as exc:
                logger.error(
                    "Embedding failed for batch %d–%d: %s",
                    i, min(i + batch_size, total), exc,
                )
                errors += len(batch_ids)
                continue

            for row, emb in zip(rows, embeddings):
                row.embedding = emb

            await session.commit()

            processed += len(rows)
            pct = processed / total * 100
            logger.info("Progress: %d/%d (%.1f%%)", processed, total, pct)

        logger.info(
            "Backfill complete — embedded: %d, errors: %d (out of %d)",
            processed, errors, total,
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Backfill missing embeddings in regulatory_provisions"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Number of provisions per embedding call (max 250, default 50)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print count only, do not write to database",
    )
    args = parser.parse_args()
    asyncio.run(backfill(batch_size=args.batch_size, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
