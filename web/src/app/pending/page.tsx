"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Clock, LogOut } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { auth, signOut } from "@/lib/firebase"

export default function PendingPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  // Redirect if approved or not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
      return
    }
    if (profile?.status === "approved") {
      router.replace("/")
      return
    }
  }, [user, profile, loading, router])

  // Poll for approval every 10s
  useEffect(() => {
    if (!user || profile?.status === "approved") return

    const interval = setInterval(async () => {
      try {
        const token = await user.getIdToken()
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.status === "approved") {
            router.replace("/")
          }
        }
      } catch { /* ignore */ }
    }, 10000)

    return () => clearInterval(interval)
  }, [user, profile, router])

  const handleSignOut = async () => {
    await signOut(auth)
    router.replace("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center cyber-grid">
        <div className="animate-spin w-6 h-6 border-2 border-slate-600 border-t-white rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center cyber-grid">
      <div className="w-full max-w-md text-center animate-fade-in-up">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" }}
        >
          <Clock className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: "var(--font-ui)" }}>
          Aguardando aprovação
        </h1>

        <p className="text-slate-400 text-sm leading-relaxed mb-2">
          Sua conta <span className="text-white font-medium">{user?.email}</span> foi registrada com sucesso.
        </p>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Um administrador precisa aprovar seu acesso e definir quais módulos você poderá utilizar.
          Esta página será atualizada automaticamente.
        </p>

        {/* Status indicator */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-8">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Verificando a cada 10 segundos...
        </div>

        <div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

        <p className="text-slate-700 text-xs mt-10">
          © {new Date().getFullYear()} ness<span className="neon-text">.</span>
        </p>
      </div>
    </div>
  )
}
