# Diagrama de Arquitetura - Sistema de Autenticação Multitenancy

## Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────┐
│                    GABI CHAT - FRONTEND                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   LOGIN FORM    │  │   ADMIN AREA    │  │   CHAT UI   │ │
│  │                 │  │                 │  │             │ │
│  │ • Email/Pass    │  │ • Platform Admin│  │ • Chat Area │ │
│  │ • Auto Org      │  │ • Org Admin     │  │ • Agents    │ │
│  │ • Direct Access │  │ • User Mgmt      │  │ • Sessions  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    GABI OS - BACKEND                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   AUTH API      │  │   ADMIN API     │  │   CHAT API  │ │
│  │                 │  │                 │  │             │ │
│  │ • Login         │  │ • Invite Users  │  │ • Sessions  │ │
│  │ • Invitations   │  │ • Manage Orgs   │  │ • Agents    │ │
│  │ • JWT Tokens    │  │ • Settings      │  │ • Messages  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE                                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   USERS         │  │ ORGANIZATIONS   │  │ INVITATIONS │ │
│  │                 │  │                 │  │             │ │
│  │ • Platform Admin│  │ • Org Settings  │  │ • Pending   │ │
│  │ • Org Admin     │  │ • User Limits   │  │ • Accepted  │ │
│  │ • Users         │  │ • Configs       │  │ • Expired   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Hierarquia de Usuários

```
┌─────────────────────────────────────────────────────────────┐
│                ADMINISTRADOR DA PLATAFORMA                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • Convidar Administradores de Organização              │ │
│  │ • Criar/Configurar Organizações                        │ │
│  │ • Configurar Ambiente Global                           │ │
│  │ • Gerenciar Configurações da Plataforma                │ │
│  │ • Acessar Todas as Organizações                        │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│              ADMINISTRADOR DA ORGANIZAÇÃO                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • Convidar Usuários para sua Organização               │ │
│  │ • Gerenciar Usuários da Organização                    │ │
│  │ • Configurar Organização                               │ │
│  │ • Acessar Chat da Organização                          │ │
│  │ • Relatórios da Organização                             │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                        USUÁRIO                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • Acessar Chat da Organização                           │ │
│  │ • Usar Agentes Disponíveis                              │ │
│  │ • Gerenciar Sessões Pessoais                            │ │
│  │ • Configurações Pessoais                                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Fluxo de Convites

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE CONVITES                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. ADMIN PLATAFORMA                                       │
│     ┌─────────────────────────────────────────────────────┐ │
│     │ • Cria Organização                                  │ │
│     │ • Convida Admin da Organização                      │ │
│     │ • Envia Email com Link de Convite                   │ │
│     └─────────────────────────────────────────────────────┘ │
│                              │                             │
│                              ▼                             │
│  2. ADMIN ORGANIZAÇÃO                                      │
│     ┌─────────────────────────────────────────────────────┐ │
│     │ • Recebe Email de Convite                           │ │
│     │ • Clica no Link                                     │ │
│     │ • Define Senha                                      │ │
│     │ • Acessa Admin da Organização                       │ │
│     └─────────────────────────────────────────────────────┘ │
│                              │                             │
│                              ▼                             │
│  3. ADMIN ORGANIZAÇÃO                                       │
│     ┌─────────────────────────────────────────────────────┐ │
│     │ • Convida Usuários                                  │ │
│     │ • Envia Emails com Links                            │ │
│     │ • Gerencia Usuários da Organização                  │ │
│     └─────────────────────────────────────────────────────┘ │
│                              │                             │
│                              ▼                             │
│  4. USUÁRIOS                                                │
│     ┌─────────────────────────────────────────────────────┐ │
│     │ • Recebem Emails de Convite                         │ │
│     │ • Clicam nos Links                                  │ │
│     │ • Definem Senhas                                    │ │
│     │ • Acessam Chat da Organização                       │ │
│     └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Estrutura de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                    ESTRUTURA DE DADOS                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  USERS TABLE                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ id | email | username | full_name | role | org_id     │ │
│  │ invited_by | invitation_token | is_active | created_at │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ORGANIZATIONS TABLE                                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ id | name | slug | description | created_by | admin_id │ │
│  │ is_active | settings | created_at | updated_at         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  INVITATIONS TABLE                                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ id | email | role | org_id | invited_by | token        │ │
│  │ expires_at | status | created_at                       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Frontend

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENTES FRONTEND                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AUTHENTICATION                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • LoginForm.tsx - Login direto                         │ │
│  │ • InvitationAcceptance.tsx - Aceitar convites          │ │
│  │ • AuthContext.tsx - Estado global                      │ │
│  │ • AuthService.ts - Lógica de autenticação              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ADMINISTRATION                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • PlatformAdminDashboard.tsx - Admin plataforma        │ │
│  │ • OrganizationAdminDashboard.tsx - Admin organização  │ │
│  │ • UserManagement.tsx - Gerenciar usuários              │ │
│  │ • InvitationManager.tsx - Gerenciar convites           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  CHAT INTERFACE                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • ChatArea.tsx - Área principal do chat               │ │
│  │ • Sidebar.tsx - Navegação e sessões                    │ │
│  │ • AgentSelector.tsx - Seleção de agentes              │ │
│  │ • MessageList.tsx - Lista de mensagens                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## APIs Backend

```
┌─────────────────────────────────────────────────────────────┐
│                    APIs BACKEND                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AUTHENTICATION API                                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ POST /api/auth/login - Login direto                     │ │
│  │ POST /api/auth/accept-invitation - Aceitar convite    │ │
│  │ POST /api/auth/logout - Logout                         │ │
│  │ GET /api/auth/me - Dados do usuário atual              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ADMINISTRATION API                                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ POST /api/admin/invite-org-admin - Convidar admin     │ │
│  │ POST /api/admin/invite-user - Convidar usuário        │ │
│  │ GET /api/admin/organizations - Listar organizações    │ │
│  │ POST /api/admin/organizations - Criar organização     │ │
│  │ PUT /api/admin/organizations/{id} - Editar org        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  CHAT API                                                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ GET /api/chat/sessions - Listar sessões               │ │
│  │ POST /api/chat/sessions - Criar sessão                 │ │
│  │ GET /api/chat/messages - Listar mensagens              │ │
│  │ POST /api/chat/messages - Enviar mensagem              │ │
│  │ GET /api/chat/agents - Listar agentes                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Esta arquitetura fornece uma base sólida para implementar o sistema de autenticação multitenancy do Gabi Chat, com foco na simplicidade de uso e controle administrativo hierárquico.
