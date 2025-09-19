# Customizações de Estilo ness - Gabi

## 🎨 Princípios das Customizações

### Objetivo
Aplicar o estilo visual da ness aos projetos base (Agent UI, Agno SDK) **sem criar novos componentes** ou modificar a estrutura original. Apenas customizações mínimas de cores, tipografia e pequenos ajustes visuais.

### Abordagem
- **Manter UI Original:** Preservar todos os componentes e funcionalidades existentes
- **Customizações Mínimas:** Apenas cores, tipografia e pequenos ajustes
- **Não Criar Novos Componentes:** Usar apenas o que já existe
- **Foco em Funcionalidades:** Desenvolver funcionalidades que não existem

## 🎨 Paleta de Cores ness

### Cores Principais
```css
:root {
  /* Fundos */
  --ness-bg-primary: #0B0C0E;      /* Fundo principal */
  --ness-bg-secondary: #111317;    /* Superfícies elevadas */
  --ness-bg-tertiary: #151820;     /* Superfícies mais elevadas */
  --ness-bg-quaternary: #1B2030;   /* Superfícies mais altas */
  
  /* Texto */
  --ness-text-primary: #EEF1F6;    /* Texto principal */
  --ness-text-secondary: #B8BCC8;  /* Texto secundário */
  --ness-text-muted: #8B919F;      /* Texto desabilitado */
  
  /* Accent */
  --ness-accent: #00ADE8;          /* Cor de destaque */
  --ness-accent-hover: #0099CC;    /* Hover do accent */
  
  /* Estados */
  --ness-success: #10B981;         /* Sucesso */
  --ness-warning: #F59E0B;         /* Aviso */
  --ness-error: #EF4444;           /* Erro */
  --ness-info: #3B82F6;            /* Informação */
}
```

### Aplicação das Cores
- **Fundo:** Aplicar `--ness-bg-primary` como cor de fundo principal
- **Cards/Superfícies:** Usar `--ness-bg-secondary` e `--ness-bg-tertiary`
- **Texto:** Aplicar `--ness-text-primary` para texto principal
- **Links/Botões:** Usar `--ness-accent` para elementos interativos
- **Ponto ness:** Sempre `#00ADE8` após "ness."

## 🔤 Tipografia

### Fonte Principal
```css
/* Montserrat Medium para títulos e elementos importantes */
.ness-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500; /* Medium */
}

/* Manter fonte original para texto corrido */
.ness-body {
  font-family: inherit; /* Usar fonte original do projeto */
}
```

### Aplicação
- **Títulos:** Aplicar Montserrat Medium
- **Texto Corrido:** Manter fonte original do projeto
- **Wordmark "ness.":** Sempre Montserrat Medium com ponto em `#00ADE8`

## 🎯 Customizações por Projeto

### gabi-chat (Agent UI)

#### 1. Cores de Fundo
```css
/* Aplicar apenas em CSS customizado */
body {
  background-color: var(--ness-bg-primary);
  color: var(--ness-text-primary);
}

/* Cards e superfícies */
.card, .surface {
  background-color: var(--ness-bg-secondary);
  border: 1px solid var(--ness-bg-tertiary);
}
```

#### 2. Botões e Links
```css
/* Botões primários */
.btn-primary {
  background-color: var(--ness-accent);
  color: white;
}

.btn-primary:hover {
  background-color: var(--ness-accent-hover);
}

/* Links */
a {
  color: var(--ness-accent);
}
```

#### 3. Inputs e Formulários
```css
/* Inputs */
input, textarea, select {
  background-color: var(--ness-bg-secondary);
  border: 1px solid var(--ness-bg-tertiary);
  color: var(--ness-text-primary);
}

input:focus, textarea:focus, select:focus {
  border-color: var(--ness-accent);
  box-shadow: 0 0 0 2px rgba(0, 173, 232, 0.2);
}
```

#### 4. Chat Interface
```css
/* Mensagens do usuário */
.user-message {
  background-color: var(--ness-accent);
  color: white;
}

/* Mensagens do assistente */
.assistant-message {
  background-color: var(--ness-bg-secondary);
  color: var(--ness-text-primary);
}

/* Indicador de digitação */
.typing-indicator {
  color: var(--ness-accent);
}
```

### gabi-os (Agno SDK)

#### 1. API Documentation
```css
/* Swagger/OpenAPI docs */
.swagger-ui {
  --swagger-ui-bg: var(--ness-bg-primary);
  --swagger-ui-text: var(--ness-text-primary);
  --swagger-ui-accent: var(--ness-accent);
}
```

