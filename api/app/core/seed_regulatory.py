"""
Gabi Hub — Regulatory Seed System
Selectable regulatory packs that populate the shared knowledge base.
Each pack corresponds to a regulatory body (ANS, CVM, SUSEP, BACEN, LGPD).
"""

import os
import uuid
import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embeddings import embed_batch
from app.core.ingest import chunk_text, extract_text

logger = logging.getLogger(__name__)

SEEDS_DIR = Path(__file__).resolve().parent.parent.parent / "seeds" / "regulatory"

# ── Pack Registry ──
# Maps pack_id → (display name, description, seed directory, target module)
AVAILABLE_PACKS = {
    "ans": {
        "name": "ANS — Agência Nacional de Saúde Suplementar",
        "description": "Rol de Procedimentos (RN 465), prazos de atendimento (RN 259), Lei dos Planos de Saúde (9.656/98)",
        "module": "law",
        "dir": "ans",
    },
    "cvm": {
        "name": "CVM — Comissão de Valores Mobiliários",
        "description": "Resoluções sobre fundos de investimento (175/2022), emissores (80/2022), ofertas públicas (88/2022)",
        "module": "law",
        "dir": "cvm",
    },
    "susep": {
        "name": "SUSEP — Superintendência de Seguros Privados",
        "description": "Segurança cibernética (648/2022), seguros de pessoas (637/2021), provisões técnicas (CNSP 432)",
        "module": "law",
        "dir": "susep",
    },
    "bacen": {
        "name": "BACEN — Banco Central do Brasil",
        "description": "Segurança cibernética (4.893), Open Finance (4.658), instrumentos financeiros (CMN 4.966), Pix",
        "module": "law",
        "dir": "bacen",
    },
    "lgpd": {
        "name": "LGPD + CDC — Proteção de Dados e Consumidor",
        "description": "Lei Geral de Proteção de Dados (13.709/2018), Código de Defesa do Consumidor (8.078/1990)",
        "module": "law",
        "dir": "lgpd",
    },
    "anpd": {
        "name": "ANPD — Autoridade Nacional de Proteção de Dados",
        "description": "Agentes de pequeno porte (Res. 2/2022), dosimetria de sanções (Res. 4/2023), comunicação de incidentes (Res. 15/2024)",
        "module": "law",
        "dir": "anpd",
    },
    "aneel": {
        "name": "ANEEL — Agência Nacional de Energia Elétrica",
        "description": "Consolidação distribuição (REN 1.000/2021), geração distribuída (REN 482), bandeiras tarifárias e qualidade",
        "module": "law",
        "dir": "aneel",
    },
    "cmn": {
        "name": "CMN — Conselho Monetário Nacional",
        "description": "Instrumentos financeiros IFRS 9 (Res. 4.966/2021), gestão de riscos (Res. 4.557/2017), PLD/FT (Res. 5.008/2022)",
        "module": "law",
        "dir": "cmn",
    },
    "codigo_civil": {
        "name": "Código Civil Brasileiro",
        "description": "Do Seguro (Arts. 757-802), Contratos em Geral (Arts. 421-480), Responsabilidade Civil (Arts. 927-954)",
        "module": "law",
        "dir": "codigo_civil",
    },
    "cdc": {
        "name": "CDC — Código de Defesa do Consumidor",
        "description": "Direitos básicos (Arts. 6-7), Responsabilidade (Arts. 12-25), Práticas comerciais (Arts. 29-45), Proteção contratual (Arts. 46-54)",
        "module": "law",
        "dir": "cdc",
    },
}

# Map module → (doc_model_class, chunk_model_class)
MODEL_MAP = {
    "law": ("app.models.law", "LegalDocument", "LegalChunk"),
}


async def list_packs(db: AsyncSession) -> list[dict]:
    """List all available regulatory packs with installation status."""
    from sqlalchemy import func
    packs = []
    for pack_id, info in AVAILABLE_PACKS.items():
        doc_model, _ = _get_models(info["module"])
        # Query installed count and last update
        result = await db.execute(
            select(
                func.count(doc_model.id),
                func.max(doc_model.updated_at),
            ).where(
                doc_model.is_shared == True,
                doc_model.is_active == True,
                doc_model.title.like(f"[SEED:{pack_id.upper()}]%"),
            )
        )
        row = result.one()
        installed_count = row[0] or 0
        last_updated = row[1]
        packs.append({
            "id": pack_id,
            **info,
            "installed_count": installed_count,
            "last_updated": last_updated.isoformat() if last_updated else None,
        })
    return packs


