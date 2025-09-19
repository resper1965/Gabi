# Gabi Chat

Interface de chat multi-agentes baseada no Agent UI original, com customizações de estilo ness.

## Características

- 🔗 **Integração AgentOS**: Conecta-se perfeitamente com instâncias AgentOS locais e em produção
- 💬 **Interface de Chat Moderna**: Design limpo com suporte a streaming em tempo real
- 🧩 **Suporte a Tool Calls**: Visualiza chamadas de ferramentas do agente e seus resultados
- 🧠 **Passos de Raciocínio**: Exibe o processo de raciocínio do agente (quando disponível)
- 📚 **Suporte a Referências**: Mostra fontes utilizadas pelo agente
- 🖼️ **Suporte Multi-modal**: Lida com vários tipos de conteúdo incluindo imagens, vídeo e áudio
- 🎨 **UI Customizável**: Construído com Tailwind CSS para fácil estilização
- 🧰 **Stack Moderna**: Next.js, TypeScript, shadcn/ui, Framer Motion e mais

## Customizações ness

- **Paleta de Cores**: Aplicada paleta de cores ness (dark-first)
- **Tipografia**: Montserrat Medium para títulos, mantendo fonte original para texto corrido
- **Branding**: Wordmark "Gabi" com identidade visual ness

## Tecnologias

- Next.js 15.2.3
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Zustand
- React Markdown

## Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Executar em desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Executar em produção
pnpm start
```

## Estrutura

```
src/
├── app/                 # App Router do Next.js
├── components/          # Componentes React
│   ├── chat/           # Componentes específicos do chat
│   └── ui/             # Componentes de UI base
├── hooks/              # Hooks customizados
├── lib/                # Utilitários e helpers
└── store/              # Estado global (Zustand)
```

## Baseado em

Este projeto é um fork customizado do [Agent UI](https://github.com/agno-agi/agent-ui) com:
- Customizações de estilo ness
- Funcionalidades específicas do Gabi
- Integração com o ecossistema Gabi

## Licença

Baseado no Agent UI original. Ver LICENSE para detalhes.