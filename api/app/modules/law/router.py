"""
Law & Comply Module — Unified Router
Delegates to sub-modules: agents, insights, insurance.
Core endpoints: upload, agent invocation, documents, alerts.
"""

import io
import json
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.analytics import log_event
from app.core.auth import CurrentUser, get_current_user
from app.core.ai import generate, generate_json
from app.core.embeddings import embed
from app.core.rate_limit import check_rate_limit
from app.core.dynamic_rag import retrieve_if_needed, should_retrieve, format_rag_context
from app.core.memory import summarize, should_summarize
from app.core.multi_agent import debate, AgentConfig
from app.models.law import LegalDocument, LegalChunk, RegulatoryAlert
from app.models.insightcare import ClaimsData

# Sub-module imports
from app.modules.law.agents import (
    AGENTS, INSURANCE_AGENTS, classify_query, is_insurance_query,
    get_model_module, JSON_OUTPUT_AGENTS,
)
from app.modules.law.insights import router as insights_router
from app.modules.law.insurance import router as insurance_router

router = APIRouter()

# Include sub-routers (same prefix, endpoints merge seamlessly)
router.include_router(insights_router)
router.include_router(insurance_router)


# ── Pydantic types ──

LegalDocType = Literal["law", "regulation", "contract", "policy", "precedent", "petition", "opinion", "gold_piece"]


class AgentRequest(BaseModel):
    agent: str  # auto, auditor, researcher, drafter, watcher, writer, policy_analyst, claims_analyst, regulatory_consultant
    query: str
    document_text: str | None = None
    chat_history: list[dict] | None = None
    style_profile_id: str | None = None  # For writer agent — references ghost style profile
    # Insurance-specific fields
    tenant_id: str | None = None
    client_id: str | None = None
    summary: str | None = None


# ── Text extraction (ephemeral — for inline chat analysis) ──

@router.post("/extract-text")
async def extract_text_endpoint(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
):
    """Extract text from a file without storing it. Used by inline chat upload."""
    from app.core.ingest import extract_text

    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(413, "Arquivo muito grande (máx 10MB)")
    text = extract_text(data, file.filename or "file.txt")
    if not text.strip():
        raise HTTPException(422, "Não foi possível extrair texto do arquivo")
    return {"text": text, "filename": file.filename, "size": len(text)}


# ── Upload ──

