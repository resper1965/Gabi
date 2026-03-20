# PLAN: Simplificação Sistêmica — Performance + Redução de Complexidade

## Objetivo

Reduzir ~1.400 linhas de código morto/duplicado, consolidar rotas, e extrair componentes do monolito `chat-panel.tsx` — sem alterar funcionalidades visíveis.

---

## Dados do Audit

```
FRONTEND (8.352 linhas total)
├── admin/page.tsx ........... 870 linhas  ← maior arquivo
├── chat-panel.tsx ........... 744 linhas  ← monolito
├── landing/page.tsx ......... 556 linhas
├── sidebar.tsx (OLD) ........ 242 linhas  ← DUPLICATA
├── layout/sidebar.tsx (NEW) . 307 linhas  ← em uso
├── onboarding-stepper.tsx ... 102 linhas  ← INÚTIL (não importado)
├── upload-button.tsx ........ 111 linhas  ← INÚTIL (não importado)
├── law/page.tsx ............... 5 linhas  ← redirect (pode virar middleware)
└── ghost/page.tsx ............. 5 linhas  ← redirect (pode virar middleware)

BACKEND (17.343 linhas total)
├── ghost/router.py .......... 641 linhas  ← 19 endpoints, só 5 usados
├── admin/router.py .......... 533 linhas
├── law/router.py ............ 530 linhas
└── ntalk/router.py .......... 463 linhas  ← módulo escondido
```

---

## Fase 1: Dead Code Removal (~600 linhas)

### Impacto: Alto | Risco: Zero | Tempo: ~10 min

#### [DELETE] `components/sidebar.tsx` (242 linhas)
- Sidebar antiga, substituída por `components/layout/sidebar.tsx`
- Não é importado em nenhum lugar ativo

#### [DELETE] `components/onboarding-stepper.tsx` (102 linhas)
- Zero imports em todo o codebase
- Era do ghost, não foi migrado para /chat

#### [DELETE] `components/upload-button.tsx` (111 linhas)
- Zero imports em todo o codebase
- Substituído por `MassUploadZone` + inline upload no ChatPanel

---

## Fase 2: Middleware Redirects (~10 linhas adicionadas, 2 files removidos)

### Impacto: Médio | Risco: Baixo | Tempo: ~5 min

#### [NEW] `middleware.ts` (ou add ao existente)
```typescript
// Redirects sem page files
if (pathname === "/law" || pathname === "/ghost") {
  return NextResponse.redirect(new URL("/chat", req.url))
}
```

#### [DELETE] `app/law/page.tsx` (5 linhas)
#### [DELETE] `app/ghost/page.tsx` (5 linhas)

---

## Fase 3: chat-panel.tsx Decomposição (744 → ~300 + subcomponentes)

### Impacto: Alto | Risco: Médio | Tempo: ~30 min

#### [NEW] `components/chat/empty-state.tsx`
- Hero section + action cards + prompt chips
- Props: `moduleAccent`, `suggestedPrompts`, `onSelectPrompt`

#### [NEW] `components/chat/message-bubble.tsx`
- `AssistantBubble` + `UserBubble` + `CopyButton`
- Props: `msg`, `moduleAccent`

#### [NEW] `components/chat/file-attachment.tsx`
- Lógica de attachment: seleção, extração de texto, chip display
- Props: `onFileExtracted`, `fileExtractUrl`

#### [MODIFY] `components/chat-panel.tsx`
- Mantém orquestração: streaming, scroll, input, ref management
- Importa subcomponentes acima
- Resultado: ~300 linhas (de 744)

---

## Fase 4: Ghost Router Slim (641 → ~200 linhas)

### Impacto: Alto | Risco: Médio | Tempo: ~20 min

**Endpoints ativos** (5 de 19):
- `GET /profiles` — listar perfis de estilo
- `POST /profiles` — criar perfil
- `POST /profiles/{id}/extract-style` — extrair estilo
- `POST /upload` — upload documento de estilo
- `GET /documents` — listar docs de estilo

**Endpoints removíveis** (14):
- `POST /generate` — substituído por law/agent com writer agent
- `POST /generate-stream` — substituído por law/agent-stream com writer agent
- `DELETE /documents/{id}` — pode mover para profile management
- Endpoints de onboarding, refinement, etc. — não usados pelo /chat

#### [MODIFY] `ghost/router.py`
- Manter apenas 5 endpoints de style profile
- Remover lógica de geração dse texto (agora vive no law router via writer agent)
- ~200 linhas resultantes

---

## Fase 5: API Client Cleanup (405 → ~350 linhas)

### Impacto: Baixo | Risco: Baixo | Tempo: ~10 min

#### [MODIFY] `lib/api.ts`
- Remover `gabiWriter.generate` e `gabiWriter.generateStream` (não mais usados)
- Remover `gabiWriter.deleteDocument` (eliminado na Fase 4)
- Manter style profile endpoints intactos

---

## Resultado Esperado

| Métrica | Antes | Depois | Δ |
|---------|-------|--------|---|
| Linhas frontend | 8.352 | ~7.200 | **-14%** |
| Linhas ghost/router.py | 641 | ~200 | **-69%** |
| Arquivos componentes | ~15 | ~16 | +1 (mas menores) |
| Maior arquivo (chat-panel) | 744 | ~300 | **-60%** |
| Dead code | ~455 linhas | 0 | **-100%** |
| Endpoints ghost | 19 | 5 | **-74%** |

---

## Ordem de Execução

1. **Fase 1** → Dead code (zero risco)
2. **Fase 2** → Middleware redirects (baixo risco)
3. **Fase 3** → ChatPanel decomposição (médio risco — maior impacto)
4. **Fase 4** → Ghost router slim (médio risco)
5. **Fase 5** → API client cleanup (baixo risco)

## Verificação

- Build: `npm run build` sem erros
- Funcional: `/chat` opera normalmente com todos os features
- Style profiles: abrir, criar, usar no chat
- File upload: PDF/DOCX/TXT inline
- Redirects: `/law` e `/ghost` → `/chat`
