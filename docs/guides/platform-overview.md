# Gabi — Platform Overview

> Plataforma de inteligência artificial especializada para equipes jurídicas, financeiras e de seguros.

---

## O que é a Gabi

Gabi é uma **copiloto de IA empresarial** que opera em quatro verticais de negócio, cada uma com agentes especializados que entendem o contexto, a linguagem e os riscos do setor. Diferente de chatbots genéricos, a Gabi trabalha com **suas bases de documentos**, **seus dados financeiros** e **suas normas regulatórias** — garantindo respostas fundamentadas e rastreáveis.

A plataforma é desenhada para profissionais que lidam com **informação sensível** e **regulamentação pesada**: advogados, controllers financeiros, corretores de seguros e gestores de compliance.

---

## Módulos

### 🖊️ gabi.writer — Ghost Writer Invisível

**Para quem**: Executivos, advogados, gestores que precisam produzir textos profissionais com constância de estilo.

**O que faz**:

- **Aprende seu estilo** — carregue 3-5 textos anteriores e a Gabi extrai uma *Style Signature*: análise forense do vocabulário, estrutura, tom, cadência e maneirismos do autor
- **Escreve como você** — a partir de briefings ou documentos de referência, gera textos que leitores não distinguem do original
- **Dual RAG** — combina seus documentos de conteúdo (fatos) com o perfil de estilo (forma), separando rigorosamente dados de expressão
- **Streaming em tempo real** — veja o texto sendo construído token por token via SSE
- **Anti-fabricação** — quando um dado factual não está na base, insere `[⚠️ Dado não encontrado — preencher]` em vez de inventar

**Fluxo**: Criar perfil → Carregar textos de estilo → Extrair Style Signature → Carregar docs de conteúdo → Gerar

---

### ⚖️ gabi.legal — Auditoria Jurídica Multi-Agente

**Para quem**: Departamentos jurídicos, escritórios de advocacia, equipes de compliance.

**O que faz**:

- **4 agentes especializados** que debatem em paralelo sobre a mesma consulta:
  - **Auditora** — análise de conformidade e riscos legais
  - **Pesquisadora** — busca em jurisprudência, leis e normativos
  - **Redatora** — elaboração de documentos jurídicos
  - **Sentinela** — monitoramento de mudanças regulatórias
- **Multi-Agent Debate** — os agentes produzem análises independentes, depois um sintetizador identifica convergências, conflitos e pontos de atenção
- **Base regulatória viva** — ingestão automática de normativos do BCB, CMN, CVM e leis do Planalto, com parsing estrutural (artigos, parágrafos, incisos, alíneas)
- **Análise de risco por IA** — cada normativo ingerido recebe análise de impacto: resumo executivo, nível de risco e justificativa
- **Alertas regulatórios** — notificação de novas normas e mudanças relevantes
- **RAG jurídico** — busca semântica em contratos, políticas internas, pareceres e peças processuais do escritório

**Fluxo**: Upload documentos → Indexação semântica → Consulta (chat) → Debate multi-agente → Resposta sintetizada com citações

**Tipos de documento**: Leis, regulações, contratos, políticas, precedentes, petições, pareceres, peças de referência

---

### 📊 gabi.data — CFO de Dados em Linguagem Natural

**Para quem**: Controllers financeiros, analistas de dados, gestores imobiliários.

**O que faz**:

- **Pergunte em português, receba SQL + resposta** — a Gabi interpreta a pergunta, gera SQL seguro (SELECT-only), executa no banco do cliente e interpreta os resultados
- **Conexão multitenant** — cada empresa cadastra seus bancos SQL Server com credenciais via Secret Manager
- **Schema sync automático** — lê INFORMATION_SCHEMA e popula o dicionário de negócio: nome da tabela/coluna → significado de negócio em português
- **Dicionário de negócio** — vocabulário customizável: *"vacância"* = `(1 - area_locada / area_total)`, *"NOI"* = `receita - despesas_operacionais`
- **Golden Queries** — consultas validadas e aprovadas por humanos que a IA prioriza quando reconhece a intenção
- **Audit log** — toda query gerada, executada e interpretada é registrada com tempo, SQL, resultado e contexto
- **Proteções**: read-only, timeout (30s), limite de linhas (1000), credenciais em Secret Manager

**Fluxo**: Cadastrar conexão → Sync schema → Enriquecer dicionário → Perguntar em linguagem natural → SQL → Execução → Interpretação

**Linguagem de negócio**: Cap Rate, NOI, Yield, VGV, TIR, vacância, inadimplência, sinistralidade

---

**Para quem**: Corretoras de seguros, departamentos de benefícios, gestores de saúde corporativa.