@router.post("/upload")
async def upload_document(
    doc_type: LegalDocType | None = None,
    title: str | None = None,
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a legal document with AI auto-classification."""
    from app.core.ingest import process_document
    from app.services.doc_classifier import classify_document

    result = await process_document(
        file=file,
        db=db,
        doc_model=LegalDocument,
        chunk_model=LegalChunk,
        doc_fields={
            "user_id": user.uid,
            "doc_type": doc_type or "law",  # temporary, overridden by classifier
            "title": title or file.filename,
        },
    )

    # Auto-classify in background after chunks are created
    doc_id = result.get("document_id")
    if doc_id:
        try:
            doc = (await db.execute(
                select(LegalDocument).where(LegalDocument.id == doc_id)
            )).scalars().first()
            if doc:
                # Get text from first chunks for classification
                chunks_res = await db.execute(
                    select(LegalChunk.content)
                    .where(LegalChunk.document_id == doc_id)
                    .order_by(LegalChunk.chunk_index)
                    .limit(5)
                )
                full_text = "\n".join(r[0] for r in chunks_res)

                classification = await classify_document(full_text, fallback_type=doc_type or "law")
                doc.doc_type = classification["tipo"]
                doc.area_direito = classification["area_direito"]
                doc.tema = classification["tema"]
                doc.partes = classification["partes"]
                doc.resumo_ia = classification["resumo"]
                await db.commit()

                result["classification"] = {
                    "tipo": doc.doc_type,
                    "area_direito": doc.area_direito,
                    "tema": doc.tema,
                    "resumo_ia": doc.resumo_ia,
                }
        except Exception as e:
            import logging
            logging.getLogger("gabi.law").warning("Auto-classification failed for %s: %s", doc_id, e)

    return result


@router.post("/upload-batch")
async def upload_batch(
    files: list[UploadFile] = File(...),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload multiple legal documents at once. Each is auto-classified by AI."""
    results = []
    for file in files:
        try:
            result = await upload_document(
                doc_type=None,
                title=file.filename,
                file=file,
                user=user,
                db=db,
            )
            results.append({"filename": file.filename, "status": "ok", **result})
        except Exception as e:
            results.append({"filename": file.filename, "status": "error", "error": str(e)})

    return {
        "total": len(files),
        "success": sum(1 for r in results if r["status"] == "ok"),
        "errors": sum(1 for r in results if r["status"] == "error"),
        "results": results,
    }


# ── Agent Invocation ──

@router.post("/agent")
async def invoke_agent(
    req: AgentRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invoke a specialized agent with dynamic RAG + multi-agent debate."""
    check_rate_limit(user.uid)

    # ── Orchestrator: auto-select agents ──
    orchestration = None
    if req.agent == "auto":
        orchestration = await classify_query(req.query)
        selected_agents = orchestration["agents"]
    else:
        system_prompt = AGENTS.get(req.agent)
        if not system_prompt:
            agent_list = ", ".join(AGENTS.keys())
            raise HTTPException(status_code=400, detail=f"Agente '{req.agent}' não encontrado. Use: auto, {agent_list}")
        selected_agents = [req.agent]

    is_insurance = is_insurance_query(selected_agents)

    # ── Dynamic RAG ──
    chunks, did_retrieve = await _fetch_rag_context(req, user, db, is_insurance)
    rag_context = format_rag_context(chunks)

    # Deduplicate sources by title for frontend display
    sources = _deduplicate_sources(chunks)

    # For claims_analyst, always fetch numeric data
    claims_context = ""
    if "claims_analyst" in selected_agents and req.client_id and req.tenant_id:
        claims_context = await _fetch_claims_context(req.tenant_id, req.client_id, db)

    # ── Multi-agent path: 2+ agents → debate + synthesis ──
    if len(selected_agents) > 1:
        agent_configs = [
            AgentConfig(
                name=a,
                system_prompt=AGENTS[a],
                module=get_model_module(a),
                output_json=a in JSON_OUTPUT_AGENTS,
            )
            for a in selected_agents
        ]
        result = await debate(
            agents=agent_configs,
            query=f"{rag_context}\n{claims_context}\n\n[CONSULTA]\n{req.document_text or req.query}",
            rag_context="",
            chat_history=req.chat_history,
        )
        content = result
        agent_label = "+".join(selected_agents)
    else:
        # ── Single-agent path ──
        single_agent = selected_agents[0]
        agent_label = single_agent
        system_prompt = AGENTS[single_agent]

        prompt = f"""
{rag_context}
{claims_context}

[CONSULTA/CONTRATO]
{req.document_text or req.query}

Execute a análise conforme suas instruções.
"""
        module = get_model_module(single_agent)

        if single_agent in JSON_OUTPUT_AGENTS:
            result = await generate_json(module=module, prompt=prompt, system_instruction=system_prompt)
            content = result
        else:
            content = await generate(module=module, prompt=prompt,
                                     system_instruction=system_prompt, chat_history=req.chat_history)
            result = {"text": content} if isinstance(content, str) else content

    # Memory summary
    new_summary = None
    if req.chat_history and should_summarize(len(req.chat_history)):
        try:
            new_summary = await summarize(req.chat_history)
        except Exception:
            pass

    await log_event(db, user.uid, "law", "query", metadata={
        "agent": agent_label, "sources": len(chunks), "orchestrated": req.agent == "auto",
    })
    return {
        "agent": agent_label,
        "result": result,
        "response": content,
        "sources_used": len(chunks),
        "sources": sources,
        "dynamic_rag": did_retrieve,
        "orchestration": orchestration,
        "summary": new_summary,
    }


# ── Agent Streaming ──

@router.post("/agent-stream")
async def invoke_agent_stream(
    req: AgentRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Streaming variant of /agent.
    RAG + orchestration run synchronously; the final LLM generation streams as SSE.

    SSE protocol:
      data: {"type": "meta", "sources": [...], "orchestration": {...}}  ← first event
      data: {"type": "text", "text": "<chunk>"}                         ← N events
      data: [DONE]
    """
    from app.core.ai import generate_stream

    check_rate_limit(user.uid)

    orchestration = None
    if req.agent == "auto":
        orchestration = await classify_query(req.query)
        selected_agents = orchestration["agents"]
    else:
        system_prompt = AGENTS.get(req.agent)
        if not system_prompt:
            raise HTTPException(400, f"Agente '{req.agent}' inválido")
        selected_agents = [req.agent]

    is_insurance = is_insurance_query(selected_agents)
    chunks, _ = await _fetch_rag_context(req, user, db, is_insurance)
    rag_context = format_rag_context(chunks)
    sources = _deduplicate_sources(chunks)

    meta_event = json.dumps(
        {"type": "meta", "sources": sources, "orchestration": orchestration},
        ensure_ascii=False,
    )

    # Multi-agent debate cannot be streamed token-by-token; emit as single chunk.
    if len(selected_agents) > 1:
        agent_configs = [
            AgentConfig(
                name=a,
                system_prompt=AGENTS[a],
                module=get_model_module(a),
                output_json=a in JSON_OUTPUT_AGENTS,
            )
            for a in selected_agents
        ]
        result = await debate(
            agents=agent_configs,
            query=f"{rag_context}\n\n[CONSULTA]\n{req.document_text or req.query}",
            rag_context="",
            chat_history=req.chat_history,
        )
        full_text = result if isinstance(result, str) else result.get("synthesis", str(result))

        async def _debate_stream():
            yield f"data: {meta_event}\n\n"
            yield f"data: {json.dumps({'type': 'text', 'text': full_text}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

        await log_event(db, user.uid, "law", "query_stream", metadata={"agent": "+".join(selected_agents), "sources": len(chunks)})
        return StreamingResponse(_debate_stream(), media_type="text/event-stream")

    # Single-agent streaming
    single_agent = selected_agents[0]
    system_prompt = AGENTS[single_agent]
    module = get_model_module(single_agent)
    prompt = (
        f"{rag_context}\n\n"
        f"[CONSULTA/CONTRATO]\n{req.document_text or req.query}\n\n"
        "Execute a análise conforme suas instruções."
    )

    async def _stream():
        yield f"data: {meta_event}\n\n"
        async for chunk in generate_stream(
            module=module,
            prompt=prompt,
            system_instruction=system_prompt,
            chat_history=req.chat_history,
        ):
            yield f"data: {json.dumps({'type': 'text', 'text': chunk}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    await log_event(db, user.uid, "law", "query_stream", metadata={"agent": single_agent, "sources": len(chunks)})
    return StreamingResponse(_stream(), media_type="text/event-stream")


# ── Legal Document Listing ──

@router.get("/documents")
async def list_documents(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List legal documents in the knowledge base."""
    result = await db.execute(
        select(LegalDocument)
        .where(LegalDocument.user_id == user.uid, LegalDocument.is_active == True)
        .order_by(LegalDocument.created_at.desc())
    )
    docs = result.scalars().all()
    return [{
        "id": str(d.id), "filename": d.filename, "title": d.title,
        "type": d.doc_type, "chunks": d.chunk_count,
        "area_direito": d.area_direito, "tema": d.tema, "resumo_ia": d.resumo_ia,
    } for d in docs]


@router.get("/alerts")
async def list_alerts(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List regulatory alerts."""
    result = await db.execute(
        select(RegulatoryAlert)
        .where(RegulatoryAlert.user_id == user.uid)
        .order_by(RegulatoryAlert.created_at.desc())
        .limit(50)
    )
    alerts = result.scalars().all()
    return [{"id": str(a.id), "title": a.title, "source": a.source,
             "severity": a.severity, "is_read": a.is_read} for a in alerts]


# ── Presentation ──

class PresentationRequest(BaseModel):
    document_ids: list[str]
    title: str | None = None
    theme: str = "professional"


@router.post("/presentation")
async def generate_doc_presentation(
    req: PresentationRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a PowerPoint presentation from selected documents."""
    from app.services.presentation import generate_presentation

    if not req.document_ids:
        raise HTTPException(400, "Nenhum documento selecionado")
    if len(req.document_ids) > 10:
        raise HTTPException(400, "Máximo 10 documentos por apresentação")

    # Collect content from selected documents
    contents = []
    for doc_id in req.document_ids:
        chunks_res = await db.execute(
            select(LegalChunk.content)
            .where(LegalChunk.document_id == doc_id)
            .order_by(LegalChunk.chunk_index)
        )
        doc_content = "\n".join(r[0] for r in chunks_res)
        if doc_content:
            contents.append(doc_content)

    if not contents:
        raise HTTPException(404, "Nenhum conteúdo encontrado nos documentos selecionados")

    full_content = "\n\n---\n\n".join(contents)
    pptx_bytes = await generate_presentation(
        content=full_content,
        theme=req.theme,
        custom_title=req.title,
    )

    return StreamingResponse(
        io.BytesIO(pptx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": "attachment; filename=apresentacao_gabi.pptx"},
    )



# ── Private helpers ──

async def _fetch_rag_context(
    req: AgentRequest, user: CurrentUser, db: AsyncSession, is_insurance: bool
) -> tuple[list[dict], bool]:
    """Fetch RAG context based on query type (legal vs insurance)."""
    if is_insurance and req.tenant_id:
        intent = await should_retrieve(req.query, req.chat_history)
        if not intent["needs_rag"]:
            return [], False
        query_embedding = embed(intent["refined_query"])
        params = {"emb": str(query_embedding), "tid": req.tenant_id}
        client_filter = ""
        if req.client_id:
            client_filter = "AND (d.client_id = :cid OR d.client_id IS NULL)"
            params["cid"] = req.client_id

        rag_results = await db.execute(
            text(f"""
                SELECT c.content, c.section_ref, d.title, d.doc_type
                FROM ic_chunks c
                JOIN ic_documents d ON c.document_id = d.id
                WHERE (d.tenant_id = :tid OR d.is_shared = true) AND d.is_active = true
                  AND c.embedding IS NOT NULL {client_filter}
                ORDER BY c.embedding <=> :emb::vector
                LIMIT 8
            """),
            params,
        )
        return [dict(row._mapping) for row in rag_results], True
    else:
        return await retrieve_if_needed(
            question=req.query,
            chat_history=req.chat_history,
            db=db,
            module="law",
            user_id=user.uid,
            limit=8,
        )


def _deduplicate_sources(chunks: list[dict]) -> list[dict]:
    """Deduplicate RAG sources by title."""
    seen_titles: set[str] = set()
    sources = []
    for c in chunks:
        title = c.get("title", "")
        if title and title not in seen_titles:
            seen_titles.add(title)
            sources.append({"title": title, "type": c.get("doc_type", "")})
    return sources


async def _fetch_claims_context(tenant_id: str, client_id: str, db: AsyncSession) -> str:
    """Fetch sinistralidade data for claims_analyst context."""
    claims_res = await db.execute(
        select(ClaimsData)
        .where(ClaimsData.tenant_id == tenant_id, ClaimsData.client_id == client_id)
        .order_by(ClaimsData.period.desc())
        .limit(24)
    )
    claims = claims_res.scalars().all()
    if not claims:
        return ""
    lines = ["\n=== DADOS DE SINISTRALIDADE ==="]
    for c in claims:
        lines.append(
            f"{c.period} | {c.category or 'Total'} | Sinistros: R${c.claims_value:,.2f} | "
            f"Prêmio: R${c.premium_value:,.2f} | Loss Ratio: {c.loss_ratio or 0:.1f}%"
        )
    return "\n".join(lines)
