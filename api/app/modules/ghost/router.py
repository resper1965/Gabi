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
from app.core.rate_limit import check_rate_limit
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
4. NUNCA invente dados factuais (nomes, datas, números, citações, estatísticas).
5. Prefira deixar lacunas marcadas do que fabricar informações.
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

# ── Document Management ──

@router.get("/documents")
async def list_documents(
    profile_id: str | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all knowledge documents for the current user, optionally filtered by profile."""
    query = (
        select(KnowledgeDocument)
        .where(KnowledgeDocument.user_id == user.uid)
        .order_by(KnowledgeDocument.created_at.desc())
    )
    if profile_id:
        query = query.where(KnowledgeDocument.profile_id == profile_id)

    result = await db.execute(query)
    docs = result.scalars().all()

    return [
        {
            "id": str(d.id),
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
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document and all its chunks."""
    result = await db.execute(
        select(KnowledgeDocument).where(
            KnowledgeDocument.id == doc_id,
            KnowledgeDocument.user_id == user.uid,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        return {"error": "Documento não encontrado"}

    # Delete chunks first
    await db.execute(
        text("DELETE FROM ghost_doc_chunks WHERE document_id = :did"),
        {"did": doc_id},
    )
    await db.delete(doc)
    await db.commit()

    return {"deleted": True, "document_id": doc_id}

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
            SELECT c.content, d.title, d.doc_type
            FROM ghost_doc_chunks c
            JOIN ghost_knowledge_docs d ON c.document_id = d.id
            WHERE d.profile_id = :pid AND d.doc_type = 'content'
              AND c.embedding IS NOT NULL
            ORDER BY c.embedding <=> :emb::vector
            LIMIT 5
        """),
        {"pid": req.profile_id, "emb": str(query_embedding)},
    )
    raw_chunks = [dict(row._mapping) for row in content_results]
    content_chunks = [c["content"] for c in raw_chunks]

    # Deduplicate sources by title
    seen_titles = set()
    sources = []
    for c in raw_chunks:
        title = c.get("title", "")
        if title and title not in seen_titles:
            seen_titles.add(title)
            sources.append({"title": title, "type": c.get("doc_type", "")})

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

    return {"text": response, "profile": profile.name, "sources": sources}


@router.post("/generate-stream")
async def generate_text_stream(
    req: GenerateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream text generation using Style Signature + Content RAG.
    Returns Server-Sent Events (SSE) with text chunks.
    """
    from fastapi.responses import StreamingResponse
    from app.core.ai import generate_stream

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
            SELECT c.content, d.title, d.doc_type
            FROM ghost_doc_chunks c
            JOIN ghost_knowledge_docs d ON c.document_id = d.id
            WHERE d.profile_id = :pid AND d.doc_type = 'content'
              AND c.embedding IS NOT NULL
            ORDER BY c.embedding <=> :emb::vector
            LIMIT 5
        """),
        {"pid": req.profile_id, "emb": str(query_embedding)},
    )
    raw_chunks = [dict(row._mapping) for row in content_results]
    content_chunks = [c["content"] for c in raw_chunks]

    context = "\n".join(f"• {c[:500]}" for c in content_chunks) if content_chunks else "Nenhum conteúdo encontrado na base."

    full_prompt = f"""
[CONTEÚDO FACTUAL (Base RAG)]
{context}

[PEDIDO DO USUÁRIO]
{req.prompt}
"""

    async def event_generator():
        import json as _json
        async for chunk_text in generate_stream(
            module="ghost",
            prompt=full_prompt,
            system_instruction=profile.system_prompt,
            chat_history=req.chat_history,
        ):
            yield f"data: {_json.dumps({'text': chunk_text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
