'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function OrganizationAdminPage() {
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
      return
    }

    if (!isLoading && isAuthenticated && !hasPermission('org_admin')) {
      router.push('/')
      return
    }
  }, [isAuthenticated, isLoading, hasPermission, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background/80">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !hasPermission('org_admin')) {
    return null
  }

  return (
    <div className="min-h-screen bg-background/80 p-6">
      <AdminDashboard isPlatformAdmin={false} />
    </div>
  )
}
