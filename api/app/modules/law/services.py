import json
from typing import Any
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import StreamingResponse
from google.api_core.exceptions import GoogleAPIError

from app.core.ai import generate, generate_json, generate_stream
from app.core.embeddings import embed
from app.core.dynamic_rag import retrieve_if_needed, should_retrieve, format_rag_context
from app.core.memory import summarize, should_summarize
from app.core.multi_agent import debate, AgentConfig
from app.core.analytics import log_event
from app.core.auth import CurrentUser
from app.models.insightcare import ClaimsData
from app.models.law import LegalDocument, LegalChunk

from .schemas import AgentRequest
from .agents import (
    AGENTS, classify_query, is_insurance_query,
    get_model_module, JSON_OUTPUT_AGENTS,
)


def deduplicate_sources(chunks: list[dict]) -> list[dict]:
    """Deduplicate RAG sources by title."""
    seen_titles: set[str] = set()
    sources = []
    for c in chunks:
        title = c.get("title", "")
        if title and title not in seen_titles:
            seen_titles.add(title)
            sources.append({"title": title, "type": c.get("doc_type", "")})
    return sources


async def fetch_claims_context(tenant_id: str, client_id: str, db: AsyncSession) -> str:
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


async def fetch_rag_context(
    req: AgentRequest, user_uid: str, db: AsyncSession, is_insurance: bool
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
            user_id=user_uid,
            limit=8,
        )


async def process_law_agent_invocation(req: AgentRequest, user: CurrentUser, db: AsyncSession) -> dict[str, Any]:
    """Handles agent logic, dynamic RAG, routing, and single/multi-agent generation."""
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
    chunks, did_retrieve = await fetch_rag_context(req, user.uid, db, is_insurance)
    rag_context = format_rag_context(chunks)
    sources = deduplicate_sources(chunks)

    claims_context = ""
    if "claims_analyst" in selected_agents and req.client_id and req.tenant_id:
        claims_context = await fetch_claims_context(req.tenant_id, req.client_id, db)

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
            content = await generate(module=module, prompt=prompt, system_instruction=system_prompt, chat_history=req.chat_history)
            result = {"text": content} if isinstance(content, str) else content

    new_summary = None
    if req.chat_history and should_summarize(len(req.chat_history)):
        try:
            new_summary = await summarize(req.chat_history)
        except GoogleAPIError:
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

async def process_law_agent_stream(req: AgentRequest, user: CurrentUser, db: AsyncSession) -> StreamingResponse:
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
    chunks, _ = await fetch_rag_context(req, user.uid, db, is_insurance)
    rag_context = format_rag_context(chunks)
    sources = deduplicate_sources(chunks)

    meta_event = json.dumps(
        {"type": "meta", "sources": sources, "orchestration": orchestration},
        ensure_ascii=False,
    )

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

    single_agent = selected_agents[0]
    system_prompt = AGENTS[single_agent]
    module = get_model_module(single_agent)
    prompt = f"{rag_context}\n\n[CONSULTA/CONTRATO]\n{req.document_text or req.query}\n\nExecute a análise conforme suas instruções."

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
