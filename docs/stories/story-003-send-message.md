# Story 003: Send Message

## Informações Básicas
- **ID:** STORY-003
- **Título:** Send Message
- **Tipo:** Feature
- **Prioridade:** High
- **Estimativa:** 13 story points
- **Sprint:** 2

## Descrição
Como um usuário autenticado, eu quero poder enviar mensagens para meus agentes e receber respostas em tempo real para ter conversas fluidas e interativas.

## Critérios de Aceitação

### Cenário 1: Envio de Mensagem Bem-sucedido
**Dado** que eu sou um usuário autenticado
**E** tenho pelo menos um agente criado
**E** estou na interface de chat
**Quando** eu digito uma mensagem
**E** clico no botão "Enviar"
**Então** a mensagem deve aparecer no chat
**E** o agente deve processar a mensagem
**E** eu devo receber uma resposta em tempo real

### Cenário 2: Mensagem Vazia
**Dado** que eu estou na interface de chat
**Quando** eu clico em "Enviar" sem digitar nada
**Então** o botão deve estar desabilitado
**E** nenhuma mensagem deve ser enviada

### Cenário 3: Mensagem Muito Longa
**Dado** que eu estou na interface de chat
**Quando** eu digito uma mensagem com mais de 4000 caracteres
**Então** eu devo ver uma mensagem de validação
**E** o botão "Enviar" deve estar desabilitado

### Cenário 4: Agente Indisponível
**Dado** que eu estou na interface de chat
**E** o agente está indisponível
**Quando** eu envio uma mensagem
**Então** eu devo ver uma mensagem de erro
**E** a mensagem deve ser salva para retry posterior

### Cenário 5: Streaming de Resposta
**Dado** que eu envio uma mensagem
**Quando** o agente está processando
**Então** eu devo ver um indicador de digitação
**E** a resposta deve aparecer gradualmente (streaming)

## Definição de Pronto (DoD)

### Frontend
- [ ] Interface de chat implementada
- [ ] Input de mensagem com validação
- [ ] Lista de mensagens
- [ ] Indicador de digitação
- [ ] Streaming de respostas
- [ ] Tratamento de erros
- [ ] Testes unitários
- [ ] Testes de integração

### Backend
- [ ] Endpoint POST /api/v1/chat/messages
- [ ] WebSocket para tempo real
- [ ] Roteamento de mensagens para agentes
- [ ] Integração com Agno SDK
- [ ] Streaming de respostas
- [ ] Tratamento de erros
- [ ] Testes unitários
- [ ] Testes de integração

### Banco de Dados
- [ ] Tabela messages criada
- [ ] Tabela sessions criada
- [ ] Constraints implementadas
- [ ] Índices criados
- [ ] Migrations implementadas

### Documentação
- [ ] API documentada
- [ ] WebSocket documentado
- [ ] Componentes documentados
- [ ] Testes documentados

## Tarefas Técnicas

### Frontend (gabi-chat)
1. Usar componentes de chat existentes do Agent UI
2. Aplicar customizações de estilo ness
3. Implementar WebSocket client
4. Implementar streaming de respostas
5. Implementar indicador de digitação
6. Implementar gerenciamento de estado
7. Adicionar testes unitários
8. Adicionar testes de integração

### Backend (gabi-os)
1. Criar endpoint POST /api/v1/chat/messages
2. Implementar WebSocket handler
3. Implementar roteamento de mensagens
4. Integrar com Agno SDK
5. Implementar streaming de respostas
6. Implementar tratamento de erros
7. Adicionar logs de auditoria
8. Adicionar testes unitários
9. Adicionar testes de integração

### Banco de Dados
1. Criar tabela messages
2. Criar tabela sessions
3. Implementar migrations
4. Adicionar constraints
5. Adicionar índices

## Dependências
- STORY-001: User Login (deve estar implementado)
- STORY-002: Create Agent (deve estar implementado)

## Riscos
- **Risco:** Performance com WebSocket
- **Mitigação:** Implementar connection pooling e rate limiting

- **Risco:** Complexidade do streaming
- **Mitigação:** Implementar testes extensivos e fallbacks

- **Risco:** Integração com Agno SDK
- **Mitigação:** Implementar mocks para testes e documentação

## Notas Técnicas
- Usar WebSocket para tempo real
- Implementar streaming de respostas
- Máximo 4000 caracteres por mensagem
- Implementar retry automático
- Logs de auditoria para todas as mensagens

## Critérios de Teste

### Testes Unitários
- Validação de mensagem
- Envio de mensagem
- Recebimento de resposta
- Streaming de resposta
- Tratamento de erros

### Testes de Integração
- Fluxo completo de chat
- Integração com WebSocket
- Integração com Agno SDK
- Integração com banco de dados

### Testes E2E
- Envio bem-sucedido
- Streaming de resposta
- Tratamento de erros
- Validação de mensagem

## Métricas de Sucesso
- Tempo de resposta < 2 segundos
- Taxa de erro < 1%
- Cobertura de testes > 80%
- Zero vulnerabilidades críticas
- Latência WebSocket < 100ms

## Estrutura de Dados

### Message
```typescript
interface Message {
  id: string;
  sessionId: string;
  content: string;
  messageType: 'user' | 'assistant' | 'system';
  agentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Session
```typescript
interface Session {
  id: string;
  userId: string;
  agentId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Validações

### Frontend
- Mensagem não pode estar vazia
- Mensagem deve ter no máximo 4000 caracteres
- Botão enviar deve estar desabilitado durante envio
- Indicador de digitação deve aparecer durante processamento

### Backend
- Verificar se usuário está autenticado
- Verificar se sessão existe
- Verificar se agente está disponível
- Validar conteúdo da mensagem
- Implementar rate limiting

## WebSocket Events

### Client to Server
- `message:send` - Enviar mensagem
- `session:join` - Entrar em sessão
- `session:leave` - Sair de sessão

### Server to Client
- `message:received` - Mensagem recebida
- `message:streaming` - Streaming de resposta
- `message:complete` - Resposta completa
- `error:message` - Erro na mensagem
- `typing:start` - Agente começou a digitar
- `typing:stop` - Agente parou de digitar
