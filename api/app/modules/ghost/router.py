"""
nGhost Module — Ghost Writer with Style Signature + Dual RAG
"""

from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.auth import CurrentUser, get_current_user, require_role
from app.core.ai import generate
from app.core.embeddings import embed
from app.models.ghost import StyleProfile, KnowledgeDocument, DocumentChunk

router = APIRouter()

# ── System Prompts ──

STYLE_EXTRACTION_PROMPT = """
Aja como um linguista forense. Analise os textos deste autor e crie um
'Manual de Identidade Literária' extremamente técnico. Extraia:
1. Vocabulário: 20 palavras ou expressões exclusivas que ele mais usa.
2. Sintaxe e Ritmo: frases curtas ou longas? Uso de vírgulas e travessões?
3. Comportamento e Tom: professoral, sarcástico, humilde? Perguntas retóricas?
4. Nuances e 'Erros' Intencionais: começa frases com 'E' ou 'Mas'? Gírias?
Entregue como um prompt de sistema rigoroso para outra IA seguir.
"""

GHOST_WRITER_PROMPT = """
[PERSONA] Você é a Gabi, Ghost Writer profissional de elite.
Você é INVISÍVEL. O leitor não deve perceber que uma IA escreveu.

[MANUAL DE ESTILO DO AUTOR]
{style_signature}

[REGRAS]
1. Siga o manual de estilo FIELMENTE.
2. Use APENAS os fatos da base de conteúdo abaixo.
3. Se um dado factual não estiver na base: "[⚠️ Dado não encontrado — preencher]"
"""


class GenerateRequest(BaseModel):
    profile_id: str
    prompt: str
    chat_history: list[dict] | None = None


# ── Routes ──

@router.post("/upload")
async def upload_document(
    profile_id: str,
    doc_type: str = "content",
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a style or content document to a profile.
    doc_type: 'style' (for style extraction) or 'content' (for RAG).
    """
    if doc_type not in ("style", "content"):
        return {"error": "doc_type deve ser 'style' ou 'content'"}

    from app.core.ingest import process_document

    result = await process_document(
        file=file,
        db=db,
        doc_model=KnowledgeDocument,
        chunk_model=DocumentChunk,
        doc_fields={
            "user_id": user.uid,
            "profile_id": profile_id,
            "doc_type": doc_type,
        },
    )

    if "error" not in result:
        # Update sample count on profile
        profile_result = await db.execute(
            select(StyleProfile).where(StyleProfile.id == profile_id)
        )
        profile = profile_result.scalar_one_or_none()
        if profile:
            profile.sample_count = (profile.sample_count or 0) + 1
            await db.commit()

    return result

@router.get("/profiles")
async def list_profiles(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's style profiles."""
    result = await db.execute(
        select(StyleProfile)
        .where(StyleProfile.user_id == user.uid, StyleProfile.is_active == True)
        .order_by(StyleProfile.updated_at.desc())
    )
    profiles = result.scalars().all()
    return [{"id": str(p.id), "name": p.name, "samples": p.sample_count,
             "has_signature": p.style_signature is not None} for p in profiles]


@router.post("/profiles")
async def create_profile(
    name: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new style profile."""
    profile = StyleProfile(user_id=user.uid, name=name)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return {"id": str(profile.id), "name": profile.name}


@router.post("/profiles/{profile_id}/extract-style")
async def extract_style(
    profile_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Extract Style Signature — runs ONCE per profile.
    Reads all style documents, sends to Gemini Flash for forensic analysis.
    """
    # Get style chunks for this profile
    chunks_result = await db.execute(
        text("""
            SELECT c.content FROM ghost_doc_chunks c
            JOIN ghost_knowledge_docs d ON c.document_id = d.id
            WHERE d.profile_id = :pid AND d.doc_type = 'style'
            ORDER BY d.created_at, c.chunk_index
        """),
        {"pid": profile_id},
    )
    chunks = [row[0] for row in chunks_result]

    if not chunks:
        return {"error": "Nenhum documento de estilo encontrado. Faça upload primeiro."}

    # Combine texts (limit to ~50k chars for Flash)
    combined = "\n\n---\n\n".join(chunks)[:50000]

    # One-time extraction via Gemini Flash (cheap)
    signature = await generate(
        module="ghost",
        prompt=f"Textos do autor:\n\n{combined}",
        system_instruction=STYLE_EXTRACTION_PROMPT,
    )

    # Save signature
    result = await db.execute(
        select(StyleProfile).where(StyleProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if profile:
        profile.style_signature = signature
        profile.system_prompt = GHOST_WRITER_PROMPT.format(style_signature=signature)
        await db.commit()

    return {"signature": signature[:500] + "...", "status": "extracted"}


@router.post("/generate")
async def generate_text(
    req: GenerateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate text using Style Signature + Content RAG.
    Cost per generation: minimal (signature is ~500 tokens, no re-reading docs).
    """
    # Get profile with signature
    result = await db.execute(
        select(StyleProfile).where(StyleProfile.id == req.profile_id)
    )
    profile = result.scalar_one_or_none()
    if not profile or not profile.style_signature:
        return {"error": "Perfil sem Style Signature. Execute /extract-style primeiro."}

    # RAG: search content documents
    query_embedding = embed(req.prompt)
    content_results = await db.execute(
        text("""
            SELECT c.content FROM ghost_doc_chunks c
            JOIN ghost_knowledge_docs d ON c.document_id = d.id
            WHERE d.profile_id = :pid AND d.doc_type = 'content'
              AND c.embedding IS NOT NULL
            ORDER BY c.embedding <=> :emb::vector
            LIMIT 5
        """),
        {"pid": req.profile_id, "emb": str(query_embedding)},
    )
    content_chunks = [row[0] for row in content_results]

    # Build prompt: signature (tiny) + content RAG + user request
    context = "\n".join(f"• {c[:500]}" for c in content_chunks) if content_chunks else "Nenhum conteúdo encontrado na base."

    full_prompt = f"""
[CONTEÚDO FACTUAL (Base RAG)]
{context}

[PEDIDO DO USUÁRIO]
{req.prompt}
"""

    response = await generate(
        module="ghost",
        prompt=full_prompt,
        system_instruction=profile.system_prompt,
        chat_history=req.chat_history,
    )

    return {"text": response, "profile": profile.name}
