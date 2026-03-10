"""
nGhost Module — Ghost Writer with Style Signature + Dual RAG

Improvements implemented:
 1. Few-shot exemplars: top-3 representative excerpts injected in generation prompt
 2. Full chunk context: no more 500-char truncation on RAG results
 3. Differentiated chunking: style=3000 chars, content=2000 chars
 4. Incremental style refinement: auto-suggest re-extraction after new style uploads
 5. Style compliance score: post-generation fidelity check (opt-in)

Also includes all P0/P1/P2 fixes from previous audit.
"""

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.analytics import log_event
from app.core.auth import CurrentUser, get_current_user
from app.core.ai import generate, generate_json
from app.core.embeddings import embed
from app.core.rate_limit import check_rate_limit
from app.core.memory import summarize, should_summarize
from app.models.ghost import StyleProfile, KnowledgeDocument, DocumentChunk

logger = logging.getLogger("gabi.ghost")

router = APIRouter()

# ── Chunking parameters by doc type (Improvement #3) ──
CHUNK_PARAMS = {
    "style":   {"chunk_size": 3000, "overlap": 100},   # Preserve natural flow
    "content": {"chunk_size": 2000, "overlap": 300},    # Maximize fact retrieval
}

# ── System Prompts ──

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

GHOST_WRITER_PROMPT = """\
[PERSONA] Você é a Gabi, Ghost Writer profissional de elite.
Você é INVISÍVEL. O leitor não deve perceber que uma IA escreveu.

[MANUAL DE ESTILO DO AUTOR]
{style_signature}

[EXEMPLOS REPRESENTATIVOS DO ESTILO DO AUTOR — use como referência literária]
{exemplars_block}

[REGRAS]
1. Siga o manual de estilo FIELMENTE — tom, vocabulário, ritmo.
2. Use APENAS os fatos da base de conteúdo abaixo.
3. Se um dado factual não estiver na base: "[⚠️ Dado não encontrado — preencher]"
4. NUNCA invente dados factuais (nomes, datas, números, citações, estatísticas).
5. Prefira deixar lacunas marcadas do que fabricar informações.
6. Mantenha a voz autoral consistente do início ao fim do texto.
7. Imite a estrutura de frases e parágrafos dos exemplos acima.
"""

STYLE_VERIFY_PROMPT = """\
Compare o texto gerado com o Manual de Estilo do autor abaixo.
Avalie a fidelidade estilística.

MANUAL DE ESTILO:
{style_signature}

TEXTO GERADO:
{generated_text}

Responda em JSON:
{{
  "score": 85,
  "deviations": [
    "No parágrafo 2, o tom é mais formal que o padrão do autor.",
    "Excesso de frases longas — o autor prefere frases curtas."
  ],
  "suggestions": [
    "Reescrever parágrafo 2 em tom mais direto.",
    "Quebrar a frase X em duas."
  ]
}}
"""

# ── Constants ──
MIN_STYLE_DOCS = 3
MIN_STYLE_CHARS = 3000
REFRESH_INTERVAL = 3  # Re-suggest extraction every N new style docs


# ── Request Models ──

class GenerateRequest(BaseModel):
    profile_id: str
    prompt: str
    chat_history: list[dict] | None = None
    verify_style: bool = False  # Opt-in style compliance check (#5)


class ProfileCreate(BaseModel):
    name: str


# ── Helpers ──

