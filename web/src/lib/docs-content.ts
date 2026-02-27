/**
 * Gabi Platform — Documentation Content
 * All user-facing docs in markdown, organized by section.
 * Produced by Ness (ness.com.br)
 */

export const docsContent = {
  overview: `# Plataforma Gabi — IA Corporativa

A **Gabi** é uma plataforma de Inteligência Artificial desenvolvida pela **ness.** para apoiar equipes jurídicas, financeiras, de seguros e de comunicação com agentes especializados.

---

## Como funciona

Cada módulo combina três princípios:

- **RAG (Retrieval-Augmented Generation)** — a IA busca em seus documentos reais antes de responder, garantindo respostas fundamentadas.
- **Guardrails anti-alucinação** — se a informação não está na base, a IA avisa. Ela **nunca inventa** dados.
- **Memória de conversa** — mantém o contexto ao longo do diálogo para respostas coerentes.

---

## Módulos disponíveis

| Módulo | O que faz |
| --- | --- |
| **gabi.writer** | Ghost writer que absorve seu estilo e escreve por você |
| **gabi.legal** | 4 agentes jurídicos: auditora, pesquisadora, redatora, sentinela |
| **gabi.data** | Converse com bancos de dados em linguagem natural |
| **gabi.care** | Análise de sinistralidade, apólices e normas ANS/SUSEP |

---

## Stack tecnológico

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 15 · React 19 · Tailwind v4 |
| Backend | FastAPI · SQLAlchemy · pgvector |
| IA | Modelos proprietários ness. |
| Auth | Autenticação corporativa |
| Infra | Google Cloud · Região Brasil (São Paulo) |

---

## Primeiros passos

1. Faça login com seu email corporativo (**@ness.com.br**)
2. Escolha um módulo no painel principal
3. Comece a conversar com a IA

> **Dica:** Use \`Ctrl+Enter\` (ou \`⌘+Enter\` no Mac) para enviar mensagens rapidamente.

---

## Sobre a ness.

A **ness.** é a desenvolvedora e produtora da plataforma Gabi. Para suporte, entre em contato com a equipe de tecnologia.
`,

  modules: {
    ghost: `# gabi.writer — Ghost Writer

Sua escritora IA que absorve estilos de escrita e produz textos fiéis ao tom original.

---

## Como usar

### 1. Envie documentos de referência

- Clique no ícone de **engrenagem** no canto superior direito
- Arraste PDFs, DOCX ou TXT com exemplos do estilo desejado
- A IA analisa e extrai a "assinatura de estilo" automaticamente

### 2. Escolha um perfil de escrita

- Cada perfil representa um estilo ou autor diferente
- Troque entre perfis no painel de conhecimento

### 3. Peça para escrever

Exemplos de prompts:

- \`"Escreva um email para o cliente sobre o atraso na entrega"\`
- \`"Redija um post para LinkedIn sobre inovação"\`
- \`"Adapte este texto para tom mais formal"\`

---

## Dicas

- Quanto mais documentos de referência você enviar, mais fiel será o estilo
- Use o **streaming** para ver a resposta em tempo real
- Clique em **Copiar** nos blocos de código para copiar trechos

---

> Desenvolvido por **ness.** — ness.com.br
`,

    law: `# gabi.legal — Auditora Jurídica

Sistema multi-agente com 4 especialistas para análise jurídica corporativa.

---

## Agentes disponíveis

| Agente | Especialidade |
| --- | --- |
| **Auditora** | Analisa documentos e identifica riscos e cláusulas críticas |
| **Pesquisadora** | Busca jurisprudência, legislação e regulamentação |
| **Redatora** | Gera pareceres, minutas e documentos jurídicos |
| **Sentinela** | Monitora prazos, obrigações e alertas regulatórios |

---

## Como usar

1. **Faça upload de documentos legais** — contratos, regulamentos, normas
2. **Pergunte em linguagem natural:**

   - \`"Quais são os riscos neste contrato?"\`
   - \`"Existe cláusula de rescisão antecipada?"\`
   - \`"Redija um parecer sobre esta situação"\`

---

## Fontes e rastreabilidade

Abaixo de cada resposta, a Gabi mostra as **fontes consultadas** — os documentos reais que fundamentaram a análise. Isso garante rastreabilidade total e conformidade.

---

> Desenvolvido por **ness.** — ness.com.br
`,

    ntalk: `# gabi.data — CFO de Dados

Converse com seus bancos de dados usando linguagem natural. A IA traduz para SQL e executa com segurança.

---

## Como conectar

1. Acesse a página do **gabi.data**
2. Registre uma conexão ao banco de dados:
   - Host, porta, banco, usuário e senha
   - A conexão é criptografada e isolada por tenant

---

## Como perguntar

Exemplos de consultas:

- \`"Qual foi o faturamento do mês passado?"\`
- \`"Top 10 clientes por receita em 2024"\`
- \`"Compare vendas Q1 vs Q2 por região"\`

---

## Segurança

| Regra | Detalhe |
| --- | --- |
| Modo leitura | Apenas \`SELECT\` — nunca executa \`DELETE\`, \`UPDATE\` ou \`DROP\` |
| Limite de linhas | 1.000 linhas por consulta |
| Timeout | 30 segundos por query |
| Isolamento | Cada tenant tem conexão separada |

---

> Desenvolvido por **ness.** — ness.com.br
`,

    insightcare: `# gabi.care — Analista de Seguros

Especialista em análise de sinistralidade, apólices e regulamentação ANS/SUSEP.

---

## Como usar

1. **Faça upload de planilhas** (XLSX) com dados de sinistralidade
2. **Faça upload de PDFs** com apólices ou regulamentos
3. **Pergunte:**

   - \`"Qual a taxa de sinistralidade por faixa etária?"\`
   - \`"Compare custos hospitalares vs ambulatoriais"\`
   - \`"Quais cláusulas da ANS se aplicam?"\`

---

## Formatos aceitos

| Formato | Uso |
| --- | --- |
| XLSX | Dados tabulares (sinistros, apólices, financeiro) |
| PDF | Documentos (regulamentos, contratos, apólices) |
| DOCX | Pareceres e relatórios internos |

---

> Desenvolvido por **ness.** — ness.com.br
`,
  },

  shortcuts: `# Atalhos de Teclado

| Atalho | Ação |
| --- | --- |
| \`Ctrl + Enter\` | Enviar mensagem |
| \`Escape\` | Limpar campo de texto |
| \`Ctrl + K\` | Busca rápida (em breve) |

> No Mac, substitua \`Ctrl\` por \`⌘\`.

---

## Navegação

- Use a **sidebar** para trocar entre módulos
- Clique no ícone de **relógio** no header para ver o histórico de conversas
- Clique no **avatar** no rodapé da sidebar para ver suas informações
`,

  faq: `# Perguntas Frequentes

---

### Preciso instalar algo?

Não. A Gabi roda 100% no navegador. Basta acessar o link e fazer login com seu email corporativo.

---

### A IA inventa informações?

Não. A Gabi possui **guardrails anti-alucinação**. Se a informação não está na base de documentos, ela avisa explicitamente. Todas as respostas incluem as fontes consultadas.

---

### Meus dados são seguros?

Sim. Os dados são armazenados em **PostgreSQL** dentro do **Google Cloud** (região São Paulo). A autenticação usa **Firebase** com verificação de domínio, e cada tenant tem **isolamento completo**.

---

### Quais formatos de arquivo posso enviar?

PDF, DOCX, TXT e XLSX (para dados tabulares).

---

### Posso exportar conversas?

Sim. Clique no ícone de **relógio** (Histórico) no header de qualquer módulo, selecione uma conversa e clique em **"Exportar .md"**. O download será feito como arquivo Markdown.

---

### Qual modelo de IA é usado?

A Gabi utiliza modelos de IA proprietários, otimizados pela **ness.** para cada módulo, garantindo o melhor custo-benefício e qualidade.

---

### Existe limite de uso?

Sim. Há um rate limiter de **30 requisições por minuto** por usuário, para garantir estabilidade para todos.

---

### Quem desenvolveu a Gabi?

A plataforma Gabi é desenvolvida e mantida pela **ness.** (ness.com.br). Para suporte técnico, entre em contato com **suporte@ness.com.br**.
`,
}

/** Get docs for a specific module */
export function getModuleDocs(module: string): string {
  return docsContent.modules[module as keyof typeof docsContent.modules] || ""
}

/** Get all section keys for navigation */
export const docsSections = [
  { id: "overview", label: "Visão Geral", icon: "BookOpen" },
  { id: "ghost", label: "gabi.writer", icon: "PenTool" },
  { id: "law", label: "gabi.legal", icon: "Scale" },
  { id: "ntalk", label: "gabi.data", icon: "Database" },
  { id: "insightcare", label: "gabi.care", icon: "ShieldCheck" },
  { id: "shortcuts", label: "Atalhos", icon: "Keyboard" },
  { id: "faq", label: "FAQ", icon: "HelpCircle" },
] as const
