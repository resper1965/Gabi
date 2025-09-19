'use client'
import Sidebar from '@/components/chat/Sidebar/Sidebar'
import { ChatArea } from '@/components/chat/ChatArea'
import HydrationBoundary from '@/components/HydrationBoundary'
import { useAuth } from '@/contexts/AuthContext'
import LoginForm from '@/components/auth/LoginForm'
import OrganizationSelector from '@/components/auth/OrganizationSelector'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { isAuthenticated, isLoading, organization } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background/80">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={() => window.location.reload()} />;
  }

  if (!organization) {
    return (
      <div className="flex h-screen items-center justify-center bg-background/80">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Selecionar Organização</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha uma organização para continuar
            </p>
          </div>
          <OrganizationSelector 
            onOrganizationChange={() => window.location.reload()} 
          />
        </div>
      </div>
    );
  }

  return (
    <HydrationBoundary>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-background/80">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Carregando chat...</span>
          </div>
        </div>
      }>
        <div className="flex h-screen bg-background/80">
          <Sidebar />
          <ChatArea />
        </div>
      </Suspense>
    </HydrationBoundary>
  )
}
