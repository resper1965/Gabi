# Plano Técnico — Fechamento de Gaps Competitivos

> **Status:** Planejamento — nenhuma alteração aplicada ao código
> **Referência:** `docs/competitive-analysis.md`
> **Data:** março 2026

---

## Índice

1. [Jurimetria Quantitativa](#gap-1--jurimetria-quantitativa)
2. [Verificação de Citações em Tempo Real](#gap-2--verificação-de-citações-em-tempo-real)
3. [Previsão de Resultado Processual](#gap-3--previsão-de-resultado-processual)
4. [Canal WhatsApp](#gap-4--canal-whatsapp)
5. [Plano Individual Acessível + Onboarding Self-Service](#gap-5--plano-individual-acessível--onboarding-self-service)

---

## Gap 1 — Jurimetria Quantitativa

### Problema
A Turivius possui 130M+ de decisões com análise estatística (percentual de êxito, tendências por relator, órgão julgador, tese). O DataJud atual da Gabi busca apenas STJ e STF com queries focadas em compliance, paginando até 500 por query. Não há camada de estatística sobre o acervo.

### Objetivo
Transformar o `DataJudClient` em um pipeline de ingestão abrangente (todos os tribunais federais), adicionar tabelas para armazenar métricas agregadas e expor endpoints de análise jurimetrica no `gabi.legal`.

---

### Fase 1 — Expansão da Ingestão DataJud

**Arquivo de referência:** `api/app/services/datajud_client.py`

**O que muda:**

O `TRIBUNAL_ENDPOINTS` atual tem apenas STJ e STF. A API pública do DataJud expõe todos os TRFs, TJs estaduais, TRT, TST, STJ, STF — cada um com seu próprio índice Elasticsearch (padrão: `api_publica_{sigla}`).

**Passo a passo:**

1. **Expandir `TRIBUNAL_ENDPOINTS`** para incluir os índices de todos os tribunais relevantes:
   - Federais: TRF1 a TRF6
   - Trabalhistas: TST + TRT1–24
   - STJ e STF (já existentes)
   - Estaduais (TJSP, TJRJ, TJMG, TJRS, TJPR como prioritários)

2. **Criar `TRIBUNAL_QUERIES`** separado por área do direito ao invés de só compliance, permitindo parametrizar por módulo chamador:
   ```
   tema: str  →  queries: list[str]
   ```
   Temas: `"compliance"`, `"tributario"`, `"trabalhista"`, `"consumidor"`, `"societario"`.

3. **Adicionar controle de volume por tribunal** — tribunais estaduais têm volume muito maior. Introduzir `max_total_per_tribunal: int` como parâmetro opcional (default 2000 para estaduais, 5000 para superiores).

4. **Criar script de ingestão agendada** em `api/scripts/ingest_datajud.py`:
   - Recebe `--since-days N` (default 30) e `--tribunais lista`
   - Usa `asyncio.gather` para rodar tribunais em paralelo (com semáforo para limitar concorrência)
   - Persiste cada `JurisprudenciaItem` na nova tabela `jurisprudencia_decisions` (ver Fase 2)
   - Deduplica por `numero_processo + tribunal` (constraint única)

5. **Adicionar `fetch_all_tribunais()`** no `DataJudClient` que itera sobre todos os endpoints configurados e retorna um dicionário `{tribunal: [JurisprudenciaItem]}`.

---

### Fase 2 — Modelo de Dados para Jurimetria

**Arquivo de referência:** `api/alembic/versions/` (criar nova migração `00X_jurimetria.py`)

**Novas tabelas:**

```
jurisprudencia_decisions
  id               UUID PK
  tribunal         VARCHAR(20)         -- "STJ", "TJSP", "TST"
  numero_processo  VARCHAR(100)
  classe           VARCHAR(80)         -- "REsp", "RE", "RO"
  assunto          TEXT
  ementa           TEXT
  data_julgamento  DATE
  relator          VARCHAR(200)
  orgao_julgador   VARCHAR(200)
  resultado        VARCHAR(50)         -- "provido", "negado", "parcial", NULL
  area_direito     VARCHAR(50)         -- "tributario", "trabalhista", "consumidor"
  embedding        VECTOR(768)
  id_fonte         TEXT
  created_at       TIMESTAMP
  UNIQUE (tribunal, numero_processo)

jurimetria_stats                        -- visão materializada atualizada pelo script
  id               SERIAL PK
  tribunal         VARCHAR(20)
  area_direito     VARCHAR(50)
  classe           VARCHAR(80)
  total_decisoes   INTEGER
  pct_provido      NUMERIC(5,2)
  pct_negado       NUMERIC(5,2)
  pct_parcial      NUMERIC(5,2)
  periodo_inicio   DATE
  periodo_fim      DATE
  updated_at       TIMESTAMP
  UNIQUE (tribunal, area_direito, classe, periodo_inicio, periodo_fim)
```

**Indexação:**
- `jurisprudencia_decisions.embedding`: HNSW (igual ao padrão em `004_hnsw_indexes.py`)
- `jurisprudencia_decisions.tribunal + area_direito`: índice composto para filtro nas buscas de jurimetria
- `jurisprudencia_decisions.data_julgamento`: índice para range queries

**Como popular `resultado`:**
No momento da ingestão, aplicar regex simples na ementa para classificar o resultado antes de persistir. Regras:
- "provimento negado", "recurso desprovido", "improcedente" → `"negado"`
- "recurso provido", "procedente", "provimento dado" → `"provido"`
- "parcialmente" → `"parcial"`
- Nenhum match → `NULL` (enriquecimento posterior por LLM em batch)

**Enriquecimento por LLM (assíncrono):**
Um worker separado (`scripts/enrich_jurimetria.py`) busca registros com `resultado IS NULL`, envia a ementa para `generate_json()` com prompt curto e preenche o campo. Processa em batches de 50.

---

### Fase 3 — Serviço de Jurimetria

**Novo arquivo:** `api/app/services/jurimetria_service.py`

**Funções principais:**

```python
async def search_jurisprudencia(
    query: str,
    db: AsyncSession,
    tribunal: str | None = None,
    area_direito: str | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    limit: int = 20,
) -> list[dict]
# Realiza busca híbrida (vector + FTS) na tabela jurisprudencia_decisions
# Reutiliza embed() + reciprocal_rank_fusion() já existentes

async def get_stats(
    db: AsyncSession,
    area_direito: str,
    tribunal: str | None = None,
    periodo_meses: int = 24,
) -> dict
# Consulta jurimetria_stats com filtros
# Retorna {"total": int, "pct_provido": float, "pct_negado": float, "tendencia": str}

async def get_tendencia_relator(
    db: AsyncSession,
    relator: str,
    area_direito: str,
) -> dict
# Agrega decisões por relator para análise de viés decisório
```

**Integração com RAG existente:**
O `retrieve_if_needed()` em `core/dynamic_rag.py` deve incluir `jurisprudencia_decisions` como quarta fonte de busca quando `module="law"`, passando o resultado pelo RRF junto com as 3 fontes já existentes. Isso é um único ponto de mudança: adicionar uma nova chamada `_search_jurisprudencia()` paralela às já existentes, retornar a lista e incluir na fusão.

---

### Fase 4 — Endpoints de Jurimetria

**Arquivo de referência:** `api/app/modules/law/router.py`

**Novos endpoints** (adicionar ao router de law):

```
GET /api/law/jurimetria/stats
  params: area_direito, tribunal, periodo_meses
  → retorna percentuais e tendência

GET /api/law/jurimetria/search
  params: q, tribunal, area_direito, data_inicio, data_fim, limit
  → lista de decisões rankeadas

GET /api/law/jurimetria/relator/{nome}
  params: area_direito
  → perfil decisório do relator
```

---

### Complexidade e Riscos

| Item | Complexidade | Risco |
|------|-------------|-------|
| Expansão TRIBUNAL_ENDPOINTS | Baixa | Rate limiting do DataJud (uso de semáforo) |
| Migração de banco (novas tabelas) | Baixa | Nenhum — tabelas novas, não altera existentes |
| Classificação de resultado por regex | Média | Acurácia ~75%; mitigado pelo enriquecimento LLM |
| Busca híbrida em jurisprudencia_decisions | Baixa | Reutiliza funções existentes de RRF |
| Volume de dados | Alta | 130M de decisões requer ingestão incremental e indexação gradual |

---

## Gap 2 — Verificação de Citações em Tempo Real

### Problema
A Jus IA verifica automaticamente cada citação (artigos de lei, súmulas, portarias) diretamente na base durante o chat e exibe o resultado inline. A Gabi retorna chunks de contexto mas não valida se as citações na resposta gerada existem de fato na base.

### Objetivo
Implementar **citation grounding**: após a resposta do LLM ser gerada, extrair as citações (artigos, súmulas, decisões) do texto, verificar cada uma na base local (`law_chunks`, `regulatory_provisions`, `jurisprudencia_decisions`) e anotar cada citação com status de verificação antes de retornar ao frontend.

---

### Fase 1 — Extrator de Citações

**Novo arquivo:** `api/app/core/citation_checker.py`

**Função `extract_citations(text: str) -> list[Citation]`:**

Regex para capturar os padrões mais comuns no texto de resposta:
- Artigos de lei: `Art\.\s*\d+` com contexto de lei (ex: "Art. 42 do CDC")
- Súmulas: `Súmula\s*(Vinculante\s*)?\d+` + tribunal
- Decisões: número de processo no padrão CNJ (`\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}`)
- Normativos BCB/CMN/CVM: `Resolução\s*(CMN|BCB|CVM)?\s*\d+` + número

Retorna lista de objetos `Citation`:
```python
@dataclass
class Citation:
    raw_text: str        # trecho original ("Art. 42 do CDC")
    citation_type: str   # "artigo", "sumula", "decisao", "normativo"
    number: str          # "42", "385", "0001234-..."
    reference: str       # "CDC", "STJ", "CMN"
    span: tuple[int,int] # posição no texto para annotation inline
```

---

### Fase 2 — Verificador contra a Base

**Na mesma `citation_checker.py`:**

**Função `verify_citations(citations: list[Citation], db: AsyncSession, org_id: str) -> list[VerifiedCitation]`:**

Para cada citação, executa consulta direta ao banco (sem LLM, sem embedding — só SQL):

| Tipo | Tabela alvo | Coluna de match |
|------|------------|-----------------|
| `artigo` | `regulatory_provisions` ou `law_chunks` | `ILIKE '%Art. {number}%'` no `structure_path` |
| `sumula` | `jurisprudencia_decisions` | `ILIKE '%Súmula%{number}%'` na ementa |
| `decisao` | `jurisprudencia_decisions` | `numero_processo = :numero` |
| `normativo` | `regulatory_documents` | `numero = :numero AND authority = :reference` |

Retorna `VerifiedCitation` com campo `status: Literal["verified", "not_found", "partial"]` e `source_url: str | None`.

**Performance:** As queries são simples (índices já existem). Para uma resposta média com 3–6 citações, o tempo adicional é < 50ms.

---

### Fase 3 — Integração no Pipeline de Geração

**Arquivo de referência:** `api/app/core/ai.py` + routers de law

**Ponto de integração:**

A resposta final do LLM é gerada por `generate()` ou `generate_stream()`. O citation grounding ocorre **após** a geração completa (para streaming: após o stream fechar, antes de salvar no banco).

```
Resposta LLM
  → extract_citations(response_text)
  → verify_citations(citations, db, org_id)
  → annotate_response(response_text, verified_citations)
  → retorna {text: str, citations: list[VerifiedCitation]}
```

**Para endpoints de streaming (`generate_stream`):**

O stream SSE continua retornando tokens normalmente. Após o stream terminar, envia um evento SSE final com tipo `"citations"` contendo o JSON de verificação:
```json
data: {"type": "citations", "items": [...]}
```

O frontend recebe esse evento e renderiza os badges de verificação sobre as citações no texto já exibido.

---

### Fase 4 — Representação no Frontend

**Arquivo de referência:** `web/src/` (componentes de chat)

**Dois níveis de display:**

1. **Badge inline:** Cada citação verificada recebe um ícone verde (✓) ou vermelho (✗) imediatamente após o texto da citação.
2. **Painel de fontes:** Footer da mensagem lista todas as citações com status, tipo e link para a fonte quando disponível.

Isso exige um novo componente `CitationBadge` e modificação no componente de renderização de mensagens para suportar o evento SSE `"citations"`.

---

### Complexidade e Riscos

| Item | Complexidade | Risco |
|------|-------------|-------|
| Extrator de regex | Baixa | Falsos negativos em citações com formatação incomum |
| Queries de verificação | Baixa | Reutiliza índices existentes |
| Integração no streaming SSE | Média | Evento adicional após fim do stream; frontend deve tratar |
| Cobertura de citações | Média | Depende da abrangência da base ingerida |

---

## Gap 3 — Previsão de Resultado Processual

### Problema
A Turivius oferece previsão de resultado baseada em histórico decisório (percentual de êxito por tese, relator, órgão julgador). Requer base estatística e modelo preditivo.

### Objetivo
Implementar `gabi.legal/prever-resultado`: dado um caso (tese, tribunal, área, relator se conhecido), retornar probabilidade estimada de êxito com base nas decisões da base e análise LLM.

---

### Fase 1 — Pré-requisito: Jurimetria (Gap 1)

A previsão de resultado é diretamente dependente das tabelas `jurisprudencia_decisions` e `jurimetria_stats` do Gap 1. Sem base estatística não há previsão. **Este gap só pode ser implementado após o Gap 1 estar operacional.**

---

### Fase 2 — Modelo de Previsão

**Abordagem escolhida: híbrida (estatística + LLM)**

Não é necessário um modelo de ML treinado. O pipeline é:

```
1. Input do usuário: {tese, tribunal, area, relator?, orgao_julgador?}
2. Busca semântica em jurisprudencia_decisions com a tese como query
3. Filtros por tribunal + area_direito + data (últimos 3–5 anos)
4. Agregação SQL dos resultados (GROUP BY resultado → contagem)
5. Cálculo de percentuais brutos (pct_provido, pct_negado, pct_parcial)
6. Se relator fornecido: sub-agregação por relator (tendência individual)
7. LLM analisa os top-10 casos mais similares + os percentuais e gera:
   - Avaliação qualitativa ("Tese consolidada", "Divergência nos TRFs", etc.)
   - Fatores de risco identificados nas ementas
   - Recomendação estratégica
8. Resposta final: {pct_estimado_exito, confianca, analise_qualitativa, casos_base: N}
```

**Novo arquivo:** `api/app/services/previsao_service.py`

**Função `prever_resultado()`:**
```python
async def prever_resultado(
    tese: str,
    tribunal: str,
    area_direito: str,
    relator: str | None,
    orgao_julgador: str | None,
    db: AsyncSession,
    anos: int = 5,
) -> dict
```

Retorna:
```json
{
  "pct_estimado_exito": 67.3,
  "confianca": "alta",          // "alta" (>100 casos), "media" (>20), "baixa" (<20)
  "total_casos_base": 143,
  "breakdown": {
    "provido": 67.3,
    "negado": 24.5,
    "parcial": 8.2
  },
  "tendencia_relator": null,    // preenchido se relator fornecido
  "analise_qualitativa": "...",
  "casos_similares": [...]      // top-5 decisões mais próximas
}
```

---

### Fase 3 — Endpoint

**No `api/app/modules/law/router.py`:**

```
POST /api/law/prever-resultado
Body: {tese, tribunal, area_direito, relator?, orgao_julgador?, anos?}
→ retorna dict acima
```

Protegido por autenticação padrão + verificação de módulo `law` habilitado para a org.

---

### Fase 4 — Campo `confianca` e Calibração

A confiança é determinada pelo volume da base:
- `>= 100 casos`: `"alta"`
- `>= 20 casos`: `"media"`
- `< 20 casos`: `"baixa"` (com aviso explícito ao usuário)
- `0 casos`: retorna erro `"Base insuficiente para esta combinação de filtros"`

Isso é especialmente importante para honestidade do produto: não prever com poucos dados.

---

### Complexidade e Riscos

| Item | Complexidade | Risco |
|------|-------------|-------|
| Dependência do Gap 1 | Alta | Não pode ser paralelo |
| Agregação SQL | Baixa | Queries simples com GROUP BY |
| LLM para análise qualitativa | Baixa | Usa `generate_json()` existente |
| Calibração dos percentuais | Média | Precisão depende da qualidade do campo `resultado` |
| Cobertura de tribunais estaduais | Alta | Volume inconsistente por estado |

---

## Gap 4 — Canal WhatsApp

### Problema
O ChatADV atinge 200k+ usuários via WhatsApp. A Gabi não tem canal conversacional mobile além da web.

### Objetivo
Implementar um webhook de entrada para a **WhatsApp Business API (Cloud API da Meta)** que receba mensagens, as roteie para o módulo `gabi.legal` (foco inicial) e retorne a resposta como mensagem de WhatsApp.

---

### Fase 1 — Configuração da Meta WhatsApp Cloud API

Não é um serviço terceiro pago além do custo por mensagem da Meta. O fluxo é:

1. Criar conta no **Meta for Developers** e configurar um App com produto "WhatsApp Business"
2. Obter `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. Armazenar as 3 credenciais no **Secret Manager** (padrão da infraestrutura)
4. Registrar a URL do webhook (`https://api.gabi.app/api/whatsapp/webhook`) no painel da Meta

A Meta exige que o endpoint do webhook responda ao `GET` de verificação e ao `POST` de mensagens (padrão já documentado na API deles).

---

### Fase 2 — Novo Cliente de Envio

**Novo arquivo:** `api/app/services/whatsapp_client.py`

**Segue o mesmo padrão de `bcb_client.py` (httpx + tenacity):**

```python
class WhatsAppClient:
    BASE = "https://graph.facebook.com/v21.0"

    async def send_text(self, to: str, text: str) -> dict
    async def send_typing(self, to: str) -> dict      # indicador de digitando
    async def mark_read(self, message_id: str) -> dict
```

A função `send_text` divide mensagens > 4096 caracteres em múltiplas mensagens (limite da API).

---

### Fase 3 — Webhook Router

**Novo arquivo:** `api/app/modules/whatsapp/router.py`

**Dois endpoints:**

```
GET /api/whatsapp/webhook
  → Verifica token (Meta handshake)
  → Retorna challenge se WHATSAPP_WEBHOOK_VERIFY_TOKEN bater

POST /api/whatsapp/webhook
  → Valida assinatura HMAC-SHA256 do header X-Hub-Signature-256
  → Parseia payload (tipo: text, audio, document)
  → Roteia para handler assíncrono (responde 200 imediatamente para Meta)
  → Handler processa e envia resposta via WhatsAppClient
```

**Importante:** A Meta exige resposta HTTP 200 em < 5 segundos. O processamento real ocorre em background (`asyncio.create_task()`), não bloqueando o ACK.

---

### Fase 4 — Mapeamento de Usuário WhatsApp → Conta Gabi

**Nova tabela (migração):**
```
whatsapp_users
  id           UUID PK
  phone_e164   VARCHAR(20) UNIQUE    -- "+5511999887766"
  user_id      UUID FK users(id) NULLABLE
  org_id       UUID FK organizations(id) NULLABLE
  status       VARCHAR(20)           -- "unverified", "linked", "blocked"
  created_at   TIMESTAMP
  last_seen_at TIMESTAMP
```

**Fluxo de onboarding pelo WhatsApp:**
1. Usuário envia mensagem pela primeira vez
2. Se `phone_e164` não existe em `whatsapp_users`: cria registro `status=unverified`
3. Gabi responde pedindo o e-mail cadastrado
4. Usuário envia e-mail → sistema busca em `users` → cria link `whatsapp_users.user_id`
5. A partir daí, mensagens do número são autenticadas como aquele usuário

**Alternativa de acesso sem conta:** Opção de `status=guest` com acesso limitado (X perguntas/dia). Configurável pelo admin.

---

### Fase 5 — Handler de Mensagem

**Novo arquivo:** `api/app/modules/whatsapp/handler.py`

**Função `handle_incoming(phone: str, text: str, db: AsyncSession)`:**

```
1. Busca/cria whatsapp_users por phone
2. Se unverified: responde com fluxo de vinculação
3. Se linked: carrega user_id + org_id
4. Verifica módulo "law" habilitado para a org
5. Carrega ou cria chat_session para (user_id, "law", "whatsapp")
6. Chama retrieve_if_needed() + generate() (sem streaming — WhatsApp é texto completo)
7. Salva mensagem no chat_sessions/chat_messages
8. Envia resposta via WhatsAppClient.send_text()
9. Registra analytics_event
```

**Limitações explícitas na resposta:**
- WhatsApp não suporta Markdown nativo: converter `**bold**` → `*bold*` e remover headers `##`
- Comprimento: dividir respostas longas (> 4096 chars) em partes com indicação "[1/2]", "[2/2]"

---

### Fase 6 — Suporte a Documentos (opcional, fase posterior)

A Meta Cloud API suporta recebimento de PDFs e imagens. O handler pode ser extendido para:
- Receber `document` (PDF) → baixar da URL da Meta → passar para `process_document()` existente
- Confirmar ingestão ao usuário e perguntar qual análise deseja

---

### Complexidade e Riscos

| Item | Complexidade | Risco |
|------|-------------|-------|
| Configuração Meta Cloud API | Baixa | Processo de aprovação da conta WhatsApp Business |
| Webhook + validação HMAC | Baixa | Segurança padrão documentada pela Meta |
| Mapeamento usuário | Média | Fluxo de vinculação exige UX cuidadosa no chat |
| Handler assíncrono | Baixa | Padrão asyncio.create_task já usado no projeto |
| Conversão Markdown → WhatsApp | Baixa | Regex simples de substituição |
| Rate limiting Meta | Média | 1000 msg/dia no tier gratuito; pago escala normalmente |

---

## Gap 5 — Plano Individual Acessível + Onboarding Self-Service

### Problema
A Jurídico AI (R$99/mês) e a Jus IA (R$9,90/mês) permitem que um advogado se cadastre e comece a usar sem contato com equipe de vendas. A Gabi requer interação manual para onboarding. O sistema de billing é stub (sem processador de pagamento).

### Objetivo
1. Adicionar um plano `individual` na tabela `plans` (R$99/mês, 1 seat, módulos law + ghost, limite de ops)
2. Integrar processador de pagamento (Stripe) para cobrança recorrente
3. Tornar o fluxo de trial → pagante 100% self-service

---

### Fase 1 — Plano Individual no Banco

**Migração `00X_plan_individual.py`:**

```sql
INSERT INTO plans (name, display_name, max_seats, max_ops_month, max_concurrent, price_brl, modules_included)
VALUES ('individual', 'Gabi Individual', 1, 500, 1, 99.00, '{law,ghost}')
```

`modules_included` é um novo campo `TEXT[]` na tabela `plans` para declarar quais módulos estão inclusos no plano. O `org_modules` atual por organização continua sendo o controle real — esse campo apenas informa o onboarding.

---

### Fase 2 — Integração Stripe

**Novo arquivo:** `api/app/services/stripe_client.py`

**Segue padrão dos outros clientes (httpx + tenacity):**

```python
class StripeClient:
    async def create_customer(self, email: str, name: str) -> str         # customer_id
    async def create_checkout_session(
        self,
        customer_id: str,
        plan_name: str,          # mapeia para Price ID do Stripe
        success_url: str,
        cancel_url: str,
    ) -> str                                                               # session_url
    async def get_subscription_status(self, customer_id: str) -> str      # "active", "past_due", "canceled"
    async def cancel_subscription(self, customer_id: str) -> bool
```

**Tabela nova:**
```
billing_subscriptions
  id               UUID PK
  org_id           UUID FK
  stripe_customer  VARCHAR(50) UNIQUE
  stripe_sub_id    VARCHAR(50) UNIQUE
  status           VARCHAR(20)   -- "active", "past_due", "trialing", "canceled"
  plan_name        VARCHAR(50)
  current_period_end TIMESTAMP
  updated_at       TIMESTAMP
```

---

### Fase 3 — Fluxo de Checkout Self-Service

**Endpoints existentes para modificar:** `api/app/modules/org/router.py`

**Fluxo completo:**

```
1. POST /api/orgs/checkout
   Body: {plan_name: "individual"}
   → StripeClient.create_customer(user.email, user.name)
   → Salva stripe_customer em billing_subscriptions
   → StripeClient.create_checkout_session(customer_id, plan, success_url, cancel_url)
   → Retorna {checkout_url: "https://checkout.stripe.com/..."}

2. Usuário completa pagamento no Stripe (fora da Gabi)

3. GET /api/orgs/checkout/success?session_id=...  (success_url)
   → Stripe.retrieve_session(session_id) → verifica status "complete"
   → Cria Organization automaticamente para o usuário (se não tiver)
   → Ativa módulos do plano em org_modules
   → Atualiza billing_subscriptions.status = "active"
   → Redireciona para dashboard

4. POST /api/whatsapp/stripe-webhook  (webhook Stripe)
   → Valida assinatura Stripe-Signature
   → Trata eventos: invoice.paid, invoice.payment_failed, customer.subscription.deleted
   → Atualiza billing_subscriptions e org.is_active conforme evento
```

---

### Fase 4 — Onboarding Self-Service no Frontend

**Fluxo no `web/src/`:**

```
Landing page
  → Botão "Começar grátis" (trial 14 dias)
  → Formulário: e-mail + senha (Firebase createUserWithEmailAndPassword)
  → POST /api/auth/register → cria User + Org (trial, plano free)
  → Redireciona para dashboard com banner "14 dias restantes de trial"

Tela de upgrade (já existe como stub em billing)
  → Lista planos (free, individual R$99, pro, enterprise)
  → Botão "Assinar" chama POST /api/orgs/checkout
  → Redireciona para Stripe Checkout
  → Ao voltar, dashboard atualizado com plano ativo
```

**Banner de trial countdown** já existe no frontend (mencionado na arquitetura). Precisa apenas ser conectado ao endpoint de billing real.

---

### Fase 5 — Portal de Autoatendimento

No `billing` page existente, adicionar:
- Status atual da assinatura (consumido da `billing_subscriptions`)
- Botão "Cancelar assinatura" → `DELETE /api/orgs/subscription` → `StripeClient.cancel_subscription()`
- Histórico de faturas (via `StripeClient.list_invoices()`)
- Botão "Atualizar cartão" → Stripe Customer Portal URL

---

### Complexidade e Riscos

| Item | Complexidade | Risco |
|------|-------------|-------|
| Migração plano individual | Muito baixa | Zero impacto em orgs existentes |
| Integração Stripe | Média | Testes em modo sandbox antes de produção |
| Webhook Stripe (assinatura HMAC) | Baixa | Padrão documentado pelo Stripe |
| Fluxo de checkout | Baixa | Stripe Hosted Checkout elimina complexidade de UI |
| Portal de autoatendimento | Baixa | Stripe Customer Portal é hosted |
| Conformidade com LGPD | Média | Dados de pagamento não ficam na Gabi (ficam no Stripe) — revisar DPA |

---

## Ordem de Implementação Recomendada

| Prioridade | Gap | Razão |
|-----------|-----|-------|
| 1 | **Gap 5 — Plano Individual + Stripe** | Desbloqueador de receita; menor risco técnico; sem dependências |
| 2 | **Gap 2 — Verificação de Citações** | Alto valor percebido; baixa complexidade; melhora retenção |
| 3 | **Gap 1 — Jurimetria (ingestão)** | Base para o Gap 3; pode rodar em paralelo com Gap 2 |
| 4 | **Gap 4 — WhatsApp** | Canal de aquisição; depende apenas do backend de law existente |
| 5 | **Gap 3 — Previsão de Resultado** | Depende de Gap 1 com volume suficiente (mínimo 3 meses de ingestão) |

---

## Impacto no Código Existente

| Arquivo | Tipo de mudança | Impacto |
|---------|----------------|--------|
| `core/dynamic_rag.py` | Adicionar quarta fonte de busca (Gap 1) | Baixo — nova chamada paralela no `asyncio.gather` |
| `core/ai.py` | Adicionar etapa de citation grounding pós-geração (Gap 2) | Baixo — wrapper após `generate()` |
| `services/datajud_client.py` | Expandir TRIBUNAL_ENDPOINTS e adicionar `fetch_all_tribunais()` | Baixo — adição sem quebrar interface |
| `modules/law/router.py` | Novos endpoints de jurimetria e previsão | Nenhum — só adição |
| `modules/org/router.py` | Substituir stub de upgrade por Stripe real | Médio — lógica existente é reescrita |
| `models/` | Novas tabelas (migrations only) | Nenhum — sem alteração em modelos existentes |
| `main.py` | Registrar novo router whatsapp | Mínimo — uma linha |

Nenhuma feature existente é quebrada. Todos os gaps são implementados como extensões aditivas sobre a arquitetura atual.
