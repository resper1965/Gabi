"""
Law & Comply — Insurance CRUD Endpoints
Absorbed from the former gabi.care module.
"""

from typing import Literal

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.auth import CurrentUser, get_current_user
from app.models.insightcare import (
    InsuranceClient, Policy, ClaimsData,
    InsuranceDocument, InsuranceChunk,
)

router = APIRouter()

# Valid insurance document types
InsuranceDocType = Literal["policy", "report", "regulation", "ans_norm", "coverage_table", "contract"]


@router.post("/insurance/upload")
async def upload_insurance_document(
    tenant_id: str,
    doc_type: InsuranceDocType = "policy",
    client_id: str | None = None,
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload an insurance document or spreadsheet.
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


@router.get("/insurance/documents/{tenant_id}")
async def list_insurance_documents(
    tenant_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List uploaded insurance documents."""
    result = await db.execute(
        select(InsuranceDocument)
        .where(InsuranceDocument.tenant_id == tenant_id, InsuranceDocument.is_active == True)
        .order_by(InsuranceDocument.created_at.desc())
    )
    docs = result.scalars().all()
    return [{"id": str(d.id), "filename": d.filename, "title": d.title,
             "type": d.doc_type, "chunks": d.chunk_count} for d in docs]
