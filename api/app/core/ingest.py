"""
Gabi Hub — Document Ingestion Pipeline (Shared)
Supports: PDF (PyMuPDF), DOCX (python-docx), TXT, XLSX (openpyxl/pandas)
"""

import io
import logging
import uuid
from typing import Any

from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embeddings import embed_batch, get_embedding_model_name
from app.core.telemetry import trace_span

logger = logging.getLogger("gabi.ingest")

# Maximum upload file size: 50 MB
MAX_FILE_SIZE = 50 * 1024 * 1024


# ── Text Extraction ──

def extract_text_from_pdf(data: bytes) -> str:
    """Extract text from PDF using PyMuPDF."""
    import pymupdf

    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
        pages = []
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                pages.append(text.strip())
        doc.close()
        return "\n\n".join(pages)
    except Exception as e:
        logger.error("Error extracting PDF: %s", e, exc_info=True)
        return ""


def extract_text_from_docx(data: bytes) -> str:
    """Extract text from DOCX using python-docx."""
    from docx import Document

    doc = Document(io.BytesIO(data))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def extract_text(data: bytes, filename: str) -> str:
    """Auto-detect file type and extract text.
    
    Supported: .pdf, .docx, .txt, .md, .csv
    Unsupported with explicit error: .xlsx (requires structured handling)
    Unknown types: decoded as text with warning logged.
    """
    with trace_span("document.extract_text", {"filename": filename, "size": len(data)}) as span:
        lower = filename.lower()

        if lower.endswith(".pdf"):
            text = extract_text_from_pdf(data)
        elif lower.endswith(".docx"):
            text = extract_text_from_docx(data)
        elif lower.endswith((".txt", ".md", ".csv")):
            text = data.decode("utf-8", errors="replace")
        elif lower.endswith(".xlsx"):
            raise ValueError(
                f"Formato XLSX não suportado para ingestão genérica: {filename}. "
                "Use o endpoint específico de importação de planilhas."
            )
        else:
            # Fallback: try as text but warn — likely produces low-quality content
            logger.warning(
                "Unsupported file type for '%s', attempting text decode. "
                "Quality of indexed content may be degraded.", filename
            )
            text = data.decode("utf-8", errors="replace")
            
        if span:
            span.set_attribute("char_count", len(text))
            
        return text


# ── Chunking ──

def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200,
) -> list[str]:
    """Split text into overlapping chunks by character count."""
    if not text or not text.strip():
        return []

    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = start + chunk_size

        # Try to break at a paragraph or sentence boundary
        if end < text_len:
            # Look for paragraph break
            para_break = text.rfind("\n\n", start + chunk_size // 2, end + 100)
            if para_break > start:
                end = para_break + 2
            else:
                # Look for sentence break
                for sep in (". ", ".\n", "! ", "? "):
                    sent_break = text.rfind(sep, start + chunk_size // 2, end + 50)
                    if sent_break > start:
                        end = sent_break + len(sep)
                        break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        start = end - overlap if end < text_len else text_len

    return chunks


# ── Full Pipeline ──

async def process_document(
    file: UploadFile,
    db: AsyncSession,
    doc_model: type,
    chunk_model: type,
    doc_fields: dict[str, Any],
    chunk_size: int = 1000,
    overlap: int = 200,
    embedding_field: str = "embedding",
) -> dict:
    """
    Full document ingestion pipeline:
    1. Read file bytes
    2. Extract text
    3. Chunk with overlap
    4. Generate embeddings in batch
    5. Save document + chunks to DB

    Returns summary dict with doc_id, chunk_count, char_count.
    """
    # ── Enforce file size limit ──
    data = await file.read()
    filename = file.filename or "unknown"
    file_size = len(data)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo excede o limite de {MAX_FILE_SIZE // (1024 * 1024)}MB.",
        )

    # Extract text
    try:
        text = extract_text(data, filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if not text.strip():
        return {"error": "Não foi possível extrair texto do arquivo.", "chunk_count": 0}

    # Chunk
    chunks = chunk_text(text, chunk_size, overlap)
    if not chunks:
        return {"error": "Arquivo vazio após extração.", "chunk_count": 0}

    # Generate embeddings in batch (run in thread to avoid blocking event loop)
    import asyncio
    embeddings = await asyncio.to_thread(embed_batch, chunks)

    # Create document record
    doc_id = uuid.uuid4()
    doc_record = doc_model(
        id=doc_id,
        filename=filename,
        file_size=file_size,
        chunk_count=len(chunks),
        **doc_fields,
    )
    db.add(doc_record)

    # Create chunk records
    for i, (content, emb) in enumerate(zip(chunks, embeddings)):
        chunk_kwargs = {
            "id": uuid.uuid4(),
            "document_id": doc_id,
            "content": content,
            "chunk_index": i,
            embedding_field: emb,
            "embedding_model": get_embedding_model_name(),
        }
        db.add(chunk_model(**chunk_kwargs))

    await db.commit()

    return {
        "document_id": str(doc_id),
        "filename": filename,
        "chunk_count": len(chunks),
        "char_count": len(text),
        "file_size": file_size,
    }


# ── XLSX Processing ──

def parse_claims_xlsx(data: bytes) -> list[dict]:
    """
    Parse insurance claims XLSX into structured rows.
    Expected columns: period, category, claims_count, claims_value, premium_value
    """
    import pandas as pd

    df = pd.read_excel(io.BytesIO(data), engine="openpyxl")

    # Normalize column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Map common PT-BR column names
    col_map = {
        "periodo": "period", "período": "period",
        "categoria": "category",
        "sinistros_qtd": "claims_count", "qtd_sinistros": "claims_count",
        "sinistros_valor": "claims_value", "valor_sinistros": "claims_value",
        "premio": "premium_value", "prêmio": "premium_value",
        "premio_valor": "premium_value",
    }
    df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

    rows = []
    for _, row in df.iterrows():
        claims_val = float(row.get("claims_value", 0) or 0)
        premium_val = float(row.get("premium_value", 0) or 0)
        loss_ratio = (claims_val / premium_val * 100) if premium_val > 0 else None

        rows.append({
            "period": str(row.get("period", "")),
            "category": str(row.get("category", "")) if row.get("category") else None,
            "claims_count": int(row.get("claims_count", 0) or 0),
            "claims_value": claims_val,
            "premium_value": premium_val,
            "loss_ratio": loss_ratio,
        })

    return rows
