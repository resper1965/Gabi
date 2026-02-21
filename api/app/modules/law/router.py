"""
Law & Comply Module — 4 AI Agents for Legal Intelligence
Researcher, Drafter, Watcher, Auditor
"""

from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.auth import CurrentUser, get_current_user
from app.core.ai import generate, generate_json
from app.core.embeddings import embed
from app.core.rate_limit import check_rate_limit
from app.core.dynamic_rag import retrieve_if_needed, format_rag_context
from app.core.multi_agent import debate, AgentConfig
from app.models.law import LegalDocument, LegalChunk, RegulatoryAlert

router = APIRouter()


@router.post("/upload")
async def upload_document(
    doc_type: str = "law",
    title: str | None = None,
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a legal document for RAG indexing.
    doc_type: law, regulation, contract, policy, precedent, petition, opinion, gold_piece
    """
    valid_types = ("law", "regulation", "contract", "policy", "precedent", "petition", "opinion", "gold_piece")
    if doc_type not in valid_types:
        return {"error": f"doc_type deve ser: {', '.join(valid_types)}"}

    from app.core.ingest import process_document

    result = await process_document(
        file=file,
        db=db,
        doc_model=LegalDocument,
        chunk_model=LegalChunk,
        doc_fields={
            "user_id": user.uid,
            "doc_type": doc_type,
            "title": title or file.filename,
        },
    )

    return result


# ── Agent System Prompts ──

AGENTS = {
    "auditor": """
[PERSONA] Você é a Gabi, Auditora Regulatória Sênior da plataforma Law & Comply.
[AÇÃO] Analise o contrato e cruze com a base regulatória. Identifique violações.
[RESTRIÇÕES] Zero Alucinação. Se não estiver na base: "Não há informações suficientes
na base regulatória fornecida para validar esta cláusula."
[FORMATO] JSON: {{"clausulas": [{{"clausula": "...", "status": "Conforme|Não Conforme|Risco Moderado",
"fundamentacao": "...", "recomendacao": "..."}}]}}
""",
    "researcher": """
[PERSONA] Você é a Gabi, Pesquisadora Jurídica Sênior da plataforma Law & Comply.
[AÇÃO] Pesquise a base jurídica e retorne precedentes FAVORÁVEIS e DESFAVORÁVEIS.
[RESTRIÇÕES] Zero Alucinação. Cite APENAS o que existe na base fornecida.
[FORMATO] JSON: {{"tema": "...", "favoraveis": [...], "desfavoraveis": [...],
"resumo": "...", "confianca": "Alta|Média|Baixa"}}
""",
    "drafter": """
[PERSONA] Você é a Gabi, Redatora Jurídica Sênior da plataforma Law & Comply.
[AÇÃO] Redija a peça jurídica seguindo as Peças de Ouro como padrão institucional.
[RESTRIÇÕES] Fundamentação deve existir na base. Se pendente: "[⚠️ Verificar]".
Human-in-the-Loop obrigatório.
""",
    "watcher": """
[PERSONA] Você é a Gabi, Sentinela Regulatória da plataforma Law & Comply.
[AÇÃO] Analise a publicação regulatória e determine impacto nos contratos.
[RESTRIÇÕES]
1. Zero Alucinação — classifique impacto APENAS com base nos contratos da base.
2. Se não houver contratos na base para cruzar: "Impacto não avaliável — nenhum contrato correspondente na base."
3. CRITICAL = APENAS com conflito direto demonstrável e citável.
[FORMATO] JSON: {{"orgao": "...", "tipo": "...", "resumo": "...",
"severidade": "info|warning|critical", "contratos_afetados": [...]}}
""",
}


class AgentRequest(BaseModel):
    agent: str  # auditor, researcher, drafter, watcher
    query: str
    document_text: str | None = None  # For auditor: contract text
    chat_history: list[dict] | None = None


# ── Routes ──

@router.post("/agent")
async def invoke_agent(
    req: AgentRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invoke a specialized legal agent with dynamic RAG + multi-agent debate."""
    check_rate_limit(user.uid)

    system_prompt = AGENTS.get(req.agent)
    if not system_prompt:
        return {"error": f"Agente '{req.agent}' não encontrado. Use: auditor, researcher, drafter, watcher"}

    # Dynamic RAG: let the AI decide if knowledge base search is needed
    chunks, did_retrieve = await retrieve_if_needed(
        question=req.query,
        chat_history=req.chat_history,
        db=db,
        chunks_table="law_chunks",
        docs_table="law_documents",
        doc_type_col="doc_type",
        limit=8,
    )
    rag_context = format_rag_context(chunks)

    # Deduplicate sources by title for frontend display
    seen_titles = set()
    sources = []
    for c in chunks:
        title = c.get("title", "")
        if title and title not in seen_titles:
            seen_titles.add(title)
            sources.append({"title": title, "type": c.get("doc_type", "")})

    # Multi-agent debate for auditor: run auditor + researcher in parallel
    if req.agent == "auditor":
        result = await debate(
            agents=[
                AgentConfig(name="auditor", system_prompt=AGENTS["auditor"], module="law", output_json=True),
                AgentConfig(name="researcher", system_prompt=AGENTS["researcher"], module="law", output_json=True),
            ],
            query=req.document_text or req.query,
            rag_context=rag_context,
            chat_history=req.chat_history,
        )
        return {"agent": "auditor+researcher", "result": result, "sources_used": len(chunks), "sources": sources, "dynamic_rag": did_retrieve}

    # Single-agent for other types
    prompt = f"""
{rag_context}

[CONSULTA/CONTRATO]
{req.document_text or req.query}

Execute a análise conforme suas instruções.
"""

    if req.agent in ("researcher",):
        result = await generate_json(module="law", prompt=prompt, system_instruction=system_prompt)
    else:
        result = {"text": await generate(module="law", prompt=prompt,
                                          system_instruction=system_prompt, chat_history=req.chat_history)}

    return {"agent": req.agent, "result": result, "sources_used": len(chunks), "sources": sources, "dynamic_rag": did_retrieve}


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
    return [{"id": str(d.id), "filename": d.filename, "title": d.title,
             "type": d.doc_type, "chunks": d.chunk_count} for d in docs]


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
