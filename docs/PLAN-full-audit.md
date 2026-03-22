# Auditoria Completa — Frontend + Backend

## Sumário

Auditoria full-stack da Gabi. **7 issues encontrados** — codebase saudável.

---

## 🔴 P0 — Críticos

### 1. `/ghost` — Página vazia no frontend

`web/src/app/ghost/` existe mas **não tem `page.tsx`**. Usuário que acessa `/ghost` recebe 404.

**Fix:** Criar `page.tsx` redirecionando para `/chat?module=ghost` ou deletar o diretório.

### 2. `law/insurance.py` — Router órfão (não montado)

O arquivo `law/insurance.py` define 4 endpoints (`/insurance/upload`, `/clients/{tenant_id}`, etc.) mas **NÃO é registrado em `main.py`**. Os endpoints são inacessíveis.

**Fix:** Montar no `law/router.py` ou documentar como feature futura.

### 3. `law/services.py` L77 — SQL raw referenciando `ic_documents`

```python
JOIN ic_documents d ON c.document_id = d.id
```

Tabela `ic_documents` depende de `models/insightcare.py`. Se alguém remover o modelo, o SQL quebra silenciosamente.

**Fix:** Usar ORM query em vez de raw SQL, ou adicionar comentário de dependência.

---

## 🟡 P1 — Importantes

### 4. `AdminUsersTab.tsx` L100 — Cor CSS stale

```tsx
color: "var(--color-mod-ntalk)"  // Módulo removido
```

**Fix:** Trocar para `var(--color-gabi-accent)` ou variável existente.

### 5. `layout.tsx` — Meta description genérica

```tsx
description: "Inteligencia Artificial powered by ness."
```

Sem keywords de SEO, sem meta OG tags.

### 6. `next.config.ts` — CSP ausente

Security headers têm HSTS, X-Frame, X-XSS mas falta `Content-Security-Policy`.

---

## 🟢 P2 — Cosméticos

### 7. `data_retention.py` — Regra para `ntalk_audit_logs` (tabela sem writer)

---

## ✅ O que está bom

| Área | Status |
|------|--------|
| **Frontend imports** | Zero imports mortos |
| **Frontend console.log** | Zero (limpo) |
| **Frontend TODOs** | Zero |
| **Backend bare except** | Zero `except: pass` |
| **Backend insightcare models** | Ativo e usado (absorvido no law module) |
| **API client (`api.ts`)** | Limpo — só chama rotas que existem |
| **Security headers** | HSTS, X-Frame-Options, X-XSS, Referrer-Policy ✅ |
| **Error handling** | `ErrorHandlerMiddleware` sanitiza erros ✅ |
| **CORS** | Tightened: explicit methods/headers ✅ |
| **Auth** | Firebase Auth + `require_role` decorator ✅ |

---

## Ordem de execução

1. **P0-1:** Ghost page — redirecionar ou deletar
2. **P0-2:** Montar `insurance.py` ou documentar
3. **P0-3:** Refatorar raw SQL em `law/services.py`
4. **P1-4:** Fix cor CSS stale
5. **P1-5/6:** Meta tags + CSP header
