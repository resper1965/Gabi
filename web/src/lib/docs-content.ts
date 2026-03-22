/**
 * Gabi Platform — Documentation Content
 * All user-facing docs in markdown, organized by section.
 * Produced by Ness (ness.com.br)
 */

export const docsContent = {
  overview: `# Plataforma Gabi — IA Corporativa

A **Gabi** é uma plataforma de Inteligência Artificial desenvolvida pela **ness.** que reúne **7 agentes de IA especializados** para apoiar equipes jurídicas, financeiras, de seguros e de compliance.

---

## Como funciona

Diferente de chatbots genéricos, a Gabi ativa automaticamente o agente certo para cada tarefa:

- **Busca nos seus documentos** — a IA consulta seus arquivos reais antes de responder, garantindo respostas fundamentadas.
- **Proteção contra erros** — se a informação não está na base, a IA avisa. Ela **nunca inventa** dados.
- **Memória de conversa** — mantém o contexto ao longo do diálogo.
- **Multi-agente** — 7 especialistas trabalham juntos para a melhor resposta.

---

## O que a Gabi faz

| Área | Capacidade |
| --- | --- |
| **Auditoria de contratos** | Analisa documentos, identifica riscos e cláusulas críticas |
| **Pesquisa regulatória** | Busca jurisprudência, legislação e regulamentação com citações |
| **Redação inteligente** | Gera pareceres e documentos no estilo do seu escritório |
| **Monitoramento 24/7** | Acompanha prazos, obrigações e alertas regulatórios |
| **Análise de seguros** | Compara apólices, avalia coberturas e compliance ANS/SUSEP |

---

## Primeiros passos

1. Faça login com seu email corporativo
2. Acesse a **Gabi** pelo menu inferior
3. Comece a conversar — a IA seleciona automaticamente o agente adequado

> **Dica:** Use \`Ctrl+Enter\` (ou \`⌘+Enter\` no Mac) para enviar mensagens rapidamente.

---

## Sobre a ness.

A **ness.** é a desenvolvedora e produtora da plataforma Gabi. Para suporte, entre em contato com **suporte@ness.com.br**.
`,

  modules: {
    gabi: `## Seus 7 Agentes de IA

A Gabi tem **7 agentes especializados** que trabalham juntos. Você não precisa escolher — a plataforma seleciona automaticamente o mais adequado.

---

### Agentes Jurídicos

| Agente | O que faz |
| --- | --- |
| **Auditora** | Analisa contratos, identifica riscos e cláusulas críticas |
| **Pesquisadora** | Busca legislação e jurisprudência com citações |
| **Redatora** | Gera pareceres e documentos no estilo do seu escritório |
| **Sentinela** | Monitora prazos e emite alertas regulatórios |

### Agentes de Seguros

| Agente | O que faz |
| --- | --- |
| **Anal. Coberturas** | Compara apólices e analisa coberturas |
| **Anal. Sinistralidade** | Análise de dados, KPIs e loss ratio |
| **Consult. Regulatório** | Normas ANS e SUSEP, compliance |

---

### Como usar

1. **Envie documentos** — contratos, regulamentos, apólices ou planilhas
2. **Pergunte em linguagem natural** — exemplo: *"Quais são os riscos neste contrato?"*
3. **Veja as fontes** — cada resposta mostra os documentos consultados

---

### Radar Regulatório

O painel **Radar Regulatório** mostra as últimas atualizações de 8 agências (BCB, CMN, CVM, ANS, SUSEP, ANPD, ANEEL, Planalto) com filtros por agência e nível de risco.
`,
    agents: `## Seus 7 Agentes de IA

A Gabi tem **7 agentes especializados** que trabalham juntos. Você não precisa escolher — a plataforma seleciona automaticamente o mais adequado.

---

### Agentes Jurídicos

| Agente | O que faz |
| --- | --- |
| **Auditora** | Analisa contratos, identifica riscos e cláusulas críticas |
| **Pesquisadora** | Busca legislação e jurisprudência com citações |
| **Redatora** | Gera pareceres e documentos no estilo do seu escritório |
| **Sentinela** | Monitora prazos e emite alertas regulatórios |

### Agentes de Seguros

| Agente | O que faz |
| --- | --- |
| **Anal. Coberturas** | Compara apólices e analisa coberturas |
| **Anal. Sinistralidade** | Análise de dados, KPIs e loss ratio |
| **Consult. Regulatório** | Normas ANS e SUSEP, compliance |

---

### Como usar

1. **Envie documentos** — contratos, regulamentos, apólices ou planilhas
2. **Pergunte em linguagem natural** — exemplo: *"Quais são os riscos neste contrato?"*
3. **Veja as fontes** — cada resposta mostra os documentos consultados
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

Não. A Gabi possui mecanismos de proteção. Se a informação não está nos seus documentos, ela avisa explicitamente. Todas as respostas incluem as fontes consultadas.

---

### Meus dados são seguros?

Sim. Todos os dados ficam em servidores no **Brasil (São Paulo)**, com autenticação corporativa, isolamento por empresa e criptografia.

---

### Quais formatos de arquivo posso enviar?

PDF, DOCX, TXT e XLSX (para dados tabulares).

---

### Posso exportar conversas?

Sim. No ícone de **relógio** (Histórico), selecione uma conversa e clique em **"Exportar .md"**.

---

### Existe limite de uso?

Sim. Há um limite de **30 perguntas por minuto** por usuário, para garantir estabilidade.

---

### Quem desenvolveu a Gabi?

A **ness.** (ness.com.br). Para suporte: **suporte@ness.com.br**.
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
