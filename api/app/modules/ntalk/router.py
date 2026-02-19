"""
nTalkSQL Module — CFO Imobiliária
SQL generation + secure execution on tenant MS SQL.
"""

import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.auth import CurrentUser, get_current_user
from app.core.ai import generate, generate_json
from app.core.embeddings import embed
from app.core.memory import summarize, should_summarize
from app.models.ntalk import BusinessDictionary, GoldenQuery, TenantConnection, AuditLog
from app.config import get_settings

settings = get_settings()

router = APIRouter()


# ── SQL Execution (Secure) ──

def _execute_mssql(host, port, database, username, secret_ref, query):
    """Read-only SQL execution with Secret Manager credentials."""
    import pymssql
    from google.cloud import secretmanager

    # Block destructive ops
    normalized = query.strip().upper()
    blocked = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "EXEC", "EXECUTE"]
    for kw in blocked:
        if normalized.startswith(kw):
            raise ValueError(f"Bloqueado: {kw}. Apenas SELECT permitido.")

    if "TOP" not in normalized and normalized.startswith("SELECT"):
        query = query.replace("SELECT", f"SELECT TOP {settings.max_query_rows}", 1)

    client = secretmanager.SecretManagerServiceClient()
    password = client.access_secret_version(name=secret_ref).payload.data.decode("utf-8")

    start = time.perf_counter()
    conn = pymssql.connect(server=host, port=port, user=username,
                           password=password, database=database,
                           timeout=settings.query_timeout_seconds, login_timeout=10)
    cursor = conn.cursor(as_dict=True)
    cursor.execute(query)
    rows = cursor.fetchall()
    columns = [d[0] for d in cursor.description] if cursor.description else []
    cursor.close()
    conn.close()

    return {"rows": rows, "columns": columns, "row_count": len(rows),
            "execution_time_ms": int((time.perf_counter() - start) * 1000)}


# ── System Prompt ──

CFO_SYSTEM_PROMPT = """
[PERSONA] Você é a Gabi, CFO Sênior do mercado imobiliário.
Expertise em NOI, Cap Rate, Yield, Vacância, Inadimplência, VGV, TIR.

[AÇÃO] Gere consulta SQL SELECT para MS SQL Server.
[RESTRIÇÕES] Apenas SELECT. TOP {max_rows}. Aliases em português. Valores em R$.
Use APENAS tabelas/colunas do SCHEMA.

[FORMATO] JSON: {{"interpretation": "...", "sql": "SELECT ...", "explanation": "..."}}
""".format(max_rows=settings.max_query_rows)


class ChatRequest(BaseModel):
    tenant_id: str
    question: str
    chat_history: list[dict] | None = None
    summary: str | None = None


# ── Routes ──


class ConnectionRequest(BaseModel):
    tenant_id: str
    name: str
    host: str
    port: int = 1433
    db_name: str
    username: str
    secret_manager_ref: str


