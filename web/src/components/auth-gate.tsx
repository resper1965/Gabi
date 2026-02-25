"use client"

import { useAuth } from "./auth-provider"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AppLayout } from "./layout/app-layout"
import { useEffect } from "react"

const PUBLIC_PATHS = ["/login"]

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // Redirect handling with useEffect for client-side navigation
  useEffect(() => {
    if (!loading) {
      if (PUBLIC_PATHS.includes(pathname) && user) {
        router.push("/")
      } else if (!PUBLIC_PATHS.includes(pathname) && !user) {
        router.push("/login")
      }
    }
  }, [user, loading, pathname, router])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center animate-fade-in">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: "var(--color-gabi-primary)" }} />
          <p className="text-slate-500 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  // Prevent flash of content before redirect
  const isPublic = PUBLIC_PATHS.includes(pathname)
  if ((isPublic && user) || (!isPublic && !user)) {
    return null
  }

  // Public pages (login) — no sidebar, no auth required
  if (isPublic) {
    return <>{children}</>
  }

  // Authenticated layout: unified app layout (includes sidebar and main area)
  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}