#### 2. Logs e Debug
```css
/* Console de logs */
.log-console {
  background-color: var(--ness-bg-primary);
  color: var(--ness-text-primary);
  font-family: 'Monaco', 'Menlo', monospace;
}
```

### gabi-ingest (Agentic RAG)

#### 1. Status Dashboard
```css
/* Dashboard de status */
.status-dashboard {
  background-color: var(--ness-bg-primary);
  color: var(--ness-text-primary);
}

.status-item {
  background-color: var(--ness-bg-secondary);
  border-left: 3px solid var(--ness-accent);
}
```

## 🚫 O que NÃO Fazer

### ❌ Não Criar
- Novos componentes React
- Novas páginas ou rotas
- Novos hooks customizados
- Novos utilitários de UI

### ❌ Não Modificar
- Estrutura de componentes existentes
- Lógica de negócio original
- APIs existentes
- Funcionalidades core

### ❌ Não Adicionar
- Novas dependências de UI
- Bibliotecas de componentes
- Frameworks de styling
- Sistemas de design complexos

## ✅ O que Fazer

### ✅ Customizar Apenas
- Cores via CSS customizado
- Tipografia para títulos
- Pequenos ajustes visuais
- Branding da ness

### ✅ Desenvolver
- Funcionalidades que não existem
- Integrações específicas
- Lógica de negócio do Gabi
- APIs customizadas

### ✅ Manter
- Toda funcionalidade original
- Estrutura de componentes
- Padrões de código
- Arquitetura existente

## 📁 Estrutura de Customizações

```
gabi-chat/
├── src/
│   ├── styles/
│   │   ├── ness-custom.css      # Customizações de estilo
│   │   └── ness-colors.css      # Variáveis de cores
│   └── components/              # Componentes originais (não modificar)
│       ├── ui/                  # shadcn/ui original
│       └── chat/                # Componentes de chat originais
```

```
gabi-os/
├── src/
│   ├── static/
│   │   └── ness-theme.css       # Tema para documentação
│   └── api/                     # APIs originais (não modificar)
```

## 🎨 Exemplos de Customização

### 1. Header com Logo ness
```css
/* Aplicar apenas em CSS customizado */
.header .logo {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  color: var(--ness-text-primary);
}

.header .logo .dot {
  color: var(--ness-accent);
}
```

### 2. Sidebar com Cores ness
```css
/* Aplicar apenas em CSS customizado */
.sidebar {
  background-color: var(--ness-bg-secondary);
  border-right: 1px solid var(--ness-bg-tertiary);
}

.sidebar .nav-item {
  color: var(--ness-text-secondary);
}

.sidebar .nav-item.active {
  color: var(--ness-accent);
  background-color: var(--ness-bg-tertiary);
}
```

### 3. Chat com Estilo ness
```css
/* Aplicar apenas em CSS customizado */
.chat-container {
  background-color: var(--ness-bg-primary);
}

.chat-message.user {
  background-color: var(--ness-accent);
  color: white;
}

.chat-message.assistant {
  background-color: var(--ness-bg-secondary);
  color: var(--ness-text-primary);
}
```

## 🔧 Implementação

### 1. CSS Customizado
- Criar arquivo `ness-custom.css` em cada projeto
- Aplicar apenas customizações de estilo
- Não modificar componentes existentes

### 2. Variáveis CSS
- Definir variáveis de cores ness
- Aplicar via CSS customizado
- Manter compatibilidade com tema original

### 3. Tipografia
- Importar Montserrat apenas para títulos
- Manter fonte original para texto corrido
- Aplicar via CSS customizado

## 📋 Checklist de Customização

### gabi-chat
- [ ] Aplicar paleta de cores ness
- [ ] Configurar tipografia Montserrat para títulos
- [ ] Customizar cores de chat
- [ ] Aplicar estilo em botões e links
- [ ] Manter todos os componentes originais

### gabi-os
- [ ] Customizar documentação da API
- [ ] Aplicar cores ness em logs
- [ ] Manter toda funcionalidade original
- [ ] Preservar APIs existentes

### gabi-ingest
- [ ] Customizar dashboard de status
- [ ] Aplicar cores ness
- [ ] Manter funcionalidade original
- [ ] Preservar processamento de documentos

## 🎯 Resultado Esperado

### Visual
- Interface com cores da ness
- Tipografia Montserrat para títulos
- Ponto "ness." sempre em `#00ADE8`
- Mantém funcionalidade original

### Funcional
- Todas as funcionalidades originais preservadas
- Novas funcionalidades do Gabi implementadas
- Integração com Agno SDK mantida
- Performance original preservada

### Técnico
- Código original não modificado
- Apenas CSS customizado adicionado
- Compatibilidade mantida
- Facilita atualizações dos projetos base
