# Painel de Administração - Gabi Chat

## Visão Geral

O **Painel de Administração** do Gabi Chat será integrado diretamente no **gabi-chat** (frontend), proporcionando uma experiência unificada onde administradores podem gerenciar organizações, usuários e configurações sem sair da interface principal.

## Estrutura de Acesso

### **1. Integração no gabi-chat**

O painel de administração será uma **rota integrada** no próprio gabi-chat, acessível através de:

```
https://gabi.ness.tec.br/admin
```

### **2. Hierarquia de Acesso**

```
┌─────────────────────────────────────────────────────────────┐
│                    ACESSO AO PAINEL                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           ADMINISTRADOR DA PLATAFORMA                  │ │
│  │                                                         │ │
│  │  Acesso: https://gabi.ness.tec.br/admin                │ │
│  │  Funcionalidades:                                       │ │
│  │  • Gerenciar todas as organizações                     │ │
│  │  • Convidar administradores de organização             │ │
│  │  • Configurar ambiente global                          │ │
│  │  • Acessar métricas e relatórios                       │ │
│  │  • Configurar integrações globais                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                             │
│                              ▼                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │        ADMINISTRADOR DA ORGANIZAÇÃO                    │ │
│  │                                                         │ │
│  │  Acesso: https://gabi.ness.tec.br/admin/org            │ │
│  │  Funcionalidades:                                       │ │
│  │  • Gerenciar usuários da organização                   │ │
│  │  • Convidar novos usuários                             │ │
│  │  • Configurar organização                              │ │
│  │  • Acessar relatórios da organização                   │ │
│  │  • Configurar agentes e ferramentas                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                             │
│                              ▼                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    USUÁRIO                             │ │
│  │                                                         │ │
│  │  Acesso: https://gabi.ness.tec.br/                     │ │
│  │  Funcionalidades:                                       │ │
│  │  • Acessar chat da organização                         │ │
│  │  • Usar agentes disponíveis                            │ │
│  │  • Gerenciar sessões pessoais                          │ │
│  │  • Configurar perfil pessoal                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Estrutura de Rotas

### **1. Rotas do Painel de Administração**

```typescript
// Estrutura de rotas no gabi-chat
/admin                          // Painel principal (Platform Admin)
/admin/organizations            // Gerenciar organizações
/admin/organizations/new        // Criar nova organização
/admin/organizations/[id]       // Editar organização específica
/admin/invitations              // Gerenciar convites
/admin/settings                 // Configurações globais
/admin/analytics                // Métricas e relatórios

/admin/org                      // Painel da organização (Org Admin)
/admin/org/users                // Gerenciar usuários
/admin/org/users/invite         // Convidar usuários
/admin/org/settings             // Configurações da organização
/admin/org/agents               // Configurar agentes
/admin/org/analytics            // Relatórios da organização
```

### **2. Componentes de Administração**

```typescript
// Estrutura de componentes
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx                    // Dashboard principal
│   │   ├── organizations/
│   │   │   ├── page.tsx               // Lista de organizações
│   │   │   ├── new/
│   │   │   │   └── page.tsx           // Criar organização
│   │   │   └── [id]/
│   │   │       └── page.tsx           // Editar organização
│   │   ├── invitations/
│   │   │   └── page.tsx               // Gerenciar convites
│   │   ├── settings/
│   │   │   └── page.tsx               // Configurações globais
│   │   └── analytics/
│   │       └── page.tsx               // Métricas e relatórios
│   └── admin/
│       └── org/
│           ├── page.tsx               // Dashboard da organização
│           ├── users/
│           │   ├── page.tsx           // Lista de usuários
│           │   └── invite/
│           │       └── page.tsx       // Convidar usuários
│           ├── settings/
│           │   └── page.tsx           // Configurações da organização
│           ├── agents/
│           │   └── page.tsx           // Configurar agentes
│           └── analytics/
│               └── page.tsx           // Relatórios da organização
├── components/
│   └── admin/
│       ├── PlatformAdminDashboard.tsx
│       ├── OrganizationAdminDashboard.tsx
│       ├── OrganizationManager.tsx
│       ├── UserManager.tsx
│       ├── InvitationManager.tsx
│       ├── SettingsManager.tsx
│       └── AnalyticsDashboard.tsx
└── lib/
    └── admin/
        ├── adminService.ts
        ├── organizationService.ts
        └── userService.ts
