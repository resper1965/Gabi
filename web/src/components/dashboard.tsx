"use client"

import { PenTool, Scale, Database, ShieldCheck, ArrowRight, Lock } from "lucide-react"
import Link from "next/link"
import NextImage from "next/image"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/components/auth-provider"

const allModules = [
  {
    key: "ghost",
    name: "gabi.writer",
    tagline: "Sua IA Escritora",
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

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Bom dia"
  if (hour < 18) return "Boa tarde"
  return "Boa noite"
}

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
  const firstName = profile?.name?.split(" ")[0] || user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Usuário"
  const avatarUrl = profile?.picture || user?.photoURL || null

  const visible = allModules.filter(
    (m) => isSuperadmin || allowedModules.includes(m.key)
  )
  const locked = allModules.filter(
    (m) => !isSuperadmin && !allowedModules.includes(m.key)
  )

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in-up">
      {/* ── Welcome Header ── */}
      <div className="mb-10 flex items-center gap-4">
        {avatarUrl ? (
          <NextImage
            src={avatarUrl}
            alt={firstName}
            width={56}
            height={56}
            unoptimized
            className="w-14 h-14 rounded-2xl object-cover border border-[#334155] shadow-lg shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 bg-[#1E293B] border border-[#334155]"
            style={{ color: "var(--color-gabi-primary)" }}
          >
            {firstName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Plataforma Gabi. — Escolha um módulo para começar
          </p>
        </div>
      </div>

      {/* ── Active Module Cards ── */}
      {visible.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {visible.map((mod, i) => (
            <Link
              key={mod.key}
              href={mod.href}
              className="group relative rounded-2xl border border-[#334155] p-6
                         bg-[#1E293B] hover:bg-[#1E293B]/80 hover:border-[#475569]
                         transition-all duration-200 cursor-pointer"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
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
      )}

      {/* ── Locked Modules (grey, non-clickable) ── */}
      {locked.length > 0 && visible.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-10 mb-4 px-1">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-[0.65rem] font-bold text-slate-600 uppercase tracking-widest">
              Módulos não liberados
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 opacity-40">
            {locked.map((mod) => (
              <div
                key={mod.key}
                className="relative rounded-2xl border border-[#334155] p-5 bg-transparent"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1E293B]"
                  >
                    <mod.icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500">{mod.name}</h3>
                    <p className="text-xs text-slate-600">{mod.tagline}</p>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-slate-600 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Full empty state (no modules at all) ── */}
      {visible.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#1E293B] border border-[#334155] flex items-center justify-center">
            <Lock className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-slate-400 text-sm font-medium">
            Nenhum módulo está liberado para sua conta.
          </p>
          <p className="text-slate-600 text-xs mt-2 max-w-xs mx-auto">
            Os módulos disponíveis aparecerão aqui quando liberados pelo administrador.
          </p>

          {/* Show all modules as locked */}
          <div className="grid gap-4 md:grid-cols-2 mt-8 opacity-30 max-w-xl mx-auto">
            {allModules.map((mod) => (
              <div
                key={mod.key}
                className="rounded-2xl border border-[#334155] p-4 bg-transparent flex items-center gap-3"
              >
                <mod.icon className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="text-sm text-slate-500">{mod.name}</span>
                <Lock className="w-3 h-3 text-slate-700 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer Links ── */}
      <div className="mt-16 pb-8 text-center flex flex-col items-center justify-center space-y-3 border-t border-[#1E293B] pt-8">
        <div className="flex items-center gap-6 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Política de Privacidade
          </Link>
          <span className="text-slate-700">&bull;</span>
          <Link href="/terms" className="hover:text-white transition-colors">
            Termos de Serviço
          </Link>
        </div>
        <p className="text-[10px] text-slate-600">
          &copy; {new Date().getFullYear()} Ness. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
