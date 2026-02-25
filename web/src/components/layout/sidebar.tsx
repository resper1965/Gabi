"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { signOut, auth } from "@/lib/firebase"
import {
  PenTool,
  Scale,
  Database,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  Settings,
  BookOpen,
} from "lucide-react"
import { useState } from "react"

const modules = [
  { key: "ghost", label: "gabi.writer", icon: PenTool, href: "/ghost", accent: "var(--color-mod-ghost)" },
  { key: "law", label: "gabi.legal", icon: Scale, href: "/law", accent: "var(--color-mod-law)" },
  { key: "ntalk", label: "gabi.data", icon: Database, href: "/ntalk", accent: "var(--color-mod-ntalk)" },
  { key: "insightcare", label: "gabi.care", icon: ShieldCheck, href: "/insightcare", accent: "var(--color-mod-insightcare)" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const isSuperadmin = profile?.role === "superadmin"
  const allowedModules = profile?.allowed_modules || []
  const visibleModules = modules.filter(
    (m) => isSuperadmin || allowedModules.includes(m.key)
  )

  const initials = user?.email?.slice(0, 2).toUpperCase() || "?"

  return (
    <aside
      className={`${
        collapsed ? "w-[70px]" : "w-[240px]"
      } h-screen flex flex-col glass-panel transition-all duration-300 z-50`}
      style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Brand & Logo */}
      <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 shadow-lg overflow-hidden">
            <img
              src="/logo.png"
              alt="Gabi Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0a]" />
        </div>
        
        {!collapsed && (
          <div className="flex flex-col">
            <span
              className="text-lg text-white font-semibold leading-none"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Gabi<span style={{ color: "var(--color-gabi-primary)" }}>.</span>
            </span>
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter mt-1">
              Ghost Writer AI
            </span>
          </div>
        )}
        
        {!collapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Core Navigation */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
            pathname === "/"
              ? "bg-white/5 text-white shadow-inner"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 shrink-0 ${pathname === "/" ? "text-[var(--color-gabi-primary)]" : ""}`} />
          {!collapsed && <span className="text-sm font-medium tracking-tight">Painel Principal</span>}
        </Link>

        {/* Section: Modules */}
        {!collapsed && (
          <div className="pt-6 pb-2 px-3">
            <span className="text-[0.65rem] font-bold text-slate-600 uppercase tracking-widest">
              Inteligência
            </span>
          </div>
        )}
        {collapsed && <div className="pt-4" />}

        {visibleModules.map((mod) => {
          const isActive = pathname.startsWith(mod.href)
          return (
            <Link
              key={mod.key}
              href={mod.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-white/5 text-white "
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <mod.icon
                className="w-5 h-5 shrink-0 transition-colors"
                style={{ color: isActive ? mod.accent : undefined }}
              />
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium tracking-tight">{mod.label}</span>
                </div>
              )}
            </Link>
          )
        })}

        {/* Section: System & Help */}
        {!collapsed && (
          <div className="pt-6 pb-2 px-3">
            <span className="text-[0.65rem] font-bold text-slate-600 uppercase tracking-widest">
              Suporte
            </span>
          </div>
        )}
        {collapsed && <div className="pt-4" />}

        <Link
          href="/docs"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
            pathname === "/docs"
              ? "bg-white/5 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <BookOpen className={`w-5 h-5 shrink-0 ${pathname === "/docs" ? "text-emerald-400" : ""}`} />
          {!collapsed && <span className="text-sm font-medium tracking-tight">Documentação</span>}
        </Link>

        {(profile?.role === "admin" || profile?.role === "superadmin") && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
              pathname === "/admin"
                ? "bg-white/5 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Settings className={`w-5 h-5 shrink-0 ${pathname === "/admin" ? "text-rose-400" : ""}`} />
            {!collapsed && <span className="text-sm font-medium tracking-tight">Configurações</span>}
          </Link>
        )}
      </div>

      {/* User Session Block */}
      <div className="p-3 mt-auto" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <div
            className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[0.7rem] font-bold"
            style={{
              background: "linear-gradient(135deg, rgba(0,173,232,0.2), rgba(0,173,232,0.05))",
              color: "var(--color-gabi-primary)",
              border: "1px solid rgba(0,173,232,0.2)",
            }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate leading-none mb-1">
                {user?.email?.split('@')[0] || "Usuário"}
              </p>
              <p className="text-[0.65rem] text-slate-500 font-semibold uppercase tracking-wider">
                {profile?.role || "Acesso Básico"}
              </p>
            </div>
          )}
          <button
            onClick={() => signOut(auth)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {collapsed && (
           <button
           onClick={() => setCollapsed(!collapsed)}
           className="w-full mt-3 p-1.5 flex justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
         >
           <ChevronLeft className="w-4 h-4 rotate-180" />
         </button>
        )}
      </div>
    </aside>
  )
}
