/**
 * Gabi Hub — Docs Content
 * All documentation in markdown, organized by section.
 */

export const docsContent = {
  overview: `# Bem-vindo à Gabi

**Gabi** é uma plataforma de Inteligência Artificial com 4 módulos especializados, cada um projetado para um domínio específico de trabalho.

## Como funciona

Cada módulo combina:
- **RAG (Retrieval-Augmented Generation)** — busca em documentos reais antes de responder
- **Guardrails anti-alucinação** — a IA nunca inventa dados; se não sabe, diz que não sabe
- **Memória de conversa** — mantém contexto ao longo do chat

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js · React 19 · Tailwind v4 |
| Backend | FastAPI · SQLAlchemy + pgvector |
| AI | Google Vertex AI (Gemini) |
| Embeddings | BAAI/bge-m3 (local, custo zero) |
| Auth | Firebase Authentication |
| Infra | Google Cloud Run + Cloud SQL |

## Primeiros passos

1. Faça login com seu email corporativo
2. Escolha um módulo na sidebar
3. Comece a conversar!

> **Dica:** Use \`⌘+Enter\` para enviar mensagens rapidamente.
`,

  modules: {
    ghost: `## gabi.writer — Ghost Writer

Sua escritora IA que absorve estilos de escrita e produz textos fiéis ao tom original.

### Como usar

1. **Faça upload de documentos de referência**
   - Clique no ícone ⚙️ no canto superior direito
   - Arraste PDFs, DOCX ou TXT com exemplos do estilo desejado
   - A IA analisa e extrai a "assinatura de estilo"

2. **Escolha um perfil de escrita**
   - Cada perfil representa um estilo diferente
   - Troque entre perfis no painel de conhecimento

3. **Peça para escrever**
   - \`"Escreva um email para o cliente sobre o atraso na entrega"\`
   - \`"Redija um post para LinkedIn sobre inovação"\`
   - \`"Adapte este texto para tom mais formal"\`

### Dicas

- Quanto mais documentos de referência você enviar, melhor a IA captura o estilo
- Use o **streaming** para ver a resposta sendo gerada em tempo real
- Clique no botão **Copiar** nos blocos de código para copiar trechos
`,

    law: `## gabi.legal — Auditora Jurídica

Sistema multi-agente com 4 especialistas para análise jurídica.

### Agentes disponíveis

| Agente | Função |
| --- | --- |
| **Auditora** | Analisa documentos e identifica riscos |
| **Pesquisadora** | Busca jurisprudência e legislação |
| **Redatora** | Gera pareceres e minutas |
| **Sentinela** | Monitora prazos e obrigações |

### Como usar

1. **Faça upload de documentos legais** (contratos, regulamentos, etc.)
2. **Pergunte em linguagem natural:**
   - \`"Quais são os riscos neste contrato?"\`
   - \`"Existe cláusula de rescisão antecipada?"\`
   - \`"Redija um parecer sobre esta situação"\`

### Fontes RAG

Abaixo de cada resposta, a Gabi mostra as **fontes consultadas** — os documentos reais que fundamentaram a análise. Isso garante rastreabilidade.
`,

    ntalk: `## gabi.data — CFO de Dados

Converse com seus bancos de dados usando linguagem natural. A IA traduz para SQL e executa com segurança.

### Como conectar

1. Acesse a página do gabi.data
2. Registre uma conexão MS SQL Server:
   - Host, porta, banco, usuário e senha
   - A conexão é criptografada e isolada por tenant

### Como perguntar

- \`"Qual foi o faturamento do mês passado?"\`
- \`"Top 10 clientes por receita em 2024"\`
- \`"Compare vendas Q1 vs Q2 por região"\`

### Segurança

- Queries são executadas como **READ-ONLY** (SELECT apenas)
- Limite de 1000 linhas por consulta
- Timeout de 30 segundos
- A IA **nunca** executa DELETE, UPDATE ou DROP
`,

    insightcare: `## gabi.care — Analista de Seguros

Especialista em análise de sinistralidade, apólices e regulamentação ANS/SUSEP.

### Como usar

1. **Faça upload de planilhas** (XLSX) com dados de sinistralidade
2. **Faça upload de PDFs** com apólices ou regulamentos
3. **Pergunte:**
   - \`"Qual a taxa de sinistralidade por faixa etária?"\`
   - \`"Compare custos hospitalares vs ambulatoriais"\`
   - \`"Quais cláusulas da ANS se aplicam?"\`

### Formatos aceitos

| Formato | Uso |
| --- | --- |
| XLSX | Dados tabulares (sinistros, apólices) |
| PDF | Documentos (regulamentos, contratos) |
| DOCX | Pareceres e relatórios |
`,
  },

  shortcuts: `## Atalhos de Teclado

| Atalho | Ação |
| --- | --- |
| \`⌘ + Enter\` | Enviar mensagem |
| \`Escape\` | Limpar campo de texto |
| \`⌘ + K\` | Busca rápida (em breve) |

> No Windows/Linux, substitua \`⌘\` por \`Ctrl\`.
`,

  faq: `## Perguntas Frequentes

### Preciso instalar algo?
Não. A Gabi roda 100% no navegador. Basta acessar e fazer login.

### A IA inventa informações?
Não. A Gabi possui **guardrails anti-alucinação**. Se a informação não está na base de documentos, ela avisa explicitamente. Todas as respostas incluem as fontes consultadas.

### Meus dados são seguros?
Sim. Os dados são armazenados em PostgreSQL dentro do Google Cloud (região São Paulo). A autenticação usa Firebase com verificação de domínio, e cada tenant tem isolamento completo.

### Quais formatos de arquivo posso enviar?
PDF, DOCX, TXT e XLSX (para dados tabulares).

### Posso exportar conversas?
Sim! Clique no ícone 🕒 (Histórico) no header de qualquer módulo, selecione uma conversa e clique em "Exportar .md". O download será feito como arquivo Markdown.

### Qual modelo de IA é usado?
A Gabi usa **Google Gemini** (via Vertex AI), com modelos diferentes por módulo para otimizar custo e qualidade.

### Existe limite de uso?
Sim, há um rate limiter de 30 requisições por minuto por usuário, para garantir estabilidade.
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
