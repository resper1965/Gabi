"""
InsightCare Module — Inteligência em Seguros e Saúde
3 Agents: Policy Analyst, Claims Analyst, Regulatory Consultant
"""

import json

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.auth import CurrentUser, get_current_user
from app.core.ai import generate, generate_json
from app.core.embeddings import embed
from app.core.memory import summarize, should_summarize
from app.models.insightcare import (
    InsuranceClient, Policy, ClaimsData,
    InsuranceDocument, InsuranceChunk,
)

router = APIRouter()

# ── Agent Prompts ──

AGENTS = {
    "policy_analyst": """
[PERSONA] Você é a Gabi, Analista de Apólices Sênior especializada no mercado
de seguros de saúde, vida e odontológico brasileiro.

[AÇÃO] Analise apólices, compare coberturas, identifique gaps e sugira
negociações. Sempre cite a cláusula ou página do contrato.

[RESTRIÇÕES]
1. Zero Alucinação — cite APENAS dados da base fornecida.
2. Se um dado não está na base: "Informação não encontrada nos documentos disponíveis."
3. Valores em R$. Percentuais com 2 casas decimais.

[FORMATO] Estruture em seções: Análise, Gaps Identificados, Recomendações.
""",

    "claims_analyst": """
[PERSONA] Você é a Gabi, Analista de Sinistralidade e Atuária especializada
em seguros saúde corporativos.

[AÇÃO] Analise dados de sinistralidade, identifique tendências, categorias
de maior custo, e sugira ações para redução do Loss Ratio.

[RESTRIÇÕES]
1. Base suas análises ESTRITAMENTE nos dados numéricos fornecidos.
2. Calcule KPIs: Loss Ratio, PMPM, frequência de utilização, ticket médio.
3. Valores em R$. Use comparações período-a-período.

[FORMATO] JSON quando possível:
{{"kpis": {...}, "tendencias": [...], "alertas": [...], "recomendacoes": [...]}}
""",

    "regulatory_consultant": """
[PERSONA] Você é a Gabi, Consultora Regulatória especializada em normas
da ANS (Agência Nacional de Saúde Suplementar) e SUSEP.

[AÇÃO] Responda dúvidas regulatórias baseada ESTRITAMENTE na base de normas
fornecida. Cite número da resolução, artigo e parágrafo.

[RESTRIÇÕES]
1. Zero Alucinação — cite APENAS normas da base.
2. Se a norma não está na base: "Esta norma não consta na base regulatória carregada."
3. Diferencie normas vigentes de revogadas quando possível.

[FORMATO] Resposta com citação: "Conforme RN nº XXX/ANS, Art. Y, §Z: ..."
""",
}


class ChatRequest(BaseModel):
    tenant_id: str
    agent: str  # policy_analyst, claims_analyst, regulatory_consultant
    question: str
    client_id: str | None = None
    chat_history: list[dict] | None = None
    summary: str | None = None


# ── Routes ──


