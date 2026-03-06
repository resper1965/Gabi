"use client"

import { PenTool, Scale, Database, ArrowRight, Lock, Clock, FileText, Activity } from "lucide-react"
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
    <div className="p-8 max-w-5xl mx-auto animate-fade-in-up font-['Inter',sans-serif]">
      {/* ── Welcome Header ── */}
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <NextImage
              src={avatarUrl}
              alt={firstName}
              width={56}
              height={56}
              unoptimized
              className="w-14 h-14 rounded-xl object-cover glass-panel shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 glass-panel"
              style={{ color: "var(--color-gabi-primary)" }}
            >
              {firstName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-slate-400 text-sm">
              Visão Executiva • Plataforma Gabi
            </p>
          </div>
        </div>
      </div>

      {/* ── Executive KPIs (Swiss Style) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        <div className="glass-panel p-6 rounded-xl flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Tempo Economizado</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white tracking-tighter">142h</span>
            <span className="text-sm font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">+12%</span>
          </div>
        </div>
        
        <div className="glass-panel p-6 rounded-xl flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Normativos Lidos</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tighter">1.2k</span>
            <span className="text-sm font-medium text-slate-400">Nesta semana</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Monitoramento</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-white tracking-tighter">Ativo</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Real-time
            </span>
          </div>
        </div>
      </div>

      {/* ── Active Module Cards ── */}
      {visible.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest">Módulos Habilitados</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {visible.map((mod, i) => (
              <Link
                key={mod.key}
                href={mod.href}
                className="glass-panel group relative rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-slate-600 cursor-pointer overflow-hidden"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between mb-5 relative z-10">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800/50"
                    style={{ color: mod.accent, border: `1px solid ${mod.accent}30` }}
                  >
                    <mod.icon className="w-5 h-5" />
                  </div>
                  <ArrowRight
                    className="w-4 h-4 text-slate-600 group-hover:text-white
                               group-hover:translate-x-1 transition-all duration-200"
                  />
                </div>
                <h2 className="text-lg font-bold text-white mb-1 relative z-10 tracking-tight">{mod.name}</h2>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-3 relative z-10" style={{ color: mod.accent }}>{mod.tagline}</p>
                <p className="text-sm text-slate-400 leading-relaxed relative z-10 font-light">{mod.description}</p>

                {/* Subtle Glow Hover Factor */}
                <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ background: mod.accent }}></div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── Locked Modules (grey, non-clickable) ── */}
      {locked.length > 0 && visible.length > 0 && (
        <>
          <div className="flex items-center gap-3 mt-14 mb-6">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-[0.7rem] font-bold text-slate-600 uppercase tracking-widest">
              Acesso Restrito
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 opacity-40 grayscale">
            {locked.map((mod) => (
              <div
                key={mod.key}
                className="glass-panel relative rounded-xl p-5 select-none"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800/50 border border-slate-700/50"
                  >
                    <mod.icon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-400">{mod.name}</h3>
                    <p className="text-xs text-slate-500 tracking-wide">{mod.tagline}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Full empty state (no modules at all) ── */}
      {visible.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl glass-panel flex items-center justify-center">
            <Lock className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-slate-300 text-base font-medium">
            Nenhum produto Gabi habilitado para seu perfil.
          </p>
          <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto font-light leading-relaxed">
            Consulte o Security Officer ou Administrador do Sistema para solicitar provisionamento ao seu grupo de acesso.
          </p>

          <div className="grid gap-4 md:grid-cols-2 mt-10 opacity-30 max-w-2xl mx-auto grayscale pointer-events-none">
            {allModules.map((mod) => (
              <div
                key={mod.key}
                className="glass-panel rounded-xl p-5 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800/50 border border-slate-700/50">
                  <mod.icon className="w-5 h-5 text-slate-500 shrink-0" />
                </div>
                <div className="text-left">
                    <span className="block text-sm font-bold text-slate-400">{mod.name}</span>
                    <span className="block text-xs text-slate-500">{mod.tagline}</span>
                </div>
                <Lock className="w-4 h-4 text-slate-700 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer Links ── */}
      <div className="mt-16 pb-8 text-center flex flex-col items-center justify-center space-y-4 pt-10">
        <div className="flex items-center gap-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">
            Privacidade
          </Link>
          <span className="text-slate-800">&bull;</span>
          <Link href="/terms" className="hover:text-slate-300 transition-colors">
            Termos
          </Link>
        </div>
      </div>
    </div>
  )
}
