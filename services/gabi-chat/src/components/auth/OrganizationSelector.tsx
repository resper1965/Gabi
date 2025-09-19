'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Building2, Users, Settings } from 'lucide-react'
import { Organization } from '@/types/auth'

interface OrganizationSelectorProps {
  onOrganizationChange?: () => void
}

export default function OrganizationSelector({ onOrganizationChange }: OrganizationSelectorProps) {
  const { user, organization, switchOrganization, isLoading } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUserOrganizations()
  }, [])

  const loadUserOrganizations = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Simular carregamento das organizações do usuário
      // Em uma implementação real, isso viria da API
      const userOrgs: Organization[] = [
        {
          id: '1',
          name: 'Ness Tecnologia',
          slug: 'ness-tecnologia',
          description: 'Organização principal da Ness',
          created_by: 'admin',
          admin_id: user?.id || '',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
      
      setOrganizations(userOrgs)
    } catch (error) {
      console.error('Erro ao carregar organizações:', error)
      setError('Erro ao carregar organizações')
    } finally {
      setLoading(false)
    }
  }

  const handleOrganizationSelect = async (orgId: string) => {
    try {
      await switchOrganization(orgId)
      onOrganizationChange?.()
    } catch (error) {
      console.error('Erro ao trocar organização:', error)
      setError('Erro ao trocar organização')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando organizações...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadUserOrganizations}
            className="mt-2"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-montserrat font-medium text-foreground">
          Selecionar Organização
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha uma organização para continuar
        </p>
      </div>

      <div className="grid gap-3">
        {organizations.map((org) => (
          <Card 
            key={org.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              organization?.id === org.id 
                ? 'ring-2 ring-primary bg-primary/5' 
                : 'hover:bg-secondary/50'
            }`}
            onClick={() => handleOrganizationSelect(org.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-montserrat font-medium">
                      {org.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {org.description || 'Sem descrição'}
                    </CardDescription>
                  </div>
                </div>
                {organization?.id === org.id && (
                  <Badge variant="default" className="bg-primary text-primary-foreground">
                    Atual
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>Membros</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Settings className="h-4 w-4" />
                    <span>Configurações</span>
                  </div>
                </div>
                <span className="text-xs">
                  Criada em {new Date(org.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {organizations.length === 0 && (
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-montserrat font-medium text-foreground mb-2">
            Nenhuma organização encontrada
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Você não tem acesso a nenhuma organização ainda.
          </p>
          <Button variant="outline" size="sm">
            Solicitar acesso
          </Button>
        </div>
      )}
    </div>
  )
}