async def _get_owned_profile(
    profile_id: str, user_uid: str, db: AsyncSession
) -> StyleProfile:
    """Fetch a profile and verify ownership. Raises 404/403."""
    result = await db.execute(
        select(StyleProfile).where(StyleProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Perfil não encontrado.")
    if profile.user_id != user_uid:
        raise HTTPException(403, "Acesso negado a este perfil.")
    return profile


def _build_exemplars_block(exemplars: list[str] | None) -> str:
    """Format exemplars for injection into the generation prompt."""
    if not exemplars:
        return "(Nenhum exemplar disponível)"
    parts = []
    for i, ex in enumerate(exemplars[:3], 1):
        parts.append(f'Exemplo {i}:\n"""\n{ex}\n"""')
    return "\n\n".join(parts)


def _build_system_prompt(profile: StyleProfile) -> str:
    """Build the full system prompt with signature + exemplars."""
    return GHOST_WRITER_PROMPT.format(
        style_signature=profile.style_signature or "",
        exemplars_block=_build_exemplars_block(profile.style_exemplars),
    )


async def _build_generation_context(
    prompt: str,
    profile: StyleProfile,
    chat_history: list[dict] | None,
    user_uid: str,
    db: AsyncSession,
) -> tuple[str, list[dict], str]:
    """
    Shared helper for /generate and /generate-stream.
    Returns (full_prompt, sources_list, system_prompt).
    """
    if not profile.style_signature:
        raise HTTPException(
            400, "Perfil sem Style Signature. Execute /extract-style primeiro."
        )

    system_prompt = _build_system_prompt(profile)

    # Memory: summarize long conversations to cut tokens
    history = chat_history or []
    if should_summarize(len(history)):
        summary = await summarize(history)
        if summary:
            history = [{"role": "model", "content": f"[Resumo da conversa]: {summary}"}] + history[-4:]

    # RAG: search content documents
    from app.core.dynamic_rag import retrieve_if_needed

    raw_chunks, _ = await retrieve_if_needed(
        question=prompt,
        chat_history=history,
        db=db,
        module="ghost",
        user_id=user_uid,
        profile_id=str(profile.id),
        limit=5,
    )

    # Deduplicate sources by title
    seen_titles: set[str] = set()
    sources: list[dict] = []
    for c in raw_chunks:
        title = c.get("title", "")
        if title and title not in seen_titles:
            seen_titles.add(title)
            sources.append({"title": title, "type": c.get("doc_type", "")})

    # Improvement #2: Use FULL chunk content — no truncation
    # Gemini Flash supports 1M context, so full chunks are fine
    if raw_chunks:
        context_parts = []
        for c in raw_chunks:
            source_label = c.get("title", "Documento")
            context_parts.append(f"[Fonte: {source_label}]\n{c['content']}")
        context = "\n\n---\n\n".join(context_parts)
    else:
        context = "Nenhum conteúdo encontrado na base."

    full_prompt = f"""\
[CONTEÚDO FACTUAL (Base RAG)]
{context}

[PEDIDO DO USUÁRIO]
{prompt}
"""
    return full_prompt, sources, system_prompt


async def _verify_style_compliance(
    generated_text: str, style_signature: str
) -> dict | None:
    """Improvement #5: Post-generation style fidelity check."""
    try:
        result = await generate_json(
            module="ntalk",  # Flash — cheap
            prompt=STYLE_VERIFY_PROMPT.format(
                style_signature=style_signature[:2000],
                generated_text=generated_text[:3000],
            ),
        )
        return {
            "score": result.get("score", 0),
            "deviations": result.get("deviations", []),
            "suggestions": result.get("suggestions", []),
        }
    except Exception as e:
        logger.warning("Style verification failed: %s", e)
        return None


# ── Document Upload ──

@router.post("/upload")
async def upload_document(
    profile_id: str,
    doc_type: str = "content",
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a style or content document to a profile."""
    if doc_type not in ("style", "content"):
        raise HTTPException(400, "doc_type deve ser 'style' ou 'content'")

    profile = await _get_owned_profile(profile_id, user.uid, db)

    from app.core.ingest import process_document

    # Improvement #3: Differentiated chunking parameters
    params = CHUNK_PARAMS.get(doc_type, CHUNK_PARAMS["content"])

    result = await process_document(
        file=file,
        db=db,
        doc_model=KnowledgeDocument,
        chunk_model=DocumentChunk,
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

    # Update sample count
    profile.sample_count = (profile.sample_count or 0) + 1

    # Improvement #4: Flag for incremental refinement
    if doc_type == "style" and profile.style_signature:
        profile.needs_refresh = True

    await db.commit()

    # Notify if refresh is recommended
    response = {**result}
    if profile.needs_refresh and profile.sample_count % REFRESH_INTERVAL == 0:
        response["style_refresh_recommended"] = True
        response["refresh_message"] = (
            f"Você adicionou {REFRESH_INTERVAL} novos documentos de estilo desde a última extração. "
            f"Recomendamos re-executar /extract-style para refinar a assinatura."
        )

    return response


# ── Document Management ──

@router.get("/documents")
async def list_documents(
    profile_id: str | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all knowledge documents for the current user."""
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
        raise HTTPException(404, "Documento não encontrado")

    await db.execute(
        text("DELETE FROM ghost_doc_chunks WHERE document_id = :did::uuid"),
        {"did": doc_id},
    )
    await db.delete(doc)
    await db.commit()
    return {"deleted": True, "document_id": doc_id}


# ── Profile Management ──

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
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new style profile."""
    new_profile = StyleProfile(user_id=user.uid, name=profile.name)
    db.add(new_profile)
    await db.commit()
    await db.refresh(new_profile)
    return {"id": str(new_profile.id), "name": new_profile.name}


# ── Style Extraction ──

@router.post("/profiles/{profile_id}/extract-style")
async def extract_style(
    profile_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Extract (or refine) Style Signature + Exemplars.
    If a signature already exists and new docs were added, performs incremental refinement.
    """
    profile = await _get_owned_profile(profile_id, user.uid, db)

    # Get all style chunks
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

    # Minimum threshold
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

    # Improvement #4: Incremental refinement vs first-time extraction
    is_refinement = bool(profile.style_signature and profile.needs_refresh)

    if is_refinement:
        # Refinement: send old signature + new texts
        raw = await generate(
            module="ghost",
            prompt=STYLE_REFINEMENT_PROMPT.format(
                old_signature=profile.style_signature[:5000],
                new_texts=combined,
            ),
        )
    else:
        # First extraction: forensic analysis
        raw = await generate(
            module="ghost",
            prompt=f"Textos do autor:\n\n{combined}",
            system_instruction=STYLE_EXTRACTION_PROMPT,
        )

    # Parse structured response (manual + exemplars)
    from app.core.ai import safe_parse_json
    parsed = safe_parse_json(raw)

    signature = parsed.get("manual", raw)  # Fallback to full text if parsing fails
    exemplars = parsed.get("exemplars", [])

    # Ensure exemplars are strings and non-empty
    exemplars = [e.strip() for e in exemplars if isinstance(e, str) and len(e.strip()) > 50][:3]

    # Save to profile
    profile.style_signature = signature
    profile.style_exemplars = exemplars
    profile.system_prompt = _build_system_prompt(profile)
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


# ── Generation ──

@router.post("/generate")
async def generate_text(
    req: GenerateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate text using Style Signature + Few-Shot Exemplars + Content RAG."""
    await check_rate_limit(user.uid, "ghost_generate", max_requests=30, window_seconds=60)

    profile = await _get_owned_profile(req.profile_id, user.uid, db)
    full_prompt, sources, system_prompt = await _build_generation_context(
        req.prompt, profile, req.chat_history, user.uid, db
    )

    response = await generate(
        module="ghost",
        prompt=full_prompt,
        system_instruction=system_prompt,
        chat_history=req.chat_history,
    )

    await log_event(
        db, user.uid, "ghost", "query",
        metadata={"profile": profile.name, "sources": len(sources)},
    )

    result = {"text": response, "profile": profile.name, "sources": sources}

    # Improvement #5: Optional style compliance score
    if req.verify_style and profile.style_signature:
        compliance = await _verify_style_compliance(response, profile.style_signature)
        if compliance:
            result["style_compliance"] = compliance

    return result


@router.post("/generate-stream")
async def generate_text_stream(
    req: GenerateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream text generation using Style Signature + Few-Shot Exemplars + Content RAG (SSE)."""
    from fastapi.responses import StreamingResponse
    from app.core.ai import generate_stream
    import json as _json

    await check_rate_limit(user.uid, "ghost_generate", max_requests=30, window_seconds=60)

    profile = await _get_owned_profile(req.profile_id, user.uid, db)
    full_prompt, sources, system_prompt = await _build_generation_context(
        req.prompt, profile, req.chat_history, user.uid, db
    )

    async def event_generator():
        collected_text = []
        try:
            async for chunk_text in generate_stream(
                module="ghost",
                prompt=full_prompt,
                system_instruction=system_prompt,
                chat_history=req.chat_history,
            ):
                collected_text.append(chunk_text)
                yield f"data: {_json.dumps({'text': chunk_text})}\n\n"

            # Send sources
            yield f"data: {_json.dumps({'sources': sources})}\n\n"

            # Improvement #5: Optional style verification after streaming
            if req.verify_style and profile.style_signature:
                full_text = "".join(collected_text)
                compliance = await _verify_style_compliance(full_text, profile.style_signature)
                if compliance:
                    yield f"data: {_json.dumps({'style_compliance': compliance})}\n\n"

            yield "data: [DONE]\n\n"
        except Exception as stream_err:
            logger.error("Ghost stream error: %s", stream_err, exc_info=True)
            yield f'data: {_json.dumps({"error": str(stream_err)})}\n\n'
            yield "data: [DONE]\n\n"

    await log_event(
        db, user.uid, "ghost", "query_stream",
        metadata={"profile": profile.name, "sources": len(sources)},
    )

    return StreamingResponse(event_generator(), media_type="text/event-stream")