**O que faz**:

- **3 agentes especializados**:
  - **Analista de Apólices** — cobertura, gaps, exclusões, comparação entre planos
  - **Analista de Sinistralidade** — tendências, categorias de custo, identificação de outliers, projeções atuariais
  - **Consultor Regulatório** — normas ANS, SUSEP, RN vigentes, citação artigo-parágrafo
- **Upload inteligente de dados**:
  - PDF/DOCX/TXT → apólices e documentos contratuais (RAG)
  - XLSX → dados de sinistralidade por período, categoria, beneficiário
- **Gestão multitenant** — cada corretora tem seus clientes, apólices e dados isolados
- **Insights regulatórios** — análises de impacto de normas ANS/SUSEP com nível de risco
- **RAG especializado** — busca combinada em documentos próprios + base regulatória compartilhada

**Fluxo**: Cadastrar clientes → Upload apólices/sinistros → Consultar agente → Análise com citação de fontes

---

## Funcionalidades Transversais

### 💬 Chat Unificado
Todas as conversas com qualquer módulo ficam em **sessões persistentes** — com histórico, export em Markdown e gestão por módulo.

### 🧠 RAG Dinâmico
Antes de cada busca, a Gabi **decide automaticamente** se precisa consultar a base documental. Follow-ups, saudações e pedidos genéricos são respondidos sem gastar embedding, economizando **~200ms** e custo por interação.

### 🤖 Multi-Agent Debate
Para decisões complexas (jurídico, seguros), múltiplos agentes analisam a mesma consulta em **paralelo**, depois um sintetizador identifica convergências e conflitos — produzindo respostas mais equilibradas.

### 🛡️ Anti-Alucinação
Guardrail global injetado em **100% das chamadas à IA**:
- Nunca fabrica dados factuais (nomes, datas, valores, artigos de lei)
- Diferencia fatos (da base) de análises (conclusões lógicas)
- Declara explicitamente quando informação não foi encontrada

### 🔐 Gestão de Usuários e Acesso
- Login via Google/email (Firebase)
- Aprovação manual de novos usuários
- Controle por módulo — cada usuário acessa apenas módulos autorizados
- Roles: `superadmin`, `admin`, `user`
- Auto-approve por domínio confiável

### 📊 Analytics e Admin
- Dashboard com estatísticas: queries/dia, breakdown por módulo, top usuários
- Seed packs regulatórios — instalação de pacotes BCB, CMN, CVM com um clique
- Audit log de ações críticas

### 📋 LGPD
Conformidade com a Lei Geral de Proteção de Dados (Arts. 17-18):
- **Portabilidade** — export completo dos dados de qualquer usuário (chat, documentos, analytics)
- **Eliminação** — purge total irreversível de todos os dados de um titular
- **Audit trail** — log de todas as ações administrativas

---

## Modelos de IA

| Uso | Modelo | Razão |
|-----|--------|-------|
| Ghost Writer | Gemini 2.0 Flash | Criatividade + baixa latência |
| Análise Jurídica | Gemini 1.5 Pro | Contexto longo (1M tokens) + precisão |
| Geração SQL | Gemini 2.0 Flash | Velocidade na geração estruturada |
| Embeddings | `text-multilingual-embedding-002` | 768 dimensões, multilíngue, custo otimizado |
| Intent Detection | Gemini 2.0 Flash | Decisão rápida sobre necessidade de RAG |

---

## Infraestrutura

- **API**: FastAPI async (Python 3.11+), containerizada em Cloud Run
- **Frontend**: Next.js (App Router), SSR/CSR híbrido, Cloud Run
- **Banco**: PostgreSQL 15 + pgvector (busca vetorial), Cloud SQL gerenciado
- **Auth**: Firebase Authentication (Google + email)
- **CI/CD**: Cloud Build + Artifact Registry, 3 ambientes (dev/staging/prod)
- **Segurança**: Secret Manager, security headers, circuit breaker, rate limiting
- **Resiliência**: startup non-blocking, circuit breaker por serviço, fallbacks graciosos

---

## Diferenciais

| vs. ChatGPT/Copilot genéricos | Gabi |
|-------------------------------|------|
| Responde com base em conhecimento geral | Responde com base nos **seus documentos e dados** |
| Um modelo só para tudo | **Modelo certo para cada tarefa** (Pro para jurídico, Flash para SQL) |
| Sem controle de acesso | **Multitenant com permissões por módulo** |
| Sem rastreabilidade | **Audit log + citação de fontes + LGPD** |
| Alucina livremente | **Guardrail anti-alucinação em 100% das chamadas** |
| Agente único | **Multi-agente com debate e síntese** |
