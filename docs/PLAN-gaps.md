# Plano Técnico — Fechamento de Gaps Competitivos

> **Status:** Planejamento — nenhuma alteração aplicada ao código
> **Referência:** `docs/competitive-analysis.md`
> **Data:** março 2026 (revisado)
>
> **Decisões de escopo:**
> - ✅ Gap 1 revisado: integrar API Jusbrasil Soluções em vez de construir base própria
> - ❌ Gap 4 (WhatsApp) descartado — não agrega valor diferencial à solução

---

## Índice

1. [Integração Jusbrasil Soluções API](#gap-1--integração-jusbrasil-soluções-api)
2. [Verificação de Citações em Tempo Real](#gap-2--verificação-de-citações-em-tempo-real)
3. [Previsão de Resultado Processual](#gap-3--previsão-de-resultado-processual)
4. [Plano Individual Acessível + Onboarding Self-Service](#gap-4--plano-individual-acessível--onboarding-self-service)

---

## Gap 1 — Integração Jusbrasil Soluções API

### Decisão estratégica

Em vez de construir e manter um pipeline próprio de ingestão de jurisprudência (scraping DataJud em escala), a Gabi consome a **API comercial do Jusbrasil Soluções** (`op.digesto.com.br`), que entrega:

- 280M+ processos coletados, estruturados e normalizados
- 10M+ processos atualizados por dia
- Todos os tribunais do Brasil
- Busca em Diários Oficiais (Elasticsearch nativo)
- Monitoramento de processos por número CNJ, CPF/CNPJ, OAB
- Notificações e intimações via webhook assíncrono

Isso elimina o custo de infraestrutura de ingestão, deduplica manutenção e transforma a Gabi em uma **camada de IA sobre um acervo já resolvido**, que é o posicionamento correto.

---

### Superfície da API (op.digesto.com.br)

| Endpoint | Método | Função |
|----------|--------|--------|
| `/api/proc` | GET | Lista processos monitorados (paginado, `X-Total-Count`) |
| `/api/monitoramento/proc` | POST | Registra processo para monitoramento por número CNJ |
| `/api/monitoramento/oab/acompanhamento/` | POST | Monitora todos os processos de um advogado por OAB |
| `/api/monitoramento/oab/vinculos/processos/cnj` | GET | Busca processo por número CNJ (`?numero_cnj=...`) |
| `/api/monitoramento/oab/vinculos/processos/oab` | GET | Busca processos de uma OAB (`?correlation_id=...`) |
| `/api/diarios-oficiais/doc/buscar` | POST | Busca full-text em Diários Oficiais (body: query Elasticsearch) |
| `/api/diarios-oficiais/fontes_recortes` | GET | Lista fontes com recortes judiciais estruturados |
| `/api/diario/fontes_termos` | GET | Lista fontes monitoráveis por termo livre |
| `/api/legal-deadlines/notificacoes` | GET | Lista intimações e audiências |

**Autenticação:** Bearer Token em `Authorization: Bearer <token>`
**Encoding:** JSON / UTF-8 em todas as chamadas
**Paginação:** query params `page` + `per_page` (máx 2048); headers de resposta `X-Total-Count` e `Link` (padrão GitHub)
**Filtros:** param `where` como JSON (ex: `{"is_monitored_diario": true}`); `sort` como JSON
**Webhook (assíncrono):** Jusbrasil chama URL configurada pelo cliente a cada nova movimentação detectada

---

### Fase 1 — JusbrasilClient

**Novo arquivo:** `api/app/services/jusbrasil_client.py`

Segue exatamente o mesmo padrão do `bcb_client.py` (httpx + tenacity):

```python
class JusbrasilClient:
    BASE = "https://op.digesto.com.br/api"

    def __init__(self):
        token = os.getenv("JUSBRASIL_API_TOKEN")  # do Secret Manager
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        self.timeout = httpx.Timeout(30)

    # Processo por número CNJ
    async def get_processo(self, numero_cnj: str) -> dict | None

    # Busca em Diários Oficiais (Elasticsearch-style)
    async def search_dou(self, query: str, size: int = 10, from_: int = 0) -> list[dict]

    # Lista processos de um advogado (OAB)
    async def get_processos_oab(
        self, numero: int, regiao: str, page: int = 1, per_page: int = 50
    ) -> dict  # {"items": [...], "total": int}

    # Registra processo para monitoramento
    async def register_monitoramento(
        self, numero_cnj: str, monitorar_diario: bool = True, monitorar_tribunal: bool = True
    ) -> dict

    # Lista processos monitorados
    async def list_processos(self, page: int = 1, per_page: int = 30) -> dict
```

**Configuração no Secret Manager:**
- Adicionar `JUSBRASIL_API_TOKEN` como segredo no Cloud Secret Manager (mesmo padrão de `DATAJUD_API_KEY`)
- O `main.py` já tem startup checks — incluir verificação de presença do novo segredo no lifespan

**Retry:**
Mesmo decorator `@retry(wait=wait_exponential(...), stop=stop_after_attempt(3), retry=...)` aplicado a cada método público, idêntico ao padrão existente.

---

### Fase 2 — Integração no Pipeline RAG

**Arquivo de referência:** `api/app/core/dynamic_rag.py`

O pipeline RAG atual tem 3 fontes paralelas (A: vector semântico, B: lexical TSVECTOR, C: provisions vector). A integração Jusbrasil adiciona **duas novas fontes opcionais** que disparam condicionalmente:

#### Fonte D — Lookup de Processo por Número CNJ

Quando a `refined_query` contém um número no padrão CNJ (`\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}`), antes do RRF executa-se:

```python
numero_cnj = extract_cnj_number(refined_query)
if numero_cnj:
    processo = await jusbrasil.get_processo(numero_cnj)
    if processo:
        chunks_d = [{"id": numero_cnj, "content": format_processo(processo), "title": numero_cnj, "source": "jusbrasil"}]
```

O resultado é incluído no RRF com peso equivalente às outras fontes. Por ser um hit exato (o usuário citou o número), este chunk quase sempre fica no topo após fusão.

**`extract_cnj_number(text)`** — função utilitária em `core/rag_components.py`:
```python
_CNJ_PATTERN = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")
def extract_cnj_number(text: str) -> str | None:
    m = _CNJ_PATTERN.search(text)
    return m.group(0) if m else None
```

#### Fonte E — Busca em Diários Oficiais

Quando `module="law"` e a intent classifier retorna `needs_rag=True`, executa em paralelo com as fontes A/B/C:

```python
dou_results = await jusbrasil.search_dou(refined_query, size=5)
chunks_e = [{"id": r["id"], "content": r["texto"], "title": r["titulo"], "source": "dou"} for r in dou_results]
```

Esses chunks entram no RRF. Como o DOU usa Elasticsearch nativo (BM25), a qualidade de busca textual é alta e complementa o vector search local.

**Paralelismo:** As chamadas às novas fontes D e E entram no mesmo `asyncio.gather()` do `retrieve_if_needed()`, sem bloquear o pipeline existente. Se a chamada Jusbrasil falhar (timeout, 401, 5xx), o `asyncio.gather(return_exceptions=True)` captura o erro e o RRF simplesmente opera com as fontes A/B/C disponíveis — degradação graciosa sem impacto na resposta.

---

### Fase 3 — Monitoramento de Processos (Feature Nova)

Este é o diferencial mais imediato para departamentos jurídicos: **alertas automáticos de movimentação processual**.

**Fluxo:**

```
1. Usuário no gabi.legal clica "Monitorar processo"
2. Informa número CNJ
3. POST /api/law/processos/monitorar → chama jusbrasil.register_monitoramento()
4. Jusbrasil confirma registro (resposta ~imediata)
5. Gabi persiste na tabela process_monitors (ver abaixo)
6. Quando há movimentação: Jusbrasil chama POST /api/webhooks/jusbrasil
7. Gabi recebe, processa, cria RegulatoryAlert ou notificação para o usuário
```

**Nova tabela (migração):**

```sql
CREATE TABLE process_monitors (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES organizations(id),
    user_id      TEXT NOT NULL,
    numero_cnj   VARCHAR(50) NOT NULL,
    titulo       VARCHAR(255),
    jusbrasil_id VARCHAR(100),           -- ID retornado pelo Jusbrasil
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE (org_id, numero_cnj)
);

CREATE TABLE process_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_id      UUID NOT NULL REFERENCES process_monitors(id),
    evento_tipo     VARCHAR(100),        -- "movimentacao", "publicacao_dou", "audiencia"
    descricao       TEXT,
    data_evento     DATE,
    raw_payload     JSONB,
    notificado_at   TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

**Novos endpoints** em `api/app/modules/law/router.py`:

```
POST /api/law/processos/monitorar
  Body: {numero_cnj, titulo?}
  → registra no Jusbrasil + persiste process_monitors
  → retorna {id, numero_cnj, status: "active"}

GET /api/law/processos/monitorados
  → lista process_monitors da org com último evento

DELETE /api/law/processos/{id}/monitorar
  → desativa monitoramento

POST /api/webhooks/jusbrasil          ← receptor do webhook Jusbrasil
  Headers: validação de IP allowlist ou HMAC
  → persiste em process_events
  → notifica usuário (email ou banner na UI)
```

**Webhook Jusbrasil:**
O Jusbrasil chama a URL configurada em janelas de 3 minutos, 24/7. O endpoint precisa responder 200 em < 5s. O processamento real (persistir evento, notificar) ocorre em `asyncio.create_task()` — mesmo padrão do processamento de analytics já existente em `core/analytics.py`.

---

### Fase 4 — Monitoramento de Advogados por OAB (opcional, fase posterior)

Para escritórios que queiram acompanhar toda a carteira de um advogado:

```
POST /api/law/advogados/monitorar
  Body: {nome, numero_oab, regiao}
  → chama jusbrasil.get processos_oab para listar
  → registra todos via register_monitoramento em batch
```

Útil para onboarding de escritórios com carteira ativa.

---

### Complexidade e Riscos

| Item | Complexidade | Risco |
|------|-------------|-------|
| `JusbrasilClient` | Baixa — padrão BCBClient | Rate limits da API (verificar contrato) |
| Integração no RAG (fontes D e E) | Baixa — novo `asyncio.gather` opcional | Latência adicional (~100–300ms); mitigada por timeout curto (5s) |
| Tabelas process_monitors / events | Baixa — nova migração | Nenhum — tabelas aditivas |
| Webhook receptor | Baixa | Validação de origem (IP allowlist ou HMAC do Jusbrasil) |
| Custo da API | Médio | Modelo por volume de consultas — dimensionar por plano da org |
| **Dependência de terceiro** | **Alta** | SLA, rotação de token, mudanças de endpoint pela Jusbrasil; mitigar com Circuit Breaker já existente |

**Mitigação do risco de dependência:** O Circuit Breaker em `core/circuit_breaker.py` já existe para Vertex AI. Aplicar o mesmo padrão ao `JusbrasilClient`. Se abrir, o RAG opera apenas com fontes locais (A/B/C) sem degradar a experiência base.

---

## Gap 2 — Verificação de Citações em Tempo Real

### Problema
A Jus IA verifica automaticamente cada citação inline no chat. A Gabi retorna chunks de contexto mas não valida se as citações na resposta gerada existem de fato.

### Objetivo
Após geração do LLM, extrair citações do texto e verificar cada uma — usando a base local para artigos/normativos e a **API Jusbrasil** para números de processo CNJ. Anotar o resultado antes de retornar ao frontend.

---

### Fase 1 — Extrator de Citações

**Novo arquivo:** `api/app/core/citation_checker.py`

**Função `extract_citations(text: str) -> list[Citation]`** com regex para os padrões presentes em texto jurídico:

| Padrão | Regex | Tipo |
|--------|-------|------|
| Artigos de lei | `Art\.?\s*\d+[\w]*` + contexto (CDC, CF, CLT...) | `artigo` |
| Súmulas | `Súmula\s*(Vinculante\s*)?\d+` | `sumula` |
| Processo CNJ | `\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}` | `decisao` |
| Normativos BCB/CMN | `Resolução\s*(CMN\|BCB)?\s*n?º?\s*\d+` | `normativo` |
| Normativos CVM | `Instrução\s*CVM\s*n?º?\s*\d+` | `normativo` |

Dataclass de saída:

```python
@dataclass
class Citation:
    raw_text: str
    citation_type: str   # "artigo", "sumula", "decisao", "normativo"
    number: str
    reference: str       # "CDC", "STJ", "CMN", etc.
    span: tuple[int, int]
```

---

### Fase 2 — Verificador Híbrido (local + Jusbrasil)

**Função `verify_citations(citations, db, jusbrasil_client) -> list[VerifiedCitation]`**

Cada tipo de citação tem sua fonte de verificação:

| Tipo | Fonte | Método |
|------|-------|--------|
| `artigo` | Base local (`regulatory_provisions`, `law_chunks`) | `WHERE structure_path ILIKE '%Art. {number}%'` |
| `sumula` | Base local (`law_chunks`) | FTS: `to_tsquery('Súmula {number}')` |
| `decisao` (número CNJ) | **API Jusbrasil** | `jusbrasil.get_processo(numero_cnj)` |
| `normativo` | Base local (`regulatory_documents`) | `WHERE numero = :number AND authority = :ref` |

Resultado por citação:

```python
@dataclass
class VerifiedCitation:
    citation: Citation
    status: Literal["verified", "not_found", "partial"]
    source_url: str | None
    summary: str | None   # snippet da fonte (para processos: classe + assunto)
```

**Performance:**
- Tipos locais: queries simples com índices existentes, < 20ms cada
- Tipo `decisao` via Jusbrasil: chamada HTTP, ~100–300ms, cacheada por `numero_cnj` (LRU in-process, TTL 1h)

---

### Fase 3 — Integração no Pipeline

**Ponto de integração:** pós-geração, pré-persistência no banco.

Para endpoints **não-streaming**: verificação síncrona antes de retornar a resposta.

Para endpoints **streaming** (`generate_stream`): tokens fluem normalmente → após stream fechar → evento SSE final com tipo `"citations"`:

```json
data: {"type": "citations", "items": [
  {"raw": "Art. 5º da LGPD", "status": "verified", "url": "..."},
  {"raw": "0001234-56.2023.8.26.0000", "status": "verified", "summary": "REsp - LGPD - provido"},
  {"raw": "Súmula 385 STJ", "status": "not_found"}
]}
```

O frontend já recebe o stream e deve tratar este evento final para renderizar os badges.

---

### Fase 4 — Display no Frontend

**Componentes novos em `web/src/`:**

- `CitationBadge`: ícone ✓ (verde) / ✗ (vermelho) / ? (amarelo = `partial`) inline após o texto da citação
- `CitationsPanel`: footer colapsável na mensagem listando todas as citações com status, tipo e link

Requer modificação no componente de renderização de mensagens para consumir o evento SSE `"citations"` e enriquecer o texto já exibido com os badges.

---

### Complexidade e Riscos

| Item | Complexidade | Risco |
|------|-------------|-------|
| Regex de extração | Baixa | Falsos negativos em formatações incomuns — complementar com testes de snapshot |
| Verificação local (SQL) | Baixa | Queries simples com índices existentes |
| Verificação via Jusbrasil | Baixa | Latência de rede; mitigada por cache LRU + timeout de 5s |
| Evento SSE adicional | Média | Frontend precisa tratar o evento `"citations"` sem quebrar fluxo atual |

---

## Gap 3 — Previsão de Resultado Processual

### Problema
A Turivius oferece previsão de resultado baseada em histórico decisório. A Gabi não tem esse dado.

### Revisão do Approach com Jusbrasil

A **API Jusbrasil não expõe agregados estatísticos** (percentual de êxito por tese/relator). Ela provê acesso a processos individuais e monitoramento. Construir jurimetria estatística sobre ela exige acumular dados ao longo do tempo nos processos monitorados — o que demora meses para ter volume.

**Approach revisado:** feature de **análise qualitativa de tendência** com dados disponíveis, sem prometer percentuais que não têm base.

---

### Fase 1 — Pré-requisito

Ter pelo menos 60 dias de dados acumulados em `process_events` (resultante do Gap 1 Fase 3). Sem esse histórico, a feature não pode ser ativada.

---

### Fase 2 — Análise de Tendência via DOU + Decisões Monitoradas

**Novo arquivo:** `api/app/services/tendencia_service.py`

**Função `analisar_tendencia(tese, tribunal, area, db, jusbrasil)`:**

```
1. Busca no DOU via jusbrasil.search_dou(tese, size=20)
   → encontra publicações recentes sobre o tema

2. Busca em process_events acumulados na org filtrados por termos da tese
   → extrai padrões de movimentação

3. Busca semântica local em law_chunks (base da org) sobre a tese
   → recupera documentos internos relevantes

4. LLM (Gemini Pro) analisa os 3 contextos e gera:
   - Panorama atual da jurisprudência (com base nas fontes DOU)
   - Fatores de risco identificados
   - Recomendação estratégica
   - Caveata explícita: "análise qualitativa, não estatística"

5. Retorna {panorama, fatores_risco, recomendacao, fontes, aviso_metodologico}
```

**Distinção importante vs. Turivius:**
O resultado **não afirma probabilidade percentual**. Diz "tendência favorável / desfavorável / divergente com base em N publicações recentes e documentos da base". Isso é honesto com o volume de dados disponível e ainda gera valor real.

---

### Fase 3 — Endpoint

```
POST /api/law/analisar-tendencia
  Body: {tese, tribunal?, area_direito?}
  → retorna análise qualitativa estruturada
  Protected: módulo "law" + plano pro/enterprise (não disponível no plano individual)
```

---

### Quando ativar

Feature liberada somente quando `process_events` da org tiver > 50 registros — caso contrário, retorna `{"disponivel": false, "motivo": "Acumule histórico processual para habilitar análise"}`.

---

### Complexidade e Riscos

| Item | Complexidade | Risco |
|------|-------------|-------|
| Depende de dados acumulados | Alta (temporal) | Feature fica inativa nos primeiros meses |
| DOU search via Jusbrasil | Baixa | Mesmo risco de dependência do Gap 1 |
| Análise LLM qualitativa | Baixa | Custo de tokens (Gemini Pro); usar apenas sob demanda |
| Comunicação de limitações | Média | Crítico para não gerar expectativa incorreta vs. Turivius |

---

## Gap 4 — Plano Individual Acessível + Onboarding Self-Service

### Problema
Jurídico AI (R$99/mês) e Jus IA (R$9,90/mês) permitem cadastro e uso sem vendas. A Gabi não tem fluxo self-service nem processador de pagamento.

---

### Fase 1 — Plano Individual no Banco

**Nova migração:**

```sql
INSERT INTO plans (name, display_name, max_seats, max_ops_month, max_concurrent, price_brl)
VALUES ('individual', 'Gabi Individual', 1, 500, 1, 99.00);
```

Novo campo `modules_included TEXT[]` na tabela `plans` (array de módulos habilitados por padrão no plano). Para `individual`: `{law, ghost}`. O controle real continua sendo `org_modules`.

---

### Fase 2 — Integração Stripe

**Novo arquivo:** `api/app/services/stripe_client.py`

Segue padrão httpx + tenacity:

```python
class StripeClient:
    BASE = "https://api.stripe.com/v1"

    async def create_customer(self, email: str, name: str) -> str
    async def create_checkout_session(
        self,
        customer_id: str,
        price_id: str,        # Price ID do produto no Stripe
        success_url: str,
        cancel_url: str,
    ) -> str                  # URL do Stripe Hosted Checkout

    async def get_subscription_status(self, customer_id: str) -> str
    async def cancel_subscription(self, subscription_id: str) -> bool
    async def create_customer_portal_session(self, customer_id: str, return_url: str) -> str
```

**Nova tabela:**

```sql
CREATE TABLE billing_subscriptions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id               UUID NOT NULL REFERENCES organizations(id),
    stripe_customer_id   VARCHAR(50) UNIQUE,
    stripe_subscription_id VARCHAR(50) UNIQUE,
    status               VARCHAR(20),  -- "active", "past_due", "trialing", "canceled"
    plan_name            VARCHAR(50),
    current_period_end   TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT NOW()
);
```

**Credenciais no Secret Manager:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (para validar assinatura dos webhooks Stripe)

---

### Fase 3 — Fluxo de Checkout Self-Service

**Endpoints em `api/app/modules/org/router.py`** (substituem o stub atual de `/upgrade`):

```
POST /api/orgs/checkout
  Body: {plan_name: "individual"}
  1. stripe.create_customer(user.email, user.name) → customer_id
  2. Persiste em billing_subscriptions (status: "pending")
  3. stripe.create_checkout_session(customer_id, price_id, success_url, cancel_url)
  4. Retorna {checkout_url: "https://checkout.stripe.com/..."}
  ← usuário vai para o Stripe Hosted Checkout (Gabi não toca dados de cartão)

GET /api/orgs/checkout/success?session_id=cs_...
  1. Verifica session com Stripe API (status: "complete")
  2. Cria Org automaticamente se user não tiver (plano individual)
  3. Ativa módulos do plano em org_modules
  4. Atualiza billing_subscriptions.status = "active"
  5. Redireciona para /dashboard

POST /api/webhooks/stripe
  Header: Stripe-Signature (validar com STRIPE_WEBHOOK_SECRET + stripe.webhook.construct_event)
  Eventos tratados:
    - invoice.paid           → status "active", atualiza current_period_end
    - invoice.payment_failed → status "past_due", envia e-mail de aviso
    - customer.subscription.deleted → status "canceled", desativa org

GET /api/orgs/billing
  → billing_subscriptions da org (plano, status, próxima cobrança)
  → substitui o stub atual

POST /api/orgs/portal
  → stripe.create_customer_portal_session() → URL do Stripe Customer Portal
  → usuário gerencia cartão, faturas e cancelamento no portal Stripe
```

---

### Fase 4 — Onboarding Self-Service no Frontend

**Fluxo no `web/src/`:**

```
Landing → "Começar grátis" (trial 14 dias)
  → Formulário: e-mail + senha
  → Firebase createUserWithEmailAndPassword
  → POST /api/auth/register (já existe) → cria User + Org (plano trial)
  → Dashboard com banner "X dias restantes de trial"

Banner de trial → "Assinar agora"
  → Seleciona plano (individual / pro / enterprise)
  → POST /api/orgs/checkout → redireciona para Stripe Checkout
  → Retorno: GET /api/orgs/checkout/success → dashboard atualizado

Billing page (já existe como stub)
  → Status real da assinatura (de billing_subscriptions)
  → Botão "Gerenciar assinatura" → POST /api/orgs/portal → Stripe Customer Portal
```

---

### Fase 5 — Validação de Acesso por Plano

O middleware atual verifica `org_modules` e limites de `plans`. Com billing real, adicionar verificação de `billing_subscriptions.status`:

```python
# Em middleware ou no início dos handlers protegidos:
if sub.status not in ("active", "trialing"):
    raise HTTPException(402, "Assinatura inativa. Acesse /billing para regularizar.")
```

---

### Complexidade e Riscos

| Item | Complexidade | Risco |
|------|-------------|-------|
| Migração plano individual | Muito baixa | Zero impacto em orgs existentes |
| Stripe Hosted Checkout | Baixa | Stripe gerencia UI de pagamento; Gabi só redireciona |
| Webhook Stripe (HMAC) | Baixa | Padrão documentado, biblioteca oficial disponível |
| Middleware de status de assinatura | Baixa | Verificação adicional no início dos handlers |
| Conformidade LGPD | Média | Dados de pagamento ficam no Stripe (DPA disponível); revisar contrato |

---

## Ordem de Implementação

| Prioridade | Gap | Razão |
|-----------|-----|-------|
| 1 | **Gap 4 — Stripe + Self-service** | Desbloqueador de receita imediato; sem dependências externas além do Stripe |
| 2 | **Gap 1 Fases 1–2 — JusbrasilClient + RAG** | Fundação para todo o resto; melhora RAG sem nenhuma migração de banco |
| 3 | **Gap 2 — Verificação de Citações** | Alto impacto percebido; usa Jusbrasil (já integrado) + base local |
| 4 | **Gap 1 Fase 3 — Monitoramento de Processos** | Feature nova de alto valor para enterprise; requer Gap 1 Fase 1 |
| 5 | **Gap 3 — Análise de Tendência** | Requer dados acumulados do monitoramento; implementar mas ativar só após 60 dias |

---

## Impacto no Código Existente

| Arquivo/Componente | Tipo de mudança | Impacto |
|-------------------|----------------|--------|
| `core/dynamic_rag.py` | Adicionar fontes D e E no `asyncio.gather` | Baixo — nova branch condicional |
| `core/rag_components.py` | Adicionar `extract_cnj_number()` | Mínimo — função nova |
| `modules/law/router.py` | Novos endpoints de monitoramento e tendência | Nenhum sobre endpoints existentes |
| `modules/org/router.py` | Substituir stub `/upgrade` por Stripe real | Médio — lógica de billing reescrita |
| `main.py` | Registrar webhook routes (Jusbrasil + Stripe) | Mínimo — 2 linhas |
| **Novos arquivos** | `jusbrasil_client.py`, `stripe_client.py`, `citation_checker.py`, `tendencia_service.py` | Aditivos — zero impacto em código existente |
| **Novas migrações** | `process_monitors`, `process_events`, `billing_subscriptions`, campo `plans.modules_included` | Aditivas — sem alteração em tabelas existentes |

Nenhum endpoint ou modelo existente é alterado. Todos os gaps são extensões aditivas.
