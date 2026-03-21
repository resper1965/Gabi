"""
Style Profile Service — Manages writing style profiles and knowledge documents.
Formerly the ghost module, now integrated into the law module.

Endpoints:
  - Style profile CRUD
  - Style extraction / refinement (forensic analysis of author voice)
  - Document upload & management (style + content docs with differentiated chunking)

Text generation runs through the unified Gabi orchestrator (law/services.py)
using the 'writer' agent with style_profile_id.
"""

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.auth import CurrentUser, get_current_user, require_module
from app.core.rate_limit import check_rate_limit
from app.core.ai import generate
from app.models.law import StyleProfile, KnowledgeDocument, StyleDocChunk

logger = logging.getLogger("gabi.style")

# Module-level auth: style features require "law" module
ModuleUser = Depends(require_module("law"))

router = APIRouter()

# ── Chunking parameters by doc type ──
CHUNK_PARAMS = {
    "style":   {"chunk_size": 3000, "overlap": 100},
    "content": {"chunk_size": 2000, "overlap": 300},
}

# ── Prompts ──

STYLE_EXTRACTION_PROMPT = """\
Aja como um linguista forense especializado em textos corporativos e jurídicos.
Analise os textos deste autor e crie um 'Manual de Identidade Literária'
extremamente técnico. Extraia:

1. **Vocabulário**: 20 palavras ou expressões exclusivas que ele mais usa
   (incluindo jargão técnico, financeiro ou jurídico recorrente).
2. **Sintaxe e Ritmo**: frases curtas ou longas? Uso de vírgulas, travessões, ponto-e-vírgula?
   Padrão de parágrafos (curtos/longos)?
3. **Comportamento e Tom**: professoral, sarcástico, humilde, assertivo?
   Perguntas retóricas? Uso de primeira pessoa?
4. **Nuances e Padrões**: começa frases com 'E' ou 'Mas'? Usa siglas sem explicar?
   Repete estruturas paralelas? Formalidade variável por contexto?
5. **Padrão de Citação**: como referencia leis, normas, artigos?
   Usa "conforme" ou "de acordo com"? Cita artigo antes da lei?

ALÉM DISSO, ao final, selecione EXATAMENTE 3 trechos dos textos que melhor
representam o estilo do autor (cada um com 200-400 palavras). Escolha trechos
que exemplificam diferentes aspectos (tom argumentativo, narrativo, analítico).

Entregue em JSON:
{{
  "manual": "O prompt de sistema rigoroso para outra IA seguir, com exemplos concretos.",
  "exemplars": [
    "Trecho 1 representativo exatamente como escrito pelo autor...",
    "Trecho 2 representativo exatamente como escrito pelo autor...",
    "Trecho 3 representativo exatamente como escrito pelo autor..."
  ]
}}
"""

STYLE_REFINEMENT_PROMPT = """\
Você é um linguista forense atualizando um Manual de Identidade Literária.

MANUAL ATUAL:
{old_signature}

NOVOS TEXTOS DO MESMO AUTOR:
{new_texts}

INSTRUÇÕES:
1. Compare os novos textos com o manual atual.
2. CONFIRME padrões que se repetem nos novos textos.
3. ADICIONE novos padrões descobertos nos textos recentes.
4. REMOVA padrões que os novos textos contradizem.
5. ATUALIZE os exemplares representativos se os novos textos tiverem melhores exemplos.

Entregue em JSON:
{{
  "manual": "O manual atualizado completo...",
  "exemplars": ["Trecho 1...", "Trecho 2...", "Trecho 3..."],
  "changes": "Resumo das alterações feitas no manual."
}}
"""

# ── Constants ──
MIN_STYLE_DOCS = 3
MIN_STYLE_CHARS = 3000
REFRESH_INTERVAL = 3

# ── Request Models ──

class ProfileCreate(BaseModel):
    name: str


# ── Helpers ──

async def _get_owned_profile(
    profile_id: str, user_uid: str, db: AsyncSession
) -> StyleProfile:
    result = await db.execute(
        select(StyleProfile).where(StyleProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Perfil não encontrado.")
    if profile.user_id != user_uid:
        raise HTTPException(403, "Acesso negado a este perfil.")
    return profile


# ── Profile Management ──

@router.get("/profiles")
async def list_profiles(
    user: CurrentUser = ModuleUser,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(StyleProfile)
        .where(StyleProfile.user_id == user.uid, StyleProfile.is_active == True)
        .order_by(StyleProfile.updated_at.desc())
    )
    profiles = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "samples": p.sample_count,
            "has_signature": p.style_signature is not None,
            "needs_refresh": p.needs_refresh,
        }
        for p in profiles
    ]


