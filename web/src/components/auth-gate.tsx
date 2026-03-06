"use client"

import { useAuth } from "./auth-provider"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AppLayout } from "./layout/app-layout"
import { useEffect } from "react"

const PUBLIC_PATHS = ["/login", "/landing", "/privacy", "/terms", "/trust"]

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // Redirect handling with useEffect for client-side navigation
  useEffect(() => {
    if (!loading) {
      // "/" is hybrid — handled below, no redirects
      if (pathname === "/") return

      if (PUBLIC_PATHS.includes(pathname) && user) {
        router.push("/")
      } else if (!PUBLIC_PATHS.includes(pathname) && !user) {
        router.push("/login")
      }
    }
  }, [user, loading, pathname, router])

  // Loading state — show spinner while Firebase resolves auth
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

  // "/" is hybrid: show AppLayout for authenticated, bare page for anonymous
  // Use BOTH user AND profile to determine auth state reliably
  if (pathname === "/") {
    if (user) {
      return <AppLayout>{children}</AppLayout>
    }
    // If we have a cached profile but user hasn't loaded yet, show spinner
    // (this prevents flash of landing page during auth transition)
    if (profile && !user) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center animate-fade-in">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: "var(--color-gabi-primary)" }} />
            <p className="text-slate-500 text-sm">Carregando...</p>
          </div>
        </div>
      )
    }
    return <>{children}</>
  }

  // Prevent flash of content before redirect
  const isPublic = PUBLIC_PATHS.includes(pathname)
  if ((isPublic && user) || (!isPublic && !user)) {
    return null
  }

  // Public pages (login, privacy, terms) — no sidebar, no auth required
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