def _get_models(module: str):
    """Import and return (doc_model, chunk_model) for a module."""
    import importlib
    mod_path, doc_cls, chunk_cls = MODEL_MAP[module]
    mod = importlib.import_module(mod_path)
    return getattr(mod, doc_cls), getattr(mod, chunk_cls)


async def _count_shared_docs(db: AsyncSession, module: str, pack_id: str) -> int:
    """Count existing shared documents for a pack (by title prefix)."""
    from sqlalchemy import func
    doc_model, _ = _get_models(module)
    result = await db.execute(
        select(func.count(doc_model.id))
        .where(
            doc_model.is_shared == True,
            doc_model.is_active == True,
            doc_model.title.like(f"[SEED:{pack_id.upper()}]%"),
        )
    )
    return result.scalar() or 0


async def seed_pack(
    db: AsyncSession,
    pack_id: str,
    *,
    force: bool = False,
) -> dict:
    """
    Seed a regulatory pack into the shared knowledge base.
    Idempotent: skips if pack already seeded unless force=True.
    """
    if pack_id not in AVAILABLE_PACKS:
        return {"error": f"Pack '{pack_id}' not found. Available: {list(AVAILABLE_PACKS.keys())}"}

    pack = AVAILABLE_PACKS[pack_id]
    module = pack["module"]
    seed_dir = SEEDS_DIR / pack["dir"]

    if not seed_dir.exists():
        return {"error": f"Seed directory not found: {seed_dir}"}

    # Check if already seeded
    if not force:
        existing = await _count_shared_docs(db, module, pack_id)
        if existing > 0:
            return {
                "pack": pack_id,
                "status": "already_seeded",
                "existing_docs": existing,
                "message": f"Pack '{pack_id}' already has {existing} shared docs. Use force=True to re-seed.",
            }

    doc_model, chunk_model = _get_models(module)

    # Discover seed files
    seed_files = sorted(seed_dir.glob("*.txt"))
    if not seed_files:
        return {"error": f"No .txt files found in {seed_dir}"}

    docs_created = 0
    total_chunks = 0

    for filepath in seed_files:
        title = f"[SEED:{pack_id.upper()}] {filepath.stem.replace('_', ' ').title()}"

        # Skip if this exact doc already exists (idempotent)
        existing_doc = await db.execute(
            select(doc_model).where(
                doc_model.title == title,
                doc_model.is_shared == True,
            )
        )
        if existing_doc.scalars().first() is not None:
            logger.info(f"Skipping existing seed doc: {title}")
            continue

        # Read and chunk the file
        text = filepath.read_text(encoding="utf-8")
        if not text.strip():
            continue

        chunks = chunk_text(text, chunk_size=1000, overlap=200)
        if not chunks:
            continue

        # Generate embeddings
        embeddings = embed_batch(chunks)

        # Create document record
        doc_id = uuid.uuid4()
        doc_fields = {
            "id": doc_id,
            "filename": filepath.name,
            "title": title,
            "file_size": len(text.encode("utf-8")),
            "chunk_count": len(chunks),
            "is_shared": True,
        }

        # Module-specific fields (LegalDocument uses user_id, InsuranceDocument uses tenant_id)
        if module == "law":
            doc_fields["user_id"] = "system"
            doc_fields["doc_type"] = "regulation"

        doc_record = doc_model(**doc_fields)
        db.add(doc_record)

        # Create chunk records
        for i, (content, emb) in enumerate(zip(chunks, embeddings)):
            chunk_kwargs = {
                "id": uuid.uuid4(),
                "document_id": doc_id,
                "content": content,
                "chunk_index": i,
                "embedding": emb,
            }
            db.add(chunk_model(**chunk_kwargs))

        docs_created += 1
        total_chunks += len(chunks)
        logger.info(f"Seeded: {title} ({len(chunks)} chunks)")

    await db.commit()

    return {
        "pack": pack_id,
        "pack_name": pack["name"],
        "module": module,
        "status": "seeded",
        "docs_created": docs_created,
        "total_chunks": total_chunks,
    }


async def seed_multiple(
    db: AsyncSession,
    pack_ids: list[str],
    *,
    force: bool = False,
) -> list[dict]:
    """Seed multiple packs at once."""
    results = []
    for pack_id in pack_ids:
        result = await seed_pack(db, pack_id, force=force)
        results.append(result)
    return results