@router.post("/upload")
async def upload_document(
    tenant_id: str,
    doc_type: str = "policy",
    client_id: str | None = None,
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a document or spreadsheet.
    PDF/DOCX/TXT → InsuranceDocument + InsuranceChunk (RAG)
    XLSX → ClaimsData rows (sinistralidade)
    """
    filename = file.filename or "unknown"

    # XLSX → parse as claims data
    if filename.lower().endswith((".xlsx", ".xls")):
        from app.core.ingest import parse_claims_xlsx

        data = await file.read()
        rows = parse_claims_xlsx(data)

        claims_created = 0
        for row in rows:
            claim = ClaimsData(
                tenant_id=tenant_id,
                client_id=client_id,
                **row,
            )
            db.add(claim)
            claims_created += 1

        await db.commit()
        return {
            "type": "claims_data",
            "filename": filename,
            "rows_created": claims_created,
        }

    # PDF/DOCX/TXT → document pipeline
    valid_types = ("policy", "report", "regulation", "ans_norm", "coverage_table", "contract")
    if doc_type not in valid_types:
        return {"error": f"doc_type deve ser: {', '.join(valid_types)}"}

    from app.core.ingest import process_document

    result = await process_document(
        file=file,
        db=db,
        doc_model=InsuranceDocument,
        chunk_model=InsuranceChunk,
        doc_fields={
            "tenant_id": tenant_id,
            "client_id": client_id,
            "doc_type": doc_type,
            "title": filename,
        },
    )

    return result

@router.post("/chat")
async def chat(
    req: ChatRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """InsightCare chat — RAG with agent-specific prompts."""
    system_prompt = AGENTS.get(req.agent)
    if not system_prompt:
        return {"error": f"Agente '{req.agent}' não encontrado."}

    # RAG: search document chunks (tenant-segregated)
    query_embedding = embed(req.question)

    # Build filter: tenant + optional client
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
            WHERE d.tenant_id = :tid AND d.is_active = true
              AND c.embedding IS NOT NULL {client_filter}
            ORDER BY c.embedding <=> :emb::vector
            LIMIT 8
        """),
        params,
    )
    chunks = [dict(row._mapping) for row in rag_results]

    # For claims_analyst, also fetch numeric data
    claims_context = ""
    if req.agent == "claims_analyst" and req.client_id:
        claims_res = await db.execute(
            select(ClaimsData)
            .where(ClaimsData.tenant_id == req.tenant_id, ClaimsData.client_id == req.client_id)
            .order_by(ClaimsData.period.desc())
            .limit(24)  # Last 24 periods
        )
        claims = claims_res.scalars().all()
        if claims:
            claims_context = "\n=== DADOS DE SINISTRALIDADE ===\n"
            claims_context += "\n".join(
                f"{c.period} | {c.category or 'Total'} | Sinistros: R${c.claims_value:,.2f} | "
                f"Prêmio: R${c.premium_value:,.2f} | Loss Ratio: {c.loss_ratio or 0:.1f}%"
                for c in claims
            )

    # Build context
    rag_context = "\n".join(
        f"[{c['doc_type'].upper()}] {c.get('section_ref', '')} — {c['content'][:600]}"
        for c in chunks
    ) if chunks else "Nenhum documento encontrado na base."

    prompt = f"""
[BASE DE CONHECIMENTO]
{rag_context}
{claims_context}

[PERGUNTA]
{req.question}
"""

    # Use Flash for claims (numeric), Pro for regulatory (precision)
    module = "law" if req.agent == "regulatory_consultant" else "ntalk"

    if req.agent == "claims_analyst":
        result = await generate_json(module, prompt, system_prompt)
        content = result
    else:
        content = await generate(module, prompt, system_prompt, req.chat_history)

    # Memory summary
    new_summary = None
    if req.chat_history and should_summarize(len(req.chat_history)):
        try:
            new_summary = await summarize(req.chat_history)
        except Exception:
            pass

    return {
        "agent": req.agent,
        "response": content,
        "sources_used": len(chunks),
        "summary": new_summary,
    }


@router.get("/clients/{tenant_id}")
async def list_clients(
    tenant_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List insurance clients for a tenant (corretora)."""
    result = await db.execute(
        select(InsuranceClient)
        .where(InsuranceClient.tenant_id == tenant_id, InsuranceClient.is_active == True)
        .order_by(InsuranceClient.name)
    )
    clients = result.scalars().all()
    return [{"id": str(c.id), "name": c.name, "cnpj": c.cnpj,
             "segment": c.segment, "lives": c.lives_count} for c in clients]


@router.get("/policies/{tenant_id}")
async def list_policies(
    tenant_id: str,
    client_id: str | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List policies, optionally filtered by client."""
    query = select(Policy).where(Policy.tenant_id == tenant_id, Policy.is_active == True)
    if client_id:
        query = query.where(Policy.client_id == client_id)
    result = await db.execute(query.order_by(Policy.end_date.desc()))
    policies = result.scalars().all()
    return [{"id": str(p.id), "insurer": p.insurer, "product": p.product,
             "policy_number": p.policy_number, "premium": p.premium_monthly,
             "lives": p.lives_count} for p in policies]


@router.get("/documents/{tenant_id}")
async def list_documents(
    tenant_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List uploaded documents."""
    result = await db.execute(
        select(InsuranceDocument)
        .where(InsuranceDocument.tenant_id == tenant_id, InsuranceDocument.is_active == True)
        .order_by(InsuranceDocument.created_at.desc())
    )
    docs = result.scalars().all()
    return [{"id": str(d.id), "filename": d.filename, "title": d.title,
             "type": d.doc_type, "chunks": d.chunk_count} for d in docs]
