"use client"

import { PenTool, Scale, Database, ShieldCheck, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/components/auth-provider"

const modules = [
  {
    key: "ghost",
    name: "gabi.writer",
    tagline: "Sua Ghost Writer",
    description: "Absorve estilo e escreve com fidelidade — Style Signature + RAG",
    icon: PenTool,
    href: "/ghost",
    accent: "var(--color-mod-ghost)",
  },
  {
    key: "law",
    name: "gabi.legal",
    tagline: "Sua Auditora Jurídica",
    description: "4 agentes IA: Auditora, Pesquisadora, Redatora, Sentinela",
    icon: Scale,
    href: "/law",
    accent: "var(--color-mod-law)",
  },
  {
    key: "ntalk",
    name: "gabi.data",
    tagline: "Sua CFO de Dados",
    description: "Converse com seus dados financeiros — SQL em linguagem natural",
    icon: Database,
    href: "/ntalk",
    accent: "var(--color-mod-ntalk)",
  },
  {
    key: "insightcare",
    name: "gabi.care",
    tagline: "Sua Analista de Seguros",
    description: "Sinistralidade, apólices e normas ANS/SUSEP — 3 agentes",
    icon: ShieldCheck,
    href: "/insightcare",
    accent: "var(--color-mod-insightcare)",
  },
]

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  // Redirect pending users
  useEffect(() => {
    if (!loading && profile && profile.status !== "approved") {
      router.replace("/pending")
    }
  }, [profile, loading, router])

  const isSuperadmin = profile?.role === "superadmin"
  const allowedModules = profile?.allowed_modules || []
  const visible = modules.filter(
    (m) => isSuperadmin || allowedModules.includes(m.key)
  )
  const firstName = user?.displayName || user?.email?.split("@")[0] || "Usuário"

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-ui)" }}>
          Olá, {firstName}
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm">Escolha um módulo para começar</p>
      </div>

      {/* Module Cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {visible.map((mod, i) => (
          <Link
            key={mod.key}
            href={mod.href}
            className="group relative rounded-[var(--radius-soft)] tech-border p-6
                       bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-raised)]
                       transition-all duration-200 cursor-pointer"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-[var(--radius-tech)] flex items-center justify-center"
                style={{ background: `${mod.accent}20`, color: mod.accent }}
              >
                <mod.icon className="w-5 h-5" />
              </div>
              <ArrowRight
                className="w-4 h-4 text-slate-600 group-hover:text-white
                           group-hover:translate-x-1 transition-all duration-200"
              />
            </div>
            <h2 className="text-base font-semibold mb-0.5">{mod.name}</h2>
            <p className="text-xs font-medium mb-2" style={{ color: mod.accent }}>{mod.tagline}</p>
            <p className="text-sm text-slate-500 leading-relaxed">{mod.description}</p>

            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full
                         opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: mod.accent }}
            />
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500 text-sm">
            Nenhum módulo está liberado para sua conta.
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Contate o administrador para solicitar acesso.
          </p>
        </div>
      )}
    </div>
  )
}
