'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Organization, AuthContextType, RegisterData } from '@/types/auth'
import { authService } from '@/lib/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar autenticação na inicialização
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      setIsLoading(true)
      
      if (!authService.isAuthenticated()) {
        setIsAuthenticated(false)
        return
      }

      const [currentUser, currentOrg] = await Promise.all([
        authService.getCurrentUser(),
        authService.getCurrentOrganization()
      ])

      if (currentUser && currentOrg) {
        setUser(currentUser)
        setOrganization(currentOrg)
        setIsAuthenticated(true)
      } else {
        // Token inválido, limpar dados
        await authService.logoutUser()
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      
      const { user: userData, organization: orgData } = await authService.loginUser({
        email,
        password
      })

      setUser(userData)
      setOrganization(orgData)
      setIsAuthenticated(true)
      
      // Armazenar dados do usuário
      localStorage.setItem('user_data', JSON.stringify(userData))
    } catch (error) {
      console.error('Erro no login:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      
      await authService.logoutUser()
      
      setUser(null)
      setOrganization(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error('Erro no logout:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true)
      
      const { user: userData, organization: orgData } = await authService.registerUser(data)

      setUser(userData)
      setOrganization(orgData)
      setIsAuthenticated(true)
      
      // Armazenar dados do usuário
      localStorage.setItem('user_data', JSON.stringify(userData))
    } catch (error) {
      console.error('Erro no registro:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const switchOrganization = async (organizationId: string) => {
    try {
      setIsLoading(true)
      
      await authService.switchOrganization(organizationId)
      
      // Recarregar dados da nova organização
      const [currentUser, currentOrg] = await Promise.all([
        authService.getCurrentUser(),
        authService.getCurrentOrganization()
      ])

      if (currentUser && currentOrg) {
        setUser(currentUser)
        setOrganization(currentOrg)
      }
    } catch (error) {
      console.error('Erro ao trocar organização:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const hasPermission = (role: string): boolean => {
    if (!user) return false
    
    const roleHierarchy = {
      'platform_admin': 3,
      'org_admin': 2,
      'user': 1
    }
    
    const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0
    const requiredLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 0
    
    return userLevel >= requiredLevel
  }

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        localStorage.setItem('user_data', JSON.stringify(currentUser))
      }
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error)
    }
  }

  const value: AuthContextType = {
    user,
    organization,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    switchOrganization,
    hasPermission,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}