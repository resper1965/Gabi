'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building2, 
  Users, 
  UserPlus, 
  Settings, 
  BarChart3, 
  Shield,
  Loader2,
  Plus
} from 'lucide-react'
import { Organization, User as UserType } from '@/types/auth'

interface AdminDashboardProps {
  isPlatformAdmin?: boolean
}

export default function AdminDashboard({ isPlatformAdmin = false }: AdminDashboardProps) {
  const { user, organization, hasPermission } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalUsers: 0,
    activeUsers: 0,
    pendingInvitations: 0
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Simular carregamento de dados
      // Em uma implementação real, isso viria das APIs
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setStats({
        totalOrganizations: isPlatformAdmin ? 5 : 1,
        totalUsers: isPlatformAdmin ? 25 : 8,
        activeUsers: isPlatformAdmin ? 20 : 6,
        pendingInvitations: isPlatformAdmin ? 3 : 1
      })
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-montserrat font-medium text-foreground">
            {isPlatformAdmin ? 'Administração da Plataforma' : 'Administração da Organização'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isPlatformAdmin 
              ? 'Gerencie organizações, usuários e configurações globais'
              : `Gerencie usuários e configurações da ${organization?.name}`
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>{user?.role === 'platform_admin' ? 'Platform Admin' : 'Org Admin'}</span>
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizações</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground">
              {isPlatformAdmin ? 'Total de organizações' : 'Organização atual'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {isPlatformAdmin ? 'Total de usuários' : 'Usuários da organização'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Usuários ativos hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvitations}</div>
            <p className="text-xs text-muted-foreground">
              Convites pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue={isPlatformAdmin ? "organizations" : "users"} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          {isPlatformAdmin && (
            <TabsTrigger value="organizations">Organizações</TabsTrigger>
          )}
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        {isPlatformAdmin && (
          <TabsContent className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Organizações</CardTitle>
                    <CardDescription>
                      Gerencie todas as organizações da plataforma
                    </CardDescription>
                  </div>
                  <Button className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Nova Organização</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Gerenciar Organizações</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Funcionalidade em desenvolvimento
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuários</CardTitle>
                  <CardDescription>
                    {isPlatformAdmin 
                      ? 'Gerencie usuários de todas as organizações'
                      : `Gerencie usuários da ${organization?.name}`
                    }
                  </CardDescription>
                </div>
                <Button className="flex items-center space-x-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Convidar Usuário</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Gerenciar Usuários</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Funcionalidade em desenvolvimento
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configurações</CardTitle>
                  <CardDescription>
                    {isPlatformAdmin 
                      ? 'Configurações globais da plataforma'
                      : `Configurações da ${organization?.name}`
                    }
                  </CardDescription>
                </div>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Editar</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Configurações</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Funcionalidade em desenvolvimento
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
