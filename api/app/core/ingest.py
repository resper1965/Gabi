"""
Gabi Hub — Document Ingestion Pipeline (Shared)
Supports: PDF (PyMuPDF), DOCX (python-docx), TXT, XLSX (openpyxl/pandas)
"""

import io
import uuid
from typing import Any

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embeddings import embed_batch


# ── Text Extraction ──

def extract_text_from_pdf(data: bytes) -> str:
    """Extract text from PDF using PyMuPDF."""
    import pymupdf

    doc = pymupdf.open(stream=data, filetype="pdf")
    pages = []
    for page in doc:
        text = page.get_text("text")
        if text.strip():
            pages.append(text.strip())
    doc.close()
    return "\n\n".join(pages)


def extract_text_from_docx(data: bytes) -> str:
    """Extract text from DOCX using python-docx."""
    from docx import Document

    doc = Document(io.BytesIO(data))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def extract_text(data: bytes, filename: str) -> str:
    """Auto-detect file type and extract text."""
    lower = filename.lower()

    if lower.endswith(".pdf"):
        return extract_text_from_pdf(data)
    elif lower.endswith(".docx"):
        return extract_text_from_docx(data)
    elif lower.endswith((".txt", ".md", ".csv")):
        return data.decode("utf-8", errors="replace")
    else:
        # Fallback: try as text
        return data.decode("utf-8", errors="replace")


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
    data = await file.read()
    filename = file.filename or "unknown"
    file_size = len(data)

    # Extract text
    text = extract_text(data, filename)
    if not text.strip():
        return {"error": "Não foi possível extrair texto do arquivo.", "chunk_count": 0}

    # Chunk
    chunks = chunk_text(text, chunk_size, overlap)
    if not chunks:
        return {"error": "Arquivo vazio após extração.", "chunk_count": 0}

    # Generate embeddings in batch
    embeddings = embed_batch(chunks)

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
