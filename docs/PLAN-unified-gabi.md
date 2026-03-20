# PLAN: Gabi Unificada — Chat Único + Esconder gabi.data

## Objetivo

Consolidar `gabi.legal` + `gabi.writer` em um único chat ("Gabi"), esconder `gabi.data`, e simplificar a UX para refletir a filosofia de orquestradora pura.

---

## Contexto

**Antes:**
```
Sidebar:
├── Painel Principal
├── gabi.writer   → /ghost  (estilo)
├── gabi.legal    → /law    (compliance)
├── gabi.data     → /ntalk  (dados)
├── Documentação
└── Administração
```

**Depois:**
```
Sidebar:
├── Painel Principal
├── Gabi           → /chat   (unificado)
├── Documentação
└── Administração
```

---

## Fase 1: Esconder gabi.data (Rápido — ~15 min)

### Frontend

#### [MODIFY] [sidebar.tsx](file:///home/resper/Gabi/web/src/components/layout/sidebar.tsx)
- Remover `ntalk` do array `modules`
- Manter o código de `/ntalk/page.tsx` intacto (acessível via URL direta, mas escondido da nav)

#### [MODIFY] [auth-provider.tsx](file:///home/resper/Gabi/web/src/components/auth-provider.tsx)
- Remover `ntalk` da lista de módulos padrão em `allowed_modules` (se aplicável)

---

## Fase 2: Chat Unificado (Complexo — ~2h)

### 2.1 Nova Rota Unificada

#### [NEW] [page.tsx](file:///home/resper/Gabi/web/src/app/chat/page.tsx)
Chat unificado que combina funcionalidades de `/law` e `/ghost`:

**Merge de features:**
| Feature | Origem | Como fica |
|---------|--------|-----------|
| ChatPanel com streaming | Ambos | Mantém — já é componente compartilhado |
| Upload inline (📎 no chat) | law | Mantém — recém implementado |
| Upload base jurídica (header) | law | Mantém como seção expansível |
| Style Profiles (KnowledgePanel) | ghost | Vira botão no header: "✍️ Estilo" |
| OnboardingStepper | ghost | Adaptado para o chat unificado |
| Chat history sidebar | Ambos | Unificado, módulo = "gabi" |
| Insights badge | law | Mantém como badge no header |
| Apresentação PPTX | law | Mantém como botão no header |

**Agentes combinados:**
```
Orquestrador Unificado (auto):
├── Legal: auditor, researcher, drafter, watcher
├── Seguros: policy_analyst, claims_analyst, regulatory_consultant  
└── Writer: ghost_writer (com style profile ativo)
```

#### [MODIFY] [sidebar.tsx](file:///home/resper/Gabi/web/src/components/layout/sidebar.tsx)
- Substituir `ghost` e `law` por item único: `{ key: "gabi", label: "Gabi", icon: Sparkles, href: "/chat", accent: "var(--color-gabi-primary)" }`
- Remover seção "Inteligência" → NavItem direto

---

### 2.2 Backend: Orquestrador Expandido

#### [MODIFY] [agents.py](file:///home/resper/Gabi/api/app/modules/law/agents.py)
- Adicionar agente `writer` ao `AGENTS` dict:
```python
"writer": """
[PERSONA] Você é a Gabi Writer, Ghost Writer profissional.
[AÇÃO] Siga o style profile ativo para redação. Use RAG de conteúdo.
[RESTRIÇÕES] Fidelidade ao estilo. Se não houver perfil ativo, use tom formal.
"""
```
- Expandir `ORCHESTRATOR_PROMPT` com regras para writer:
  - "Se mencionou 'escreva', 'redija', 'elabore', 'relatório', 'texto' → [`writer`]"
  - "Se mencionou 'estilo', 'tom', 'voice' → [`writer`]"
  - "Se é redação jurídica com estilo → [`drafter`, `writer`]"

#### [MODIFY] [router.py](file:///home/resper/Gabi/api/app/modules/law/router.py) (ou novo router unificado)
- No endpoint `/agent-stream`, quando agente = `writer`:
  - Buscar style profile ativo do usuário
  - Injetar `style_signature` + `exemplars` no system prompt
  - Usar RAG do ghost (busca em `ghost_doc_chunks` para conteúdo)
  - Usar RAG do law (busca em `legal_chunks` para normativos)
- Unificar a lógica de RAG para consultar AMBAS as bases

#### [NEW] Endpoint: `/api/chat/style-profiles` (proxy)
- Proxy para os endpoints do ghost: `/profiles`, `/upload`, `/extract-style`
- Ou: mover endpoints de style profile para o router unificado

---

### 2.3 API Client

#### [MODIFY] [api.ts](file:///home/resper/Gabi/web/src/lib/api.ts)
- Criar novo namespace `gabi.chat` que combina:
```typescript
chat: {
  stream: (data) => /* /api/law/agent-stream (usa orquestrador expandido) */,
  upload: (file) => /* /api/law/upload */,
  extractText: (file) => /* /api/law/extract-text */,
  profiles: () => /* /api/ghost/profiles */,
  createProfile: (name) => /* /api/ghost/profiles */,
  uploadStyleDoc: (file, profileId) => /* /api/ghost/upload */,
  extractStyle: (profileId) => /* /api/ghost/profiles/{id}/extract-style */,
  presentation: (ids) => /* /api/law/presentation */,
  insights: () => /* /api/law/insights */,
}
```

---

### 2.4 Redirects e Cleanup

#### [MODIFY] [page.tsx](file:///home/resper/Gabi/web/src/app/law/page.tsx) → Redirect to `/chat`
#### [MODIFY] [page.tsx](file:///home/resper/Gabi/web/src/app/ghost/page.tsx) → Redirect to `/chat`
- `redirect("/chat")` para backward compatibility

---

## Fase 3: Ajustes de Permissão

#### [MODIFY] Backend — allowed_modules
- Reorganizar: se user tem `law` OU `ghost` em `allowed_modules`, tem acesso a `gabi` (chat unificado)
- Se user tem APENAS `ntalk` → sem acesso (ntalk está escondido por enquanto)

---

## Verificação

### Testes Manuais
1. Sidebar mostra apenas: Painel · **Gabi** · Documentação · Admin
2. `/chat` abre o chat unificado com header contendo: Estilo ✍️ · Base Jurídica 📎 · Apresentação · Histórico
3. Upload inline funciona (PDF/DOCX/TXT)
4. Pergunta legal ativa agentes jurídicos (auditor, researcher, drafter, watcher)
5. Pergunta de escrita ativa ghost writer com style profile
6. Pergunta híbrida: *"Escreva um parecer no estilo do escritório"* → drafter + writer
7. `/law` e `/ghost` redirecionam para `/chat`
8. `/ntalk` não aparece na sidebar (acessível via URL direta)
9. Style profiles acessíveis pelo botão no header
10. Admin panel inalterado

### Riscos
| Risco | Mitigação |
|-------|-----------|
| RAG misturado (legal + ghost) retorna resultados ruins | Filtrar por `module` na query de embedding |
| Style profile não ativo causa erro | Fallback: sem estilo → tom formal padrão |
| URLs antigos quebram | Redirects permanentes |
| Permissões por módulo inconsistentes | Mapear `law`+`ghost` → `gabi` no backend |
