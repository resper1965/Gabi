"""nTalkSQL — Business logic: SQL execution, RAG pipeline, CFO analysis."""

import asyncio
import json
import time

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai import generate, generate_json, generate_stream
from app.core.analytics import log_event
from app.core.auth import CurrentUser
from app.core.embeddings import embed
from app.core.memory import summarize, should_summarize
from app.core.rate_limit import check_rate_limit
from app.config import get_settings
from app.models.ntalk import (
    AuditLog, BusinessDictionary, GoldenQuery, TenantConnection,
)

settings = get_settings()

CFO_SYSTEM_PROMPT = """
[PERSONA] Você é a Gabi, CFO Sênior do mercado imobiliário.
Expertise em NOI, Cap Rate, Yield, Vacância, Inadimplência, VGV, TIR.

[AÇÃO] Gere consulta SQL SELECT para MS SQL Server.
[RESTRIÇÕES] Apenas SELECT. TOP {max_rows}. Aliases em português. Valores em R$.
Use APENAS tabelas/colunas do SCHEMA.

[FORMATO] JSON: {{"interpretation": "...", "sql": "SELECT ...", "explanation": "..."}}
""".format(max_rows=settings.max_query_rows)

CFO_INTERPRET_PROMPT = """[PERSONA] Você é a Gabi, CFO Sênior do mercado imobiliário.
[RESTRIÇÕES]
1. Interprete SOMENTE os dados retornados pela query acima.
2. NÃO invente dados, tendências ou benchmarks de mercado não presentes nos resultados.
3. Se os dados forem insuficientes: "Os dados retornados não permitem esta análise."
4. Cite linhas/valores específicos para sustentar cada conclusão.
5. Valores em R$. Use comparações período-a-período quando disponíveis."""


def validate_tenant_access(tenant_id: str, user: CurrentUser) -> None:
    """Ensure the user is authorized to access this tenant's data."""
    if user.role == "superadmin":
        return
    allowed_tenants = {user.uid}
    if user.org_id:
        allowed_tenants.add(user.org_id)
    if tenant_id not in allowed_tenants:
        raise HTTPException(
            status_code=403,
            detail=f"Acesso negado ao tenant '{tenant_id}'. Você só pode acessar dados do seu próprio tenant.",
        )


def execute_mssql(host, port, database, username, secret_ref, query):
    """Read-only SQL execution with Secret Manager credentials."""
    import pymssql
    from google.cloud import secretmanager

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
    conn = pymssql.connect(
        server=host, port=port, user=username,
        password=password, database=database,
        timeout=settings.query_timeout_seconds, login_timeout=10,
    )
    cursor = conn.cursor(as_dict=True)
    cursor.execute(query)
    rows = cursor.fetchall()
    columns = [d[0] for d in cursor.description] if cursor.description else []
    cursor.close()
    conn.close()

    return {
        "rows": rows, "columns": columns, "row_count": len(rows),
        "execution_time_ms": int((time.perf_counter() - start) * 1000),
    }


