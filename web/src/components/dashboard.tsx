"use client"

import { PenTool, Scale, Database, ArrowRight, Lock, Clock, FileText, Activity } from "lucide-react"
import Link from "next/link"
import NextImage from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { gabi } from "@/lib/api"

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
  const isAdmin = profile?.role === "admin" || isSuperadmin
  const allowedModules = profile?.allowed_modules || []
  const firstName = profile?.name?.split(" ")[0] || user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Usuário"
  const avatarUrl = profile?.picture || user?.photoURL || null

  // ── Dynamic KPIs ──
  const [stats, setStats] = useState<{ users: number; documents: { total: number }; database_size_mb: number } | null>(null)

  useEffect(() => {
    if (isAdmin) {
      gabi.admin.stats()
        .then((data) => setStats(data as { users: number; documents: { total: number }; database_size_mb: number }))
        .catch(() => {})
    }
  }, [isAdmin])

  const visible = allModules.filter(
    (m) => isSuperadmin || allowedModules.includes(m.key)
  )
  const locked = allModules.filter(
    (m) => !isSuperadmin && !allowedModules.includes(m.key)
  )

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden font-['Inter',sans-serif] selection:bg-(--color-gabi-primary) selection:text-white">
      {/* ── Background Grid & Aurora Elements ── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-(--color-gabi-primary) rounded-full blur-[140px] opacity-10 mix-blend-screen pointer-events-none animate-pulse-slow" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-(--color-mod-law) rounded-full blur-[140px] opacity-10 mix-blend-screen pointer-events-none" />

      <div className="relative z-10 p-8 pt-16 max-w-5xl mx-auto animate-fade-in-up">
        {/* ── Welcome Header ── */}
        <div className="mb-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {avatarUrl ? (
              <NextImage
                src={avatarUrl}
                alt={firstName}
                width={64}
                height={64}
                unoptimized
                className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 bg-white/5 border border-white/10 shadow-inner overflow-hidden relative"
                style={{ color: "var(--color-gabi-primary)" }}
              >
                <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-transparent opacity-50"></div>
                {firstName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white mb-1 drop-shadow-sm">
                {getGreeting()}, <span className="text-transparent bg-clip-text bg-linear-to-r from-white to-slate-400">{firstName}</span>
              </h1>
              <p className="text-slate-400 text-sm tracking-wide font-light">
                Visão Executiva • Plataforma Gabi
              </p>
            </div>
          </div>
        </div>

        {/* ── Executive KPIs (Dynamic) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:bg-white/[0.04] transition-colors duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-500" />
            <div className="flex items-center gap-3 mb-5 relative z-10">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usuários Registrados</span>
            </div>
            <div className="flex items-baseline gap-3 relative z-10">
              <span className="text-4xl font-bold text-white tracking-tighter">
                {stats ? stats.users : "—"}
              </span>
            </div>
          </div>
          
          <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:bg-white/[0.04] transition-colors duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-500/20 transition-all duration-500" />
            <div className="flex items-center gap-3 mb-5 relative z-10">
              <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documentos Indexados</span>
            </div>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className="text-4xl font-bold text-white tracking-tighter">
                {stats ? stats.documents.total : "—"}
              </span>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:bg-white/[0.04] transition-colors duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/20 transition-all duration-500" />
            <div className="flex items-center gap-3 mb-5 relative z-10">
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monitoramento Ativo</span>
            </div>
            <div className="flex items-center gap-3 relative z-10 pt-1">
              <span className="flex items-center gap-2 text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Sistemas Online
              </span>
            </div>
          </div>
        </div>

        {/* ── Active Module Cards ── */}
        {visible.length > 0 && (
          <>
            <div className="flex items-center gap-4 mb-8">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Módulos Inteligentes</span>
              <div className="h-px bg-linear-to-r from-white/10 to-transparent flex-1" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((mod, i) => (
                <Link
                  key={mod.key}
                  href={mod.href}
                  className="bg-white/5 border border-white/10 group relative rounded-2xl p-7 transition-all duration-500 hover:-translate-y-1.5 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] cursor-pointer overflow-hidden backdrop-blur-xl"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center bg-black/40 shadow-inner backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
                      style={{ color: mod.accent, border: `1px solid ${mod.accent}40`, boxShadow: `0 0 15px ${mod.accent}20 inset` }}
                    >
                      <mod.icon className="w-6 h-6" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-white/10 transition-colors duration-300">
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-all duration-300 group-hover:-rotate-45" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-1 relative z-10 tracking-tight">{mod.name}</h2>
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-4 relative z-10" style={{ color: mod.accent }}>{mod.tagline}</p>
                  <p className="text-sm text-slate-400 leading-relaxed relative z-10 font-light group-hover:text-slate-300 transition-colors duration-300">{mod.description}</p>

                  {/* Deep Glow Hover Factor */}
                  <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700" style={{ background: mod.accent }}></div>
                  <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ── Locked Modules ── */}
        {locked.length > 0 && visible.length > 0 && (
          <>
            <div className="flex items-center gap-4 mt-20 mb-8">
              <Lock className="w-4 h-4 text-slate-600" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Acesso Restrito
              </span>
              <div className="h-px bg-linear-to-r from-white/5 to-transparent flex-1" />
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 opacity-60">
              {locked.map((mod) => (
                <div
                  key={mod.key}
                  className="bg-transparent border border-white/[0.03] relative rounded-2xl p-6 select-none grayscale"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.02]"
                    >
                      <mod.icon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-500 mb-0.5">{mod.name}</h3>
                      <p className="text-[10px] text-slate-600 tracking-wider uppercase">{mod.tagline}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Full empty state (no modules at all) ── */}
        {visible.length === 0 && (
          <div className="text-center py-32 flex flex-col items-center justify-center relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-slate-800/20 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl relative z-10 shadow-2xl">
              <Lock className="w-8 h-8 text-slate-400" />
            </div>
            
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-3 relative z-10">
              Acesso em Revisão
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto font-light leading-relaxed relative z-10 mb-12">
              Seu perfil está autenticado, mas nenhum módulo Gabi foi habilitado. Consulte o Security Officer ou o seu Administrador de Sistema para provisionar acesso ao seu grupo.
            </p>

            <div className="grid gap-5 sm:grid-cols-2 opacity-30 max-w-3xl mx-auto grayscale pointer-events-none relative z-10 w-full">
              {allModules.slice(0, 2).map((mod) => (
                <div
                  key={mod.key}
                  className="bg-white/5 border border-white/5 rounded-2xl p-6 flex items-start gap-4 text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/30 shrink-0">
                    <mod.icon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-0.5">{mod.name}</h3>
                    <p className="text-[10px] text-slate-500 leading-snug">{mod.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