```

## Funcionalidades do Painel

### **1. Painel do Administrador da Plataforma**

#### **Dashboard Principal**
```typescript
// components/admin/PlatformAdminDashboard.tsx
function PlatformAdminDashboard() {
  return (
    <div className="admin-dashboard">
      <h1>Administração da Plataforma</h1>
      
      <div className="stats-grid">
        <StatCard title="Organizações" value={organizationsCount} />
        <StatCard title="Usuários Ativos" value={activeUsersCount} />
        <StatCard title="Sessões Hoje" value={sessionsToday} />
        <StatCard title="Uso de Recursos" value={resourceUsage} />
      </div>
      
      <div className="admin-sections">
        <section>
          <h2>Organizações</h2>
          <OrganizationManager />
        </section>
        
        <section>
          <h2>Convidar Administradores</h2>
          <InviteOrgAdminForm />
        </section>
        
        <section>
          <h2>Configurações Globais</h2>
          <GlobalSettings />
        </section>
      </div>
    </div>
  );
}
```

#### **Gerenciamento de Organizações**
- **Listar organizações** com status e métricas
- **Criar nova organização** com configurações iniciais
- **Editar organização** existente
- **Suspender/reativar** organizações
- **Visualizar métricas** de uso por organização

#### **Sistema de Convites**
- **Convidar administradores** de organização
- **Gerenciar convites pendentes**
- **Reenviar convites** expirados
- **Cancelar convites** não aceitos

#### **Configurações Globais**
- **Configurações de IA** (modelos padrão, limites)
- **Configurações de segurança** (autenticação, sessões)
- **Configurações de integração** (APIs externas)
- **Configurações de tema** (branding global)

### **2. Painel do Administrador da Organização**

#### **Dashboard da Organização**
```typescript
// components/admin/OrganizationAdminDashboard.tsx
function OrganizationAdminDashboard() {
  return (
    <div className="org-admin-dashboard">
      <h1>Administração da Organização</h1>
      
      <div className="org-stats">
        <StatCard title="Usuários" value={usersCount} />
        <StatCard title="Sessões Ativas" value={activeSessions} />
        <StatCard title="Agentes" value={agentsCount} />
        <StatCard title="Uso Mensal" value={monthlyUsage} />
      </div>
      
      <div className="org-sections">
        <section>
          <h2>Usuários</h2>
          <UserManager />
        </section>
        
        <section>
          <h2>Convidar Usuários</h2>
          <InviteUserForm />
        </section>
        
        <section>
          <h2>Configurações da Organização</h2>
          <OrganizationSettings />
        </section>
      </div>
    </div>
  );
}
```

#### **Gerenciamento de Usuários**
- **Listar usuários** da organização
- **Convidar novos usuários** por email
- **Editar permissões** de usuários
- **Suspender/reativar** usuários
- **Visualizar atividade** dos usuários

#### **Configurações da Organização**
- **Configurações de agentes** disponíveis
- **Configurações de limites** (sessões, uso)
- **Configurações de branding** (logo, cores)
- **Configurações de integração** específicas

## Controle de Acesso

### **1. Middleware de Autorização**

```typescript
// middleware/adminAuth.ts
export function withAdminAuth(requiredRole: 'platform_admin' | 'org_admin') {
  return function(Component: React.ComponentType) {
    return function AdminProtectedComponent(props: any) {
      const { user, organization } = useAuth();
      
      if (!user) {
        redirect('/login');
        return null;
      }
      
      if (requiredRole === 'platform_admin' && user.role !== 'platform_admin') {
        redirect('/');
        return null;
      }
      
      if (requiredRole === 'org_admin' && user.role === 'user') {
        redirect('/');
        return null;
      }
      
      return <Component {...props} />;
    };
  };
}
```

### **2. Proteção de Rotas**

```typescript
// app/admin/page.tsx
import { withAdminAuth } from '@/middleware/adminAuth';

function PlatformAdminPage() {
  return <PlatformAdminDashboard />;
}

export default withAdminAuth('platform_admin')(PlatformAdminPage);
```

```typescript
// app/admin/org/page.tsx
import { withAdminAuth } from '@/middleware/adminAuth';

function OrganizationAdminPage() {
  return <OrganizationAdminDashboard />;
}

export default withAdminAuth('org_admin')(OrganizationAdminPage);
```

## Navegação e UX

### **1. Menu de Navegação**

```typescript
// components/admin/AdminNavigation.tsx
function AdminNavigation() {
  const { user } = useAuth();
  
  return (
    <nav className="admin-nav">
      {user.role === 'platform_admin' && (
        <>
          <NavLink href="/admin">Dashboard</NavLink>
          <NavLink href="/admin/organizations">Organizações</NavLink>
          <NavLink href="/admin/invitations">Convites</NavLink>
          <NavLink href="/admin/settings">Configurações</NavLink>
          <NavLink href="/admin/analytics">Analytics</NavLink>
        </>
      )}
      
      {user.role === 'org_admin' && (
        <>
          <NavLink href="/admin/org">Dashboard</NavLink>
          <NavLink href="/admin/org/users">Usuários</NavLink>
          <NavLink href="/admin/org/settings">Configurações</NavLink>
          <NavLink href="/admin/org/agents">Agentes</NavLink>
          <NavLink href="/admin/org/analytics">Analytics</NavLink>
        </>
      )}
    </nav>
  );
}
```

### **2. Breadcrumbs**

```typescript
// components/admin/AdminBreadcrumbs.tsx
function AdminBreadcrumbs() {
  const pathname = usePathname();
  
  const breadcrumbs = pathname.split('/').filter(Boolean);
  
  return (
    <nav className="breadcrumbs">
      {breadcrumbs.map((crumb, index) => (
        <span key={index}>
          {index > 0 && ' / '}
          {crumb === 'admin' ? 'Administração' : crumb}
        </span>
      ))}
    </nav>
  );
}
```

## Integração com Backend

### **1. APIs de Administração**

```typescript
// lib/admin/adminService.ts
export class AdminService {
  // Platform Admin APIs
  async getOrganizations(): Promise<Organization[]> {
    return await api.get('/admin/organizations');
  }
  