async def _get_connection(tenant_id: str, db: AsyncSession) -> TenantConnection:
    """Get active tenant connection or raise 404."""
    result = await db.execute(
        select(TenantConnection).where(
            TenantConnection.tenant_id == tenant_id, TenantConnection.is_active == True
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(404, "Conexão do tenant não configurada")
    return conn


async def _build_context(question: str, tenant_id: str, db: AsyncSession):
    """RAG: embed question, fetch dictionary + golden queries."""
    emb = await asyncio.to_thread(embed, question)

    dict_res = await db.execute(
        text("""SELECT term, definition, sql_logic_snippet
               FROM ntalk_business_dictionary
               WHERE tenant_id = :tid AND is_active = true AND embedding IS NOT NULL
               ORDER BY embedding <=> :emb::vector LIMIT 5"""),
        {"emb": str(emb), "tid": tenant_id},
    )
    dict_terms = [dict(r._mapping) for r in dict_res]

    golden_res = await db.execute(
        text("""SELECT user_intent, approved_sql
               FROM ntalk_golden_queries
               WHERE tenant_id = :tid AND is_active = true AND embedding IS NOT NULL
               ORDER BY embedding <=> :emb::vector LIMIT 3"""),
        {"emb": str(emb), "tid": tenant_id},
    )
    golden = [dict(r._mapping) for r in golden_res]

    return dict_terms, golden


async def _fetch_schema(conn: TenantConnection):
    """Read INFORMATION_SCHEMA from tenant MS SQL."""
    schema_raw = await asyncio.to_thread(
        execute_mssql, conn.host, conn.port, conn.db_name, conn.username,
        conn.secret_manager_ref,
        "SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE "
        "FROM INFORMATION_SCHEMA.COLUMNS ORDER BY TABLE_SCHEMA, TABLE_NAME",
    )
    tables = {}
    for r in schema_raw["rows"]:
        key = f"{r['TABLE_SCHEMA']}.{r['TABLE_NAME']}"
        tables.setdefault(key, []).append(f"{r['COLUMN_NAME']} ({r['DATA_TYPE']})")
    return tables


def _format_prompt(tables: dict, dict_terms: list, golden: list, question: str) -> str:
    """Build the full context prompt for SQL generation."""
    schema_str = "\n".join(f"[{k}]: {', '.join(v)}" for k, v in tables.items())
    dict_str = "\n".join(
        f"• {t['term']}: {t['definition']}" + (f" → SQL: {t['sql_logic_snippet']}" if t.get("sql_logic_snippet") else "")
        for t in dict_terms
    )
    golden_str = "\n".join(f"Pergunta: {g['user_intent']}\nSQL: {g['approved_sql']}\n" for g in golden)
    return f"=== SCHEMA ===\n{schema_str}\n\n=== DICIONÁRIO ===\n{dict_str}\n\n=== EXEMPLOS ===\n{golden_str}\n\n=== PERGUNTA ===\n{question}"


async def run_ask_pipeline(tenant_id: str, question: str, user: CurrentUser,
                           db: AsyncSession, chat_history: list | None = None):
    """Full nTalkSQL flow: RAG → SQL gen → execute → interpret → audit."""
    check_rate_limit(user.uid)

    dict_terms, golden = await _build_context(question, tenant_id, db)
    conn = await _get_connection(tenant_id, db)

    try:
        tables = await _fetch_schema(conn)
    except Exception as e:
        raise HTTPException(502, f"Erro ao ler schema: {e}")

    prompt = _format_prompt(tables, dict_terms, golden, question)
    ai_result = await generate_json("ntalk", prompt, CFO_SYSTEM_PROMPT)
    generated_sql = ai_result.get("sql", "")

    results = None
    status = "success"
    error_msg = None
    if generated_sql:
        try:
            results = await asyncio.to_thread(
                execute_mssql, conn.host, conn.port, conn.db_name,
                conn.username, conn.secret_manager_ref, generated_sql,
            )
        except (ValueError, ConnectionError) as e:
            status = "error"
            error_msg = str(e)

    analysis = ""
    if results and results.get("rows"):
        preview = json.dumps(results["rows"][:20], default=str, ensure_ascii=False)
        analysis = await generate(
            "ntalk", f"Pergunta: {question}\nSQL: {generated_sql}\nDados:\n{preview}",
            system_instruction=CFO_INTERPRET_PROMPT,
        )
    elif error_msg:
        analysis = f"⚠️ {error_msg}"

    log = AuditLog(
        tenant_id=tenant_id, user_id=user.uid, user_email=user.email,
        question=question, generated_sql=generated_sql,
        result_row_count=results["row_count"] if results else 0,
        execution_time_ms=results.get("execution_time_ms", 0) if results else 0,
        status=status, error_message=error_msg,
    )
    db.add(log)
    await db.commit()

    new_summary = None
    if chat_history and should_summarize(len(chat_history)):
        try:
            new_summary = await summarize(chat_history)
        except Exception:
            pass

    await log_event(db, user.uid, "ntalk", "query", metadata={"has_sql": bool(generated_sql)})

    return {
        "interpretation": ai_result.get("interpretation", ""),
        "sql": generated_sql or None,
        "results": results,
        "analysis": analysis,
        "summary": new_summary,
    }


async def run_ask_stream(tenant_id: str, question: str, user: CurrentUser,
                         db: AsyncSession, chat_history: list | None = None):
    """Streaming variant: SQL gen + exec sync, CFO interpretation via SSE."""
    check_rate_limit(user.uid)

    dict_terms, golden = await _build_context(question, tenant_id, db)
    conn = await _get_connection(tenant_id, db)

    try:
        tables = await _fetch_schema(conn)
    except Exception as e:
        raise HTTPException(502, f"Erro ao ler schema: {e}")

    prompt = _format_prompt(tables, dict_terms, golden, question)
    ai_result = await generate_json("ntalk", prompt, CFO_SYSTEM_PROMPT)
    generated_sql = ai_result.get("sql", "")

    results = None
    status = "success"
    error_msg = None
    if generated_sql:
        try:
            results = await asyncio.to_thread(
                execute_mssql, conn.host, conn.port, conn.db_name,
                conn.username, conn.secret_manager_ref, generated_sql,
            )
        except (ValueError, ConnectionError) as e:
            status = "error"
            error_msg = str(e)

    meta = json.dumps({
        "type": "meta",
        "interpretation": ai_result.get("interpretation", ""),
        "sql": generated_sql or None,
        "results": results,
    }, default=str, ensure_ascii=False)

    async def _stream():
        yield f"data: {meta}\n\n"
        if results and results.get("rows"):
            preview = json.dumps(results["rows"][:20], default=str, ensure_ascii=False)
            cfo_prompt = f"Pergunta: {question}\nSQL: {generated_sql}\nDados:\n{preview}"
            async for chunk in generate_stream(
                module="ntalk", prompt=cfo_prompt,
                system_instruction=CFO_INTERPRET_PROMPT,
                chat_history=chat_history,
            ):
                yield f"data: {json.dumps({'type': 'text', 'text': chunk}, ensure_ascii=False)}\n\n"
        elif error_msg:
            yield f"data: {json.dumps({'type': 'text', 'text': f'⚠️ {error_msg}'}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    log = AuditLog(
        tenant_id=tenant_id, user_id=user.uid, user_email=user.email,
        question=question, generated_sql=generated_sql,
        result_row_count=results["row_count"] if results else 0,
        execution_time_ms=results.get("execution_time_ms", 0) if results else 0,
        status=status, error_message=error_msg,
    )
    db.add(log)
    await db.commit()

    await log_event(db, user.uid, "ntalk", "query_stream", metadata={"has_sql": bool(generated_sql)})
    return _stream
