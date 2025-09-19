'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { RegisterData } from '@/types/auth'

interface RegisterFormProps {
  invitationToken?: string
  onRegisterSuccess?: () => void
  onSwitchToLogin?: () => void
}

export default function RegisterForm({ invitationToken, onRegisterSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register, isLoading } = useAuth()
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    username: '',
    full_name: '',
    password: '',
    confirm_password: '',
    invitation_token: invitationToken
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validações
    if (!formData.email || !formData.username || !formData.full_name || !formData.password) {
      setError('Por favor, preencha todos os campos')
      return
    }

    if (formData.password !== formData.confirm_password) {
      setError('As senhas não coincidem')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      await register(formData)
      onRegisterSuccess?.()
    } catch (error: any) {
      setError(error.message || 'Erro no registro. Tente novamente.')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-background-secondary border-border">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <span className="text-3xl font-montserrat font-medium text-foreground">
              Gabi<span className="text-brand">.</span>
            </span>
          </div>
          <CardTitle className="text-2xl font-montserrat font-medium text-foreground">
            {invitationToken ? 'Aceitar Convite' : 'Criar Conta'}
          </CardTitle>
          <CardDescription className="text-secondary-foreground">
            {invitationToken 
              ? 'Complete seu cadastro para acessar a organização'
              : 'Crie sua conta para começar'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="seu@email.com"
                required
                disabled={isLoading}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="seu_usuario"
                required
                disabled={isLoading}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Seu nome completo"
                required
                disabled={isLoading}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={isLoading}
                  className="bg-secondary border-border text-foreground pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  placeholder="Confirme sua senha"
                  required
                  disabled={isLoading}
                  className="bg-secondary border-border text-foreground pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-montserrat font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {invitationToken ? 'Criando conta...' : 'Registrando...'}
                </>
              ) : (
                invitationToken ? 'Aceitar Convite' : 'Criar Conta'
              )}
            </Button>
          </form>
          
          {onSwitchToLogin && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-primary hover:text-primary/80"
                  onClick={onSwitchToLogin}
                  disabled={isLoading}
                >
                  Fazer login
                </Button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