@router.post("/profiles")
async def create_profile(
    profile: ProfileCreate,
    user: CurrentUser = ModuleUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    new_profile = StyleProfile(user_id=user.uid, name=profile.name)
    db.add(new_profile)
    await db.commit()
    await db.refresh(new_profile)
    return {"id": str(new_profile.id), "name": new_profile.name}


# ── Document Upload & Management ──

@router.post("/upload")
async def upload_document(
    profile_id: str,
    doc_type: str = "content",
    file: UploadFile = File(...),
    user: CurrentUser = ModuleUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    check_rate_limit(user.uid)
    if doc_type not in ("style", "content"):
        raise HTTPException(400, "doc_type deve ser 'style' ou 'content'")

    profile = await _get_owned_profile(profile_id, user.uid, db)

    from app.core.ingest import process_document

    params = CHUNK_PARAMS.get(doc_type, CHUNK_PARAMS["content"])

    result = await process_document(
        file=file,
        db=db,
        doc_model=KnowledgeDocument,
        chunk_model=StyleDocChunk,
        doc_fields={
            "user_id": user.uid,
            "profile_id": profile_id,
            "doc_type": doc_type,
            "title": Path(file.filename or "unknown").stem.replace("_", " ").title(),
        },
        chunk_size=params["chunk_size"],
        overlap=params["overlap"],
    )

    if "error" in result:
        raise HTTPException(422, result["error"])

    profile.sample_count = (profile.sample_count or 0) + 1

    if doc_type == "style" and profile.style_signature:
        profile.needs_refresh = True

    await db.commit()

    response = {**result}
    if profile.needs_refresh and profile.sample_count % REFRESH_INTERVAL == 0:
        response["style_refresh_recommended"] = True
        response["refresh_message"] = (
            f"Você adicionou {REFRESH_INTERVAL} novos documentos de estilo desde a última extração. "
            f"Recomendamos re-executar /extract-style para refinar a assinatura."
        )

    return response


@router.get("/documents")
async def list_documents(
    profile_id: str | None = None,
    user: CurrentUser = ModuleUser,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    query = (
        select(KnowledgeDocument)
        .where(KnowledgeDocument.user_id == user.uid)
        .order_by(KnowledgeDocument.created_at.desc())
    )
    if profile_id and profile_id != "default":
        try:
            import uuid as _uuid
            _uuid.UUID(profile_id)
            query = query.where(KnowledgeDocument.profile_id == profile_id)
        except ValueError:
            pass

    result = await db.execute(query)
    docs = result.scalars().all()

    return [
        {
            "id": str(d.id),
            "title": d.title or d.filename,
            "filename": d.filename,
            "doc_type": d.doc_type,
            "chunk_count": d.chunk_count,
            "file_size": d.file_size or 0,
            "profile_id": str(d.profile_id) if d.profile_id else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    user: CurrentUser = ModuleUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(KnowledgeDocument).where(
            KnowledgeDocument.id == doc_id,
            KnowledgeDocument.user_id == user.uid,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento não encontrado")

    await db.execute(
        text("DELETE FROM ghost_doc_chunks WHERE document_id = :did::uuid"),
        {"did": doc_id},
    )
    await db.delete(doc)
    await db.commit()
    return {"deleted": True, "document_id": doc_id}


# ── Style Extraction ──

@router.post("/profiles/{profile_id}/extract-style")
async def extract_style(
    profile_id: str,
    user: CurrentUser = ModuleUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    check_rate_limit(user.uid)
    profile = await _get_owned_profile(profile_id, user.uid, db)

    chunks_result = await db.execute(
        text("""
            SELECT c.content FROM ghost_doc_chunks c
            JOIN ghost_knowledge_docs d ON c.document_id = d.id
            WHERE d.profile_id = :pid::uuid AND d.doc_type = 'style'
              AND d.user_id = :uid
            ORDER BY d.created_at, c.chunk_index
        """),
        {"pid": profile_id, "uid": user.uid},
    )
    chunks = [row[0] for row in chunks_result]

    if not chunks:
        raise HTTPException(
            422, "Nenhum documento de estilo encontrado. Faça upload primeiro."
        )

    doc_count_result = await db.execute(
        text("""
            SELECT COUNT(DISTINCT d.id) FROM ghost_knowledge_docs d
            WHERE d.profile_id = :pid::uuid AND d.doc_type = 'style'
              AND d.user_id = :uid
        """),
        {"pid": profile_id, "uid": user.uid},
    )
    doc_count = doc_count_result.scalar() or 0
    combined = "\n\n---\n\n".join(chunks)[:50000]

    if doc_count < MIN_STYLE_DOCS or len(combined) < MIN_STYLE_CHARS:
        raise HTTPException(
            422,
            f"Insuficiente para extração confiável. Envie pelo menos {MIN_STYLE_DOCS} documentos "
            f"com no mínimo {MIN_STYLE_CHARS} caracteres. Atual: {doc_count} docs, {len(combined)} chars.",
        )

    is_refinement = bool(profile.style_signature and profile.needs_refresh)

    if is_refinement:
        raw = await generate(
            module="ghost",
            prompt=STYLE_REFINEMENT_PROMPT.format(
                old_signature=profile.style_signature[:5000],
                new_texts=combined,
            ),
        )
    else:
        raw = await generate(
            module="ghost",
            prompt=f"Textos do autor:\n\n{combined}",
            system_instruction=STYLE_EXTRACTION_PROMPT,
        )

    from app.core.ai import safe_parse_json
    parsed = safe_parse_json(raw)

    signature = parsed.get("manual", raw)
    exemplars = parsed.get("exemplars", [])
    exemplars = [e.strip() for e in exemplars if isinstance(e, str) and len(e.strip()) > 50][:3]

    profile.style_signature = signature
    profile.style_exemplars = exemplars
    profile.needs_refresh = False
    await db.commit()

    result = {
        "signature_preview": signature[:500] + "...",
        "exemplar_count": len(exemplars),
        "status": "refined" if is_refinement else "extracted",
    }
    if is_refinement:
        result["changes"] = parsed.get("changes", "")

    return result