@router.post("/connections")
async def register_connection(
    req: ConnectionRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a new MS SQL connection for a tenant."""
    # Check if connection already exists
    existing = await db.execute(
        select(TenantConnection).where(TenantConnection.tenant_id == req.tenant_id)
    )
    if existing.scalar_one_or_none():
        return {"error": f"Conexão já existe para tenant '{req.tenant_id}'. Delete primeiro."}

    conn = TenantConnection(
        tenant_id=req.tenant_id,
        name=req.name,
        host=req.host,
        port=req.port,
        db_name=req.db_name,
        username=req.username,
        secret_manager_ref=req.secret_manager_ref,
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)

    return {"id": str(conn.id), "tenant_id": conn.tenant_id, "status": "connected"}


@router.post("/connections/{tenant_id}/schema-sync")
async def sync_schema(
    tenant_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Read INFORMATION_SCHEMA from tenant's MS SQL and auto-populate
    the Business Dictionary with table/column definitions.
    """
    conn_res = await db.execute(
        select(TenantConnection).where(
            TenantConnection.tenant_id == tenant_id, TenantConnection.is_active == True
        )
    )
    conn = conn_res.scalar_one_or_none()
    if not conn:
        raise HTTPException(404, "Conexão não encontrada")

    # Read schema from MS SQL
    try:
        schema_raw = _execute_mssql(
            conn.host, conn.port, conn.db_name, conn.username,
            conn.secret_manager_ref,
            "SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE "
            "FROM INFORMATION_SCHEMA.COLUMNS ORDER BY TABLE_SCHEMA, TABLE_NAME"
        )
    except Exception as e:
        raise HTTPException(502, f"Erro ao ler schema: {e}")

    # Group columns by table
    tables: dict[str, list[str]] = {}
    for r in schema_raw["rows"]:
        key = f"{r['TABLE_SCHEMA']}.{r['TABLE_NAME']}"
        tables.setdefault(key, []).append(f"{r['COLUMN_NAME']} ({r['DATA_TYPE']})")

    # Create dictionary entries with embeddings
    terms_created = 0
    for table_name, columns in tables.items():
        definition = f"Tabela {table_name} com colunas: {', '.join(columns)}"
        entry = BusinessDictionary(
            tenant_id=tenant_id,
            term=table_name,
            definition=definition,
            category="schema",
            embedding=embed(f"{table_name}: {definition}"),
        )
        db.add(entry)
        terms_created += 1

    # Update last connected
    from datetime import datetime
    conn.last_connected_at = datetime.utcnow()
    await db.commit()

    return {
        "tenant_id": tenant_id,
        "tables_synced": len(tables),
        "terms_created": terms_created,
    }

@router.post("/ask")
async def ask_gabi(
    req: ChatRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Full nTalkSQL flow: RAG → SQL gen → execute → interpret → audit."""

    # Step 1: RAG — dictionary + golden queries
    emb = embed(req.question)

    dict_res = await db.execute(
        text("""SELECT term, definition, sql_logic_snippet
               FROM ntalk_business_dictionary
               WHERE tenant_id = :tid AND is_active = true AND embedding IS NOT NULL
               ORDER BY embedding <=> :emb::vector LIMIT 5"""),
        {"emb": str(emb), "tid": req.tenant_id},
    )
    dict_terms = [dict(r._mapping) for r in dict_res]

    golden_res = await db.execute(
        text("""SELECT user_intent, approved_sql
               FROM ntalk_golden_queries
               WHERE tenant_id = :tid AND is_active = true AND embedding IS NOT NULL
               ORDER BY embedding <=> :emb::vector LIMIT 3"""),
        {"emb": str(emb), "tid": req.tenant_id},
    )
    golden = [dict(r._mapping) for r in golden_res]

    # Step 2: Get connection
    conn_res = await db.execute(
        select(TenantConnection).where(
            TenantConnection.tenant_id == req.tenant_id, TenantConnection.is_active == True
        )
    )
    conn = conn_res.scalar_one_or_none()
    if not conn:
        raise HTTPException(404, "Conexão do tenant não configurada")

    # Step 3: Get schema
    try:
        schema_raw = _execute_mssql(conn.host, conn.port, conn.db_name, conn.username,
                                     conn.secret_manager_ref,
                                     "SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS ORDER BY TABLE_SCHEMA, TABLE_NAME")
    except Exception as e:
        raise HTTPException(502, f"Erro ao ler schema: {e}")

    # Build context
    tables = {}
    for r in schema_raw["rows"]:
        key = f"{r['TABLE_SCHEMA']}.{r['TABLE_NAME']}"
        tables.setdefault(key, []).append(f"{r['COLUMN_NAME']} ({r['DATA_TYPE']})")

    schema_str = "\n".join(f"[{k}]: {', '.join(v)}" for k, v in tables.items())
    dict_str = "\n".join(f"• {t['term']}: {t['definition']}" + (f" → SQL: {t['sql_logic_snippet']}" if t.get('sql_logic_snippet') else "") for t in dict_terms)
    golden_str = "\n".join(f"Pergunta: {g['user_intent']}\nSQL: {g['approved_sql']}\n" for g in golden)

    prompt = f"=== SCHEMA ===\n{schema_str}\n\n=== DICIONÁRIO ===\n{dict_str}\n\n=== EXEMPLOS ===\n{golden_str}\n\n=== PERGUNTA ===\n{req.question}"

    # Step 4: Generate SQL
    ai_result = await generate_json("ntalk", prompt, CFO_SYSTEM_PROMPT)
    generated_sql = ai_result.get("sql", "")

    # Step 5: Execute
    results = None
    status = "success"
    error_msg = None
    if generated_sql:
        try:
            results = _execute_mssql(conn.host, conn.port, conn.db_name, conn.username,
                                      conn.secret_manager_ref, generated_sql)
        except (ValueError, ConnectionError) as e:
            status = "error"
            error_msg = str(e)

    # Step 6: Interpret as CFO
    analysis = ""
    if results and results.get("rows"):
        import json
        preview = json.dumps(results["rows"][:20], default=str, ensure_ascii=False)
        analysis = await generate(
            "ntalk", f"Pergunta: {req.question}\nSQL: {generated_sql}\nDados:\n{preview}",
            system_instruction="Você é a Gabi, CFO imobiliária. Interprete os dados: KPIs, tendências, recomendações. Valores em R$."
        )
    elif error_msg:
        analysis = f"⚠️ {error_msg}"

    # Step 7: Audit
    log = AuditLog(tenant_id=req.tenant_id, user_id=user.uid, user_email=user.email,
                   question=req.question, generated_sql=generated_sql,
                   result_row_count=results["row_count"] if results else 0,
                   execution_time_ms=results.get("execution_time_ms", 0) if results else 0,
                   status=status, error_message=error_msg)
    db.add(log)
    await db.commit()

    # Step 8: Memory summary
    new_summary = None
    if req.chat_history and should_summarize(len(req.chat_history)):
        try:
            new_summary = await summarize(req.chat_history)
        except Exception:
            pass

    return {"interpretation": ai_result.get("interpretation", ""), "sql": generated_sql or None,
            "results": results, "analysis": analysis, "summary": new_summary}


@router.post("/dictionary")
async def add_term(tenant_id: str, term: str, definition: str,
                   sql_logic: str | None = None, category: str | None = None,
                   user: CurrentUser = Depends(get_current_user),
                   db: AsyncSession = Depends(get_db)):
    entry = BusinessDictionary(tenant_id=tenant_id, term=term, definition=definition,
                                sql_logic_snippet=sql_logic, category=category,
                                embedding=embed(f"{term}: {definition}"))
    db.add(entry)
    await db.commit()
    return {"id": str(entry.id)}


@router.post("/golden-queries")
async def add_golden(tenant_id: str, intent: str, sql: str,
                     approved_by: str | None = None,
                     user: CurrentUser = Depends(get_current_user),
                     db: AsyncSession = Depends(get_db)):
    gq = GoldenQuery(tenant_id=tenant_id, user_intent=intent, approved_sql=sql,
                      approved_by=approved_by, embedding=embed(intent))
    db.add(gq)
    await db.commit()
    return {"id": str(gq.id)}
