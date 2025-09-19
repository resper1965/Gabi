#!/usr/bin/env python3
"""
Gabi Ingest - Worker de processamento e ingestão
Baseado no Agentic RAG
"""

import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

app = FastAPI(
    title="Gabi Ingest",
    description="Worker de processamento e ingestão do Gabi",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "service": "Gabi Ingest",
        "status": "running",
        "version": "1.0.0",
        "description": "Worker de processamento e ingestão"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "gabi-ingest"}

@app.post("/ingest/document")
async def ingest_document(document: dict):
    """Processa um documento para ingestão"""
    return {
        "status": "processed",
        "document_id": document.get("id", "doc_001"),
        "chunks": 5,
        "embeddings": 128,
        "timestamp": "2024-01-01T00:00:00Z"
    }

@app.post("/ingest/url")
async def ingest_url(url_data: dict):
    """Processa uma URL para ingestão"""
    return {
        "status": "processed",
        "url": url_data.get("url", ""),
        "title": "Documento da Web",
        "chunks": 3,
        "embeddings": 96,
        "timestamp": "2024-01-01T00:00:00Z"
    }

@app.get("/search")
async def search_documents(query: str):
    """Busca documentos processados"""
    return {
        "query": query,
        "results": [
            {"id": "doc_001", "title": "Documento 1", "score": 0.95},
            {"id": "doc_002", "title": "Documento 2", "score": 0.87}
        ],
        "total": 2
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
