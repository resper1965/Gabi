# Multi-Agent Orchestration Plan: Refatoração do gabi.writer (RAG Híbrido)

## 📌 Contexto
O usuário solicitou uma avaliação profunda do módulo `gabi.writer` (nome interno `ghost`) e, em seguida, invocou o workflow de orquestração para resolver os gargalos listados no relatório `brainstorm_gabi_writer.md`. O principal problema é que a rota do Ghost Writer não utiliza a busca híbrida recém-criada (Vector + Lexical + RRF), confiando numa busca cega de limite baixo.

## 🛠 Domínios Analisados
- **Backend/API** → `backend-specialist`
- **Database** → `database-architect`
- **Testing** → `test-engineer`

---

## 📋 [FASE 1] Planejamento da Arquitetura (Aprovado?)

Para integrar o `ghost` ao estado-da-arte do RAG, os agentes atuarão em paralelo nas seguintes tarefas:

### Agente 1: Database Architect (`database-architect`)
**Missão**: Consistência de Tabelas e Schema Lexical
1. Verificar os nomes reais e migrações das tabelas do Ghost (há conflitos entre `ghost_chunks` e `ghost_doc_chunks`).
2. Garantir que as tabelas de conteúdo possuam a coluna `content_tsvector` devidamente indexada.
3. Atualizar o mapeamento `ALLOWED_TABLE_PAIRS` no `dynamic_rag.py` se necessário.

### Agente 2: Backend Specialist (`backend-specialist`)
**Missão**: Refatoração do Roteador e Re-Ranking
1. Refatorar os endpoints `/generate` e `/generate-stream` dentro de `api/app/modules/ghost/router.py`. O código deve abandonar as SQL Queries nativas limitadas.
2. Invocar `retrieve_if_needed(question, user_id, module="ghost")` da core library de IA.
3. Refatorar a malha de **Re-Ranking** no `dynamic_rag.py` para adaptar o Prompt de julgamento do Gemini baseado no `module`. Ex: O módulo ghost deve julgar relevância literária, factual e técnica de escrita (não leis cronológicas).

### Agente 3: Test Engineer (`test-engineer`)
**Missão**: Validação SSDLC e Comportamental
1. Testar o parser SSE (Server-Sent Events) no streaming após a mudança de injeção de prompt.
2. Executar a varredura local de QA (Lint), garantindo que os novos imports e assinaturas de funções estejam corretos em relação às interfaces do TypeScript/Pydantic.