  async createOrganization(data: CreateOrganizationData): Promise<Organization> {
    return await api.post('/admin/organizations', data);
  }
  
  async inviteOrgAdmin(data: InviteOrgAdminData): Promise<Invitation> {
    return await api.post('/admin/invite-org-admin', data);
  }
  
  // Organization Admin APIs
  async getUsers(): Promise<User[]> {
    return await api.get('/admin/org/users');
  }
  
  async inviteUser(data: InviteUserData): Promise<Invitation> {
    return await api.post('/admin/org/invite-user', data);
  }
  
  async updateOrganizationSettings(data: OrganizationSettings): Promise<void> {
    return await api.put('/admin/org/settings', data);
  }
}
```

### **2. Context de Administração**

```typescript
// contexts/AdminContext.tsx
interface AdminContextType {
  organizations: Organization[];
  users: User[];
  invitations: Invitation[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  createOrganization: (data: CreateOrganizationData) => Promise<void>;
  inviteOrgAdmin: (data: InviteOrgAdminData) => Promise<void>;
  inviteUser: (data: InviteUserData) => Promise<void>;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  // Implementação do contexto de administração
}
```

## Design e Estilo

### **1. Design System ness**

```typescript
// Estilos específicos para administração
.admin-dashboard {
  @apply bg-background text-foreground;
  font-family: 'Montserrat', sans-serif;
}

.admin-nav {
  @apply bg-elevated border-r border-border;
}

.admin-section {
  @apply bg-elevated rounded-lg p-6;
}

.admin-card {
  @apply bg-elevated-secondary rounded-lg p-4 border border-border;
}

.admin-button {
  @apply bg-primary text-primary-foreground hover:bg-primary/80;
  @apply font-montserrat font-medium;
}

.admin-input {
  @apply bg-secondary border border-border text-foreground;
  @apply focus:border-primary focus:ring-1 focus:ring-primary;
}
```

### **2. Componentes Reutilizáveis**

```typescript
// components/admin/AdminCard.tsx
function AdminCard({ title, children, actions }: AdminCardProps) {
  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">{title}</h3>
        {actions && <div className="admin-card-actions">{actions}</div>}
      </div>
      <div className="admin-card-content">{children}</div>
    </div>
  );
}

// components/admin/StatCard.tsx
function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-content">
        <h4 className="stat-card-title">{title}</h4>
        <p className="stat-card-value">{value}</p>
        {change && <p className="stat-card-change">{change}</p>}
      </div>
    </div>
  );
}
```

## Benefícios da Integração

### **1. Experiência Unificada**
- **Uma única interface** para chat e administração
- **Navegação fluida** entre funcionalidades
- **Design consistente** com o resto da aplicação

### **2. Simplicidade de Acesso**
- **URLs intuitivas** e fáceis de lembrar
- **Controle de acesso** baseado em roles
- **Redirecionamento automático** baseado em permissões

### **3. Manutenção Simplificada**
- **Código compartilhado** entre chat e admin
- **Componentes reutilizáveis** para ambas as interfaces
- **Deploy único** para todas as funcionalidades

### **4. Segurança Integrada**
- **Autenticação unificada** com o sistema de chat
- **Controle de acesso** baseado em organização
- **Auditoria integrada** de todas as ações

## Implementação Futura

### **1. Fase 1: Estrutura Básica**
- [ ] Criar rotas de administração
- [ ] Implementar middleware de autorização
- [ ] Criar componentes básicos de dashboard

### **2. Fase 2: Funcionalidades Core**
- [ ] Gerenciamento de organizações
- [ ] Sistema de convites
- [ ] Gerenciamento de usuários

### **3. Fase 3: Funcionalidades Avançadas**
- [ ] Analytics e relatórios
- [ ] Configurações avançadas
- [ ] Integrações externas

### **4. Fase 4: Otimizações**
- [ ] Performance e caching
- [ ] Notificações em tempo real
- [ ] Funcionalidades de auditoria

Esta estrutura proporciona uma experiência de administração completa e integrada, mantendo a simplicidade e consistência com o design system ness, enquanto oferece todas as funcionalidades necessárias para gerenciar o sistema multitenancy do Gabi Chat.
