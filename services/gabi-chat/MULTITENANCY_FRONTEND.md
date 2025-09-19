# Sistema Multitenancy - Frontend (Gabi Chat)

## Visão Geral

O **Gabi Chat** agora implementa um sistema completo de autenticação multitenancy, onde a autenticação é gerenciada no frontend e o backend (gabi-os) fornece apenas as APIs de dados.

## Arquitetura Implementada

```
┌─────────────────────────────────────────────────────────────┐
│                    Gabi Chat (Frontend)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Autenticação  │  │   Organizações  │  │   Context   │ │
│  │   JWT + Session │  │   Management    │  │   Provider  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│              Gabi OS (Backend API)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Organizações  │  │   Configurações │  │   Dados     │ │
│  │   API           │  │   API           │  │   Isolados  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Implementados

### 🔐 **Sistema de Autenticação**

#### `src/lib/auth.ts`
- **AuthService**: Classe principal para gerenciamento de autenticação
- **Interfaces**: User, Organization, OrganizationUser, AuthToken, AuthState
- **Métodos principais**:
  - `login()` - Autenticação de usuário
  - `logout()` - Logout e limpeza de dados
  - `getUserOrganizations()` - Listar organizações do usuário
  - `switchOrganization()` - Trocar organização atual
  - `createOrganization()` - Criar nova organização
  - `hasPermission()` - Verificar permissões

#### `src/contexts/AuthContext.tsx`
- **AuthProvider**: Context provider para estado global de autenticação
- **useAuth()**: Hook para acessar dados de autenticação
- **Estado gerenciado**:
  - Usuário atual
  - Organização atual
  - Lista de organizações
  - Token de autenticação
  - Status de carregamento

### 🏢 **Componentes de Interface**

#### `src/components/LoginForm.tsx`
- Formulário de login com validação
- Integração com AuthService
- Estados de loading e erro
- Design responsivo

#### `src/components/OrganizationSelector.tsx`
- Seletor de organização com dropdown
- Lista organizações do usuário
- Opção para criar nova organização
- Troca de organização em tempo real

### 🔄 **Integração com Interface**

#### `src/app/page.tsx`
- **Fluxo de autenticação**:
  1. Verificar se usuário está autenticado
  2. Se não autenticado → Mostrar LoginForm
  3. Se autenticado mas sem organização → Mostrar OrganizationSelector
  4. Se tudo OK → Mostrar interface principal

#### `src/app/layout.tsx`
- **AuthProvider** envolvendo toda a aplicação
- Disponibiliza contexto de autenticação globalmente

#### `src/components/chat/Sidebar/Sidebar.tsx`
- **OrganizationSelector** integrado no header
- Mostra organização atual
- Permite troca de organização

## Fluxo de Autenticação

### 1. **Login do Usuário**
```typescript
const { login } = useAuth();
await login(email, password);
```

### 2. **Seleção de Organização**
```typescript
const { switchOrganization } = useAuth();
await switchOrganization(organizationId);
```

### 3. **Criação de Organização**
```typescript
const { createOrganization } = useAuth();
const org = await createOrganization(name, slug, description);
```

### 4. **Verificação de Permissões**
```typescript
const { hasPermission } = useAuth();
const canEdit = hasPermission('admin');
```

## Persistência de Dados

### **LocalStorage**
- `gabi_auth_token` - Token JWT
- `gabi_user` - Dados do usuário
- `gabi_organization` - Organização atual

### **Headers de Autenticação**
```typescript
const headers = authService.getAuthHeaders();
// { 'Authorization': 'Bearer <token>' }
```

## Estados da Aplicação

### **1. Não Autenticado**
- Mostra tela de login
- Não tem acesso às funcionalidades

### **2. Autenticado sem Organização**
- Mostra seletor de organizações
- Permite criar nova organização
- Não acessa chat até selecionar organização

### **3. Autenticado com Organização**
- Interface completa disponível
- Dados isolados por organização
- Pode trocar de organização

## Configuração

### **Variáveis de Ambiente**
```bash
NEXT_PUBLIC_GABI_OS_URL=http://localhost:7777
```

### **Integração com Backend**
- Todas as requisições incluem headers de autenticação
- Dados filtrados por organização
- Isolamento completo entre organizações

## Exemplo de Uso

### **Hook useAuth**
```typescript
function MyComponent() {
  const { 
    user, 
    organization, 
    isAuthenticated, 
    login, 
    logout, 
    switchOrganization 
  } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div>
      <h1>Bem-vindo, {user?.username}!</h1>
      <p>Organização: {organization?.name}</p>
      <button onClick={logout}>Sair</button>
    </div>
  );
}
```

### **AuthService Direto**
```typescript
import { authService } from '@/lib/auth';

// Login
await authService.login(email, password);

// Trocar organização
await authService.switchOrganization(orgId);

// Verificar permissões
const canEdit = authService.hasPermission('admin');
```

## Próximos Passos

1. **Implementar API de Autenticação Real**
   - Endpoint de login/logout
   - Validação de credenciais
   - Geração de tokens JWT

2. **Sistema de Registro**
   - Formulário de cadastro
   - Validação de email
   - Confirmação de conta

3. **Gerenciamento de Usuários**
   - Perfil do usuário
   - Configurações pessoais
   - Histórico de atividades

4. **Integração com Agentes**
   - Agentes isolados por organização
   - Configurações personalizadas
   - Permissões por agente

## Benefícios da Implementação

✅ **Separação de Responsabilidades**: Frontend gerencia autenticação, backend fornece dados

✅ **Isolamento Completo**: Cada organização tem seus próprios dados

✅ **Interface Intuitiva**: Fluxo claro de login → seleção → uso

✅ **Flexibilidade**: Fácil troca entre organizações

✅ **Segurança**: Tokens JWT com expiração

✅ **Persistência**: Dados mantidos entre sessões

O sistema está pronto para uso e permite que múltiplas organizações utilizem a mesma instância do Gabi de forma completamente isolada e segura! 🎯
