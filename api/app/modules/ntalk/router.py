"""
nTalkSQL Module — CFO Imobiliária
SQL generation + secure execution on tenant MS SQL.
Routes only — business logic in service.py, schemas in schemas.py.
"""

import asyncio

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.auth import CurrentUser, require_module
from app.core.embeddings import embed
from app.models.ntalk import BusinessDictionary, GoldenQuery, TenantConnection

from .schemas import ChatRequest, ConnectionRequest
from .service import (
    validate_tenant_access, execute_mssql, run_ask_pipeline, run_ask_stream,
)

ModuleUser = Depends(require_module("ntalk"))

router = APIRouter()


@router.post("/connections")
async def register_connection(
    req: ConnectionRequest,
    user: CurrentUser = ModuleUser,
    db: AsyncSession = Depends(get_db),
):
    """Register a new MS SQL connection for a tenant."""
    validate_tenant_access(req.tenant_id, user)
    existing = await db.execute(
        select(TenantConnection).where(TenantConnection.tenant_id == req.tenant_id)
    )
    if existing.scalar_one_or_none():
        return {"error": f"Conexão já existe para tenant '{req.tenant_id}'. Delete primeiro."}

    conn = TenantConnection(
        tenant_id=req.tenant_id, name=req.name, host=req.host,
        port=req.port, db_name=req.db_name, username=req.username,
        secret_manager_ref=req.secret_manager_ref,
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return {"id": str(conn.id), "tenant_id": conn.tenant_id, "status": "connected"}


@router.post("/connections/{tenant_id}/schema-sync")
async def sync_schema(
    tenant_id: str,
    user: CurrentUser = ModuleUser,
    db: AsyncSession = Depends(get_db),
):
    """Read INFORMATION_SCHEMA from tenant MS SQL and populate Business Dictionary."""
    validate_tenant_access(tenant_id, user)
    conn_res = await db.execute(
        select(TenantConnection).where(
            TenantConnection.tenant_id == tenant_id, TenantConnection.is_active == True
        )
    )
    conn = conn_res.scalar_one_or_none()
    if not conn:
        from fastapi import HTTPException
        raise HTTPException(404, "Conexão não encontrada")

    try:
        schema_raw = await asyncio.to_thread(
            execute_mssql, conn.host, conn.port, conn.db_name, conn.username,
            conn.secret_manager_ref,
            "SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE "
            "FROM INFORMATION_SCHEMA.COLUMNS ORDER BY TABLE_SCHEMA, TABLE_NAME",
        )
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(502, f"Erro ao ler schema: {e}")

    tables: dict[str, list[str]] = {}
    for r in schema_raw["rows"]:
        key = f"{r['TABLE_SCHEMA']}.{r['TABLE_NAME']}"
        tables.setdefault(key, []).append(f"{r['COLUMN_NAME']} ({r['DATA_TYPE']})")

    terms_created = 0
    for table_name, columns in tables.items():
        definition = f"Tabela {table_name} com colunas: {', '.join(columns)}"
        entry = BusinessDictionary(
            tenant_id=tenant_id, term=table_name, definition=definition,
            category="schema",
            embedding=await asyncio.to_thread(embed, f"{table_name}: {definition}"),
        )
        db.add(entry)
        terms_created += 1

    from datetime import datetime, timezone
    conn.last_connected_at = datetime.now(timezone.utc)
    await db.commit()
    return {"tenant_id": tenant_id, "tables_synced": len(tables), "terms_created": terms_created}


@router.post("/ask")
async def ask_gabi(
    req: ChatRequest,
    user: CurrentUser = ModuleUser,
    db: AsyncSession = Depends(get_db),
):
    """Full nTalkSQL flow: RAG → SQL gen → execute → interpret → audit."""
    validate_tenant_access(req.tenant_id, user)
    return await run_ask_pipeline(
        req.tenant_id, req.question, user, db, req.chat_history,
    )


@router.post("/ask-stream")
async def ask_gabi_stream(
    req: ChatRequest,
    user: CurrentUser = ModuleUser,
    db: AsyncSession = Depends(get_db),
):
    """Streaming variant of /ask."""
    validate_tenant_access(req.tenant_id, user)
    stream_gen = await run_ask_stream(
        req.tenant_id, req.question, user, db, req.chat_history,
    )
    return StreamingResponse(stream_gen(), media_type="text/event-stream")


@router.post("/dictionary")
async def add_term(
    tenant_id: str, term: str, definition: str,
    sql_logic: str | None = None, category: str | None = None,
    user: CurrentUser = ModuleUser,
    db: AsyncSession = Depends(get_db),
):
    validate_tenant_access(tenant_id, user)
    entry = BusinessDictionary(
        tenant_id=tenant_id, term=term, definition=definition,
        sql_logic_snippet=sql_logic, category=category,
        embedding=await asyncio.to_thread(embed, f"{term}: {definition}"),
    )
    db.add(entry)
    await db.commit()
    return {"id": str(entry.id)}


@router.post("/golden-queries")
async def add_golden(
    tenant_id: str, intent: str, sql: str,
    approved_by: str | None = None,
    user: CurrentUser = ModuleUser,
    db: AsyncSession = Depends(get_db),
):
    validate_tenant_access(tenant_id, user)
    gq = GoldenQuery(
        tenant_id=tenant_id, user_intent=intent, approved_sql=sql,
        approved_by=approved_by, embedding=await asyncio.to_thread(embed, intent),
    )
    db.add(gq)
    await db.commit()
    return {"id": str(gq.id)}
