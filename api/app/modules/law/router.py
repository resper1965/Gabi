"""
Law & Comply Module — Unified Router
Delegates to sub-modules: agents, insights, insurance.
Core endpoints: upload, agent invocation, documents, alerts.
"""

import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.core.auth import CurrentUser, get_current_user
from app.models.law import LegalDocument, LegalChunk, RegulatoryAlert

from .schemas import AgentRequest, LegalDocType, PresentationRequest
from .services import process_law_agent_invocation, process_law_agent_stream
from app.modules.law.insights import router as insights_router
from app.modules.law.insurance import router as insurance_router

router = APIRouter()

# Include sub-routers (same prefix, endpoints merge seamlessly)
router.include_router(insights_router)
router.include_router(insurance_router)


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
        except SQLAlchemyError as e:
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
        except HTTPException as e:
            results.append({"filename": file.filename, "status": "error", "error": e.detail})

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
    from app.core.rate_limit import check_rate_limit
    check_rate_limit(user.uid)
    return await process_law_agent_invocation(req, user, db)


@router.post("/agent-stream")
async def invoke_agent_stream(
    req: AgentRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.core.rate_limit import check_rate_limit
    check_rate_limit(user.uid)
    return await process_law_agent_stream(req, user, db)


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
