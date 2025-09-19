/**
 * Tipos TypeScript para autenticação e multitenancy
 */

export interface User {
  id: string
  email: string
  username: string
  full_name: string
  role: 'platform_admin' | 'org_admin' | 'user'
  organization_id: string
  invited_by?: string
  is_active: boolean
  created_at: string
  last_login?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  created_by: string
  admin_id: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface OrganizationSettings {
  id: string
  organization_id: string
  default_model: string
  max_agents: number
  max_sessions: number
  session_timeout: number
  enable_user_memories: boolean
  enable_session_summaries: boolean
  api_rate_limit: number
  custom_logo_url?: string
  custom_theme: string
  custom_colors?: string
  created_at: string
  updated_at?: string
}

export interface OrganizationUser {
  id: string
  organization_id: string
  user_id: string
  role: 'admin' | 'member'
  is_active: boolean
  joined_at: string
}

export interface Invitation {
  id: string
  email: string
  role: 'org_admin' | 'user'
  organization_id: string
  invited_by: string
  token: string
  expires_at: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  created_at: string
  accepted_at?: string
}

export interface UserSession {
  id: string
  user_id: string
  session_token: string
  organization_id: string
  is_active: boolean
  expires_at: string
  created_at: string
  last_activity: string
}

export interface AuthContextType {
  user: User | null
  organization: Organization | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
  hasPermission: (role: string) => boolean
  refreshUser: () => Promise<void>
}

export interface RegisterData {
  email: string
  username: string
  full_name: string
  password: string
  confirm_password?: string
  invitation_token?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface InviteData {
  email: string
  role: 'org_admin' | 'user'
  organization_id: string
}

export interface AdminContextType {
  organizations: Organization[]
  users: User[]
  invitations: Invitation[]
  isLoading: boolean
  refreshData: () => Promise<void>
  createOrganization: (data: CreateOrganizationData) => Promise<void>
  inviteUser: (data: InviteData) => Promise<void>
  updateOrganizationSettings: (organizationId: string, settings: Partial<OrganizationSettings>) => Promise<void>
}

export interface CreateOrganizationData {
  name: string
  slug: string
  description?: string
  admin_email: string
  admin_username: string
  admin_full_name: string
}

export interface UpdateOrganizationData {
  name?: string
  description?: string
}

export interface UpdateUserData {
  full_name?: string
  role?: string
  is_active?: boolean
}
