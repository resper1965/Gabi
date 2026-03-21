/**
 * Gabi Platform — Documentation Content
 * All user-facing docs in markdown, organized by section.
 * Produced by Ness (ness.com.br)
 */

export const docsContent = {
  overview: `# Plataforma Gabi. — IA Corporativa

A **Gabi.** é uma plataforma de Inteligência Artificial desenvolvida pela **ness.** que reúne **7 agentes de IA especializados** em uma única conversa inteligente para apoiar equipes jurídicas, financeiras, de seguros e de compliance.

---

## Como funciona

Diferente de chatbots genéricos, a Gabi ativa automaticamente o agente certo para cada tarefa:

- **RAG (Retrieval-Augmented Generation)** — a IA busca em seus documentos reais antes de responder, garantindo respostas fundamentadas.
- **Guardrails anti-alucinação** — se a informação não está na base, a IA avisa. Ela **nunca inventa** dados.
- **Memória de conversa** — mantém o contexto ao longo do diálogo para respostas coerentes.
- **Multi-agente** — 7 especialistas trabalham juntos para dar a melhor resposta.

---

## Capacidades

| Área | O que a Gabi faz |
| --- | --- |
| **Auditoria de contratos** | Analisa documentos, identifica riscos e cláusulas críticas |
| **Pesquisa regulatória** | Busca jurisprudência, legislação e regulamentação com citações |
| **Redação inteligente** | Gera pareceres e documentos baseados no estilo do seu escritório |
| **Monitoramento 24/7** | Acompanha prazos, obrigações e alertas regulatórios |
| **Análise de seguros** | Compara apólices, avalia coberturas e compliance ANS/SUSEP |

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

1. Faça login com seu email corporativo
2. Acesse a **Gabi** pelo menu lateral
3. Comece a conversar — a IA seleciona automaticamente o agente adequado

> **Dica:** Use \`Ctrl+Enter\` (ou \`⌘+Enter\` no Mac) para enviar mensagens rapidamente.

---

## Sobre a ness.

A **ness.** é a desenvolvedora e produtora da plataforma Gabi. Para suporte, entre em contato com a equipe de tecnologia.
`,

  modules: {
    agents: `# Os 7 Agentes de IA

A Gabi opera com **7 agentes especializados** que trabalham juntos em uma única conversa. Você não precisa escolher o agente — a plataforma seleciona automaticamente o mais adequado para cada pergunta.

---

## Agentes Jurídicos

| # | Agente | Especialidade |
| --- | --- | --- |
| 1 | **Auditora** | Analisa contratos e documentos, identifica riscos e cláusulas críticas |
| 2 | **Pesquisadora** | Busca jurisprudência, legislação e regulamentação com citações exatas |
| 3 | **Redatora** | Gera pareceres, minutas e documentos no estilo do seu escritório |
| 4 | **Sentinela** | Monitora prazos, obrigações e emite alertas regulatórios |

## Agentes de Seguros

| # | Agente | Especialidade |
| --- | --- | --- |
| 5 | **Anal. Coberturas** | Compara apólices, analisa coberturas e exclusões |
| 6 | **Anal. Sinistralidade** | Loss ratio, PMPM, KPIs atuariais e análise de dados |
| 7 | **Consult. Regulatório** | Normas ANS e SUSEP, compliance de seguros |

---

## Como usar

1. **Faça upload de documentos** — contratos, regulamentos, normas, apólices
2. **Faça upload de planilhas** (XLSX) com dados de sinistralidade
3. **Pergunte em linguagem natural:**

   - \`"Quais são os riscos neste contrato?"\`
   - \`"Redija um parecer sobre esta resolução"\`
   - \`"Qual a taxa de sinistralidade por faixa etária?"\`
   - \`"Quais cláusulas da ANS se aplicam?"\`
   - \`"Busque precedentes sobre fundos imobiliários"\`

---

## Redação baseada em estilos

A Gabi pode absorver o estilo de escrita do seu escritório ou equipe. Envie documentos de referência e ela replica o tom, vocabulário e estrutura nas redações geradas.

---

## Fontes e rastreabilidade

Abaixo de cada resposta, a Gabi mostra as **fontes consultadas** — os documentos reais que fundamentaram a análise. Isso garante rastreabilidade total e conformidade.

---

## Radar Regulatório

O painel **Radar Regulatório** unifica insights de 8 agências (BCB, CMN, CVM, ANS, SUSEP, ANPD, ANEEL, Planalto) em uma única tela com filtros por agência e nível de risco.

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

- Use a **sidebar** para acessar a Gabi
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

Sim. Clique no ícone de **relógio** (Histórico) no header, selecione uma conversa e clique em **"Exportar .md"**. O download será feito como arquivo Markdown.

---

### Qual modelo de IA é usado?

A Gabi utiliza modelos de IA proprietários, otimizados pela **ness.** para cada agente, garantindo o melhor custo-benefício e qualidade.

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
  { id: "agents", label: "Os 7 Agentes", icon: "Users" },
  { id: "shortcuts", label: "Atalhos", icon: "Keyboard" },
  { id: "faq", label: "FAQ", icon: "HelpCircle" },
] as const
