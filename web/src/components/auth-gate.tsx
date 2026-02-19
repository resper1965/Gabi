"use client"

import { useAuth } from "./auth-provider"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { ErrorBoundary } from "./error-boundary"
import { Loader2 } from "lucide-react"

const PUBLIC_PATHS = ["/login"]

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()

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

  // Public pages (login) — no sidebar, no auth required
  if (PUBLIC_PATHS.includes(pathname)) {
    if (user) {
      // Already logged in, redirect to dashboard
      if (typeof window !== "undefined") window.location.href = "/"
      return null
    }
    return <>{children}</>
  }

  // Protected pages — require auth
  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login"
    return null
  }

  // Authenticated layout: sidebar + content + error boundary
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
