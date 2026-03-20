# 🔍 Audit de Débito Técnico — Gabi

## Resumo Executivo

| Severidade | Qtd | Destaques |
|---|---|---|
| 🔴 **Crítico** | 2 | API key em source, CORS localhost-only |
| 🟡 **Alto** | 4 | Emails hardcoded, exception handling, admin monolito, 0 frontend tests |
| 🔵 **Médio** | 4 | Missing return types, funções duplicadas, landing monolito, CORS config |
| ⚪ **Baixo** | 3 | URLs hardcoded de APIs públicas, processos zombie, integration tests stale |

---

## 🔴 Crítico (Bloqueia produção/segurança)

### 1. API Key DATAJUD em source code
```
api/app/services/datajud_client.py:32
_DATAJUD_API_KEY_FALLBACK = "cDZHYzlZa0JadVREZDJCendF..."
```
**Risco**: Key pública do CNJ commitada no repo. Mesmo que seja fallback, é anti-pattern.
**Fix**: Mover para `.env` obrigatório + falhar com erro claro se ausente.

### 2. CORS restrito a localhost
```
api/app/config.py:28
cors_origins: list[str] = ["http://localhost:3000"]
```
**Risco**: Em produção, isso pode bloquear chamadas legítimas ou estar sendo sobrescrito por env var sem validação.
**Fix**: Garantir CORS_ORIGINS vem de env var com fallback seguro (não `*`).

---

## 🟡 Alto (Afeta manutenibilidade/qualidade)

### 3. Admin emails hardcoded
```
api/app/config.py:35 → 5 emails hardcoded em lista
api/app/modules/platform/router.py:25 → hardcheck "@ness.com.br"
web/src/app/admin/platform/page.tsx:54 → mesmo check no frontend
```
**Fix**: Usar Firebase Custom Claims (como já fizemos para superadmin) e remover a lista.

### 4. Broad exception handling (15+ ocorrências)
```python
except Exception as e:  # ← em 15+ lugares
    logger.error(...)    # Engole erros de lógica, timeout, DB...
```
**Arquivos mais afetados**: `main.py` (4), `lexml_client.py` (3), `cvm_client.py` (2)
**Fix**: Catch específico por tipo (`httpx.TimeoutException`, `sqlalchemy.exc.OperationalError`, etc.)

### 5. admin/page.tsx — 870 linhas
Maior arquivo do frontend. Contém FinOps, gestão de orgs, observability, e 4 tabs num único componente.
**Fix**: Extrair `AdminFinOps`, `AdminOrgs`, `AdminUsage`, `AdminOverview` em subcomponentes.

### 6. Zero testes frontend
```
web/src/**/*.test.* → 0 arquivos
web/src/**/*.spec.* → 0 arquivos
```
Backend tem boa cobertura (19 test files, 7 integration tests). Frontend: nada.
**Fix mínimo**: Tests para `ChatPanel`, `AuthProvider`, `api.ts` (mocking fetch).

---

## 🔵 Médio (Melhoria de qualidade)

### 7. Missing return types (14+ funções)
```python
async def upload_document(...)        # sem -> dict
async def list_profiles(...)          # sem -> list[dict]
async def generate_presentation(...)  # sem -> bytes
```
**Fix**: Adicionar return type annotations em todos os endpoints e helpers.

### 8. Duplicate function names across modules
```
list_documents()   → existe em ghost/router.py E law/router.py
upload_document()  → existe em ghost/router.py E law/router.py
```
**Risco**: Confusão em imports e debugging.
**Fix**: Prefixar ou usar namespaces (`ghost_list_documents`, `law_list_documents`).

### 9. landing/page.tsx — 556 linhas
Um único arquivo com hero, features, pricing, contact, footer.
**Fix**: Extrair `LandingHero`, `LandingFeatures`, `LandingPricing`, `LandingFooter`.

### 10. Processos zombie
Há comandos rodando há 20+ horas no terminal (python3 AST parsers). Indica scripts de análise que nunca terminaram.
**Fix**: Kill e investigar por que não concluíram.

---

## ⚪ Baixo (Nice to have)

### 11. URLs hardcoded de APIs públicas
LeXML, CVM, BCB — URLs de APIs governamentais no código. Aceitável para APIs estáveis, mas idealmente viriam de config.

### 12. Integration tests podem estar stale
Após a simplificação do ghost router (removemos endpoints), `test_ghost_router.py` pode ter tests para `/generate` e `/generate-stream` que agora falhariam.
**Fix**: Revisar e atualizar tests de integração.

### 13. `gabi` module export no api.ts
```typescript
export const gabi = {
  writer: gabiWriter,
  legal: gabiLegal,
  ghost: gabiWriter,  // ← alias redundante
}
```
**Fix**: Remover alias `ghost` e simplificar exports.

---

## O que está **BOM** ✅

| Aspecto | Status |
|---|---|
| TypeScript strictness | 0 `any`, 0 `@ts-ignore` |
| Backend test coverage | 19 test files + 7 integration tests |
| 0 TODOs no código | Tudo resolvido |
| Rate limiting | ✅ Implementado |
| Circuit breaker | ✅ Implementado e testado |
| Firebase Custom Claims | ✅ Para superadmin |
| Startup health checks | ✅ DB, embeddings, DATAJUD |
| Clean architecture | Modules isolados, routers coesos |
