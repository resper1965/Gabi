/**
 * Serviços de autenticação para o sistema multitenancy
 */

import { User, Organization, Invitation } from '@/types/auth'

// Re-export types for convenience
export type { User, Organization, Invitation }

// gabi-chat gerencia autenticação internamente
// gabi-os é apenas uma API local sem autenticação

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  full_name: string
  password: string
  confirm_password?: string
  invitation_token?: string
}

export interface InviteData {
  email: string
  role: 'org_admin' | 'user'
  organization_id: string
}

class AuthService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_AGENTOS_URL || 'http://localhost:7777'
  }

  /**
   * Gerar JWT local (simulação)
   */
  private generateJWT(user: User): string {
    // Em produção, isso seria feito com uma biblioteca JWT real
    const payload = {
      user_id: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
    }
    
    // Simulação de JWT (em produção usar jwt.sign)
    return btoa(JSON.stringify(payload))
  }

  /**
   * Fazer login do usuário (autenticação local)
   */
  async loginUser(credentials: LoginCredentials): Promise<{ user: User; organization: Organization; token: string }> {
    try {
      // Simular autenticação local (em produção, isso seria feito com um serviço de auth)
      // Por enquanto, vamos simular um usuário e organização
      const mockUser: User = {
        id: '1',
        email: credentials.email,
        username: credentials.email.split('@')[0],
        full_name: 'Usuário Teste',
        role: 'org_admin',
        organization_id: '1',
        is_active: true,
        created_at: new Date().toISOString()
      }

      const mockOrganization: Organization = {
        id: '1',
        name: 'Ness Tecnologia',
        slug: 'ness-tecnologia',
        description: 'Organização principal da Ness',
        created_by: 'admin',
        admin_id: '1',
        is_active: true,
        created_at: new Date().toISOString()
      }

      const token = this.generateJWT(mockUser)
      
      // Armazenar dados no localStorage
      localStorage.setItem('auth_token', token)
      localStorage.setItem('organization_id', mockOrganization.id)
      localStorage.setItem('user_data', JSON.stringify(mockUser))
      
      return {
        user: mockUser,
        organization: mockOrganization,
        token
      }
    } catch (error) {
      console.error('Erro no login:', error)
      throw error
    }
  }

  /**
   * Fazer logout do usuário (autenticação local)
   */
  async logoutUser(): Promise<void> {
    try {
      // Limpar dados locais (autenticação local)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('organization_id')
      localStorage.removeItem('user_data')
    } catch (error) {
      console.error('Erro no logout:', error)
    }
  }

  /**
   * Registrar novo usuário (aceitar convite)
   */
  async registerUser(registerData: RegisterData): Promise<{ user: User; organization: Organization; token: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Erro no registro')
      }

      const data = await response.json()
      
      // Armazenar dados no localStorage
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('organization_id', data.organization.id)
      localStorage.setItem('user_data', JSON.stringify(data.user))
      
      return data
    } catch (error) {
      console.error('Erro no registro:', error)
      throw error
    }
  }

  /**
   * Obter token de autenticação
   */
  getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
  }

  /**
   * Obter ID da organização atual
   */
  getOrganizationId(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('organization_id')
  }

  /**
   * Definir token de autenticação
   */
  setAuthToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('auth_token', token)
  }

  /**
   * Definir ID da organização
   */
  setOrganizationId(organizationId: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('organization_id', organizationId)
  }

  /**
   * Verificar se usuário está autenticado
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    return !!this.getAuthToken()
  }

  /**
   * Obter dados do usuário atual (autenticação local)
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = localStorage.getItem('user_data')
      if (!userData) return null

      return JSON.parse(userData)
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error)
      return null
    }
  }

  /**
   * Obter organização atual (autenticação local)
   */
  async getCurrentOrganization(): Promise<Organization | null> {
    try {
      const organizationId = this.getOrganizationId()
      if (!organizationId) return null

      // Simular organização (em produção, isso viria de um serviço)
      const mockOrganization: Organization = {
        id: organizationId,
        name: 'Ness Tecnologia',
        slug: 'ness-tecnologia',
        description: 'Organização principal da Ness',
        created_by: 'admin',
        admin_id: '1',
        is_active: true,
        created_at: new Date().toISOString()
      }

      return mockOrganization
    } catch (error) {
      console.error('Erro ao obter organização atual:', error)
      return null
    }
  }

  /**
   * Listar organizações do usuário (chamada para gabi-os sem autenticação)
   */
  async getUserOrganizations(): Promise<Organization[]> {
    try {
      // Chamada para gabi-os SEM autenticação (API local)
      const response = await fetch(`${this.baseUrl}/api/organizations`)

      if (!response.ok) {
        return []
      }

      return await response.json()
    } catch (error) {
      console.error('Erro ao obter organizações do usuário:', error)
      return []
    }
  }

  /**
   * Trocar organização (autenticação local)
   */
  async switchOrganization(organizationId: string): Promise<void> {
    try {
      // Trocar organização localmente
      this.setOrganizationId(organizationId)
    } catch (error) {
      console.error('Erro ao trocar organização:', error)
    }
  }

  /**
   * Validar convite (chamada para gabi-os sem autenticação)
   */
  async validateInvitation(token: string): Promise<Invitation | null> {
    try {
      // Chamada para gabi-os SEM autenticação (API local)
      const response = await fetch(`${this.baseUrl}/api/invitations/validate/${token}`)

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Erro ao validar convite:', error)
      return null
    }
  }

  /**
   * Aceitar convite (chamada para gabi-os sem autenticação)
   */
  async acceptInvitation(token: string, userData: { username: string; full_name: string; password: string }): Promise<{ user: User; organization: Organization }> {
    try {
      // Chamada para gabi-os SEM autenticação (API local)
      const response = await fetch(`${this.baseUrl}/api/invitations/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          ...userData,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Erro ao aceitar convite')
      }

      return await response.json()
    } catch (error) {
      console.error('Erro ao aceitar convite:', error)
      throw error
    }
  }
}

export const authService = new AuthService()
export default authService