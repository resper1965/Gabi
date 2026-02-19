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
} from "lucide-react"
import { useState } from "react"

const modules = [
  { key: "writer", label: "gabi.writer", icon: PenTool, href: "/ghost", accent: "var(--color-mod-ghost)", roles: ["ghost", "admin"] },
  { key: "legal", label: "gabi.legal", icon: Scale, href: "/law", accent: "var(--color-mod-law)", roles: ["law", "admin"] },
  { key: "data", label: "gabi.data", icon: Database, href: "/ntalk", accent: "var(--color-mod-ntalk)", roles: ["ntalk", "admin"] },
  { key: "care", label: "gabi.care", icon: ShieldCheck, href: "/insightcare", accent: "var(--color-mod-insightcare)", roles: ["insightcare", "admin"] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, role } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const visibleModules = modules.filter(
    (m) => m.roles.includes(role) || role === "admin"
  )

  const initials = user?.email?.slice(0, 2).toUpperCase() || "?"

  return (
    <aside
      className={`${
        collapsed ? "w-[60px]" : "w-[220px]"
      } h-screen flex flex-col glass-panel transition-all duration-300`}
      style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Brand */}
      <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: "linear-gradient(135deg, var(--color-gabi-primary), var(--color-gabi-dark))" }}
        >
          g
        </div>
        {!collapsed && (
          <span className="brand-mark text-lg text-white">
            gabi<span className="dot">.</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-slate-500 hover:text-white transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-tech)] transition-all duration-200 ${
            pathname === "/"
              ? "nav-link-active bg-white/5 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Dashboard</span>}
        </Link>

        {!collapsed && (
          <div className="pt-4 pb-1 px-3">
            <span className="text-[0.6rem] font-semibold text-slate-600 uppercase tracking-widest">
              Módulos
            </span>
          </div>
        )}
        {collapsed && <div className="pt-2" />}

        {visibleModules.map((mod) => {
          const isActive = pathname.startsWith(mod.href)
          return (
            <Link
              key={mod.key}
              href={mod.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-tech)] transition-all duration-200 ${
                isActive
                  ? "nav-link-active bg-white/5 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <mod.icon
                className="w-5 h-5 shrink-0 transition-colors"
                style={{ color: isActive ? mod.accent : undefined }}
              />
              {!collapsed && <span className="text-sm font-medium">{mod.label}</span>}
            </Link>
          )
        })}

        {/* Admin Link */}
        {role === "admin" && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-1 px-3">
                <span className="text-[0.6rem] font-semibold text-slate-600 uppercase tracking-widest">
                  Sistema
                </span>
              </div>
            )}
            {collapsed && <div className="pt-2" />}
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-tech)] transition-all duration-200 ${
                pathname === "/admin"
                  ? "nav-link-active bg-white/5 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className="w-5 h-5 shrink-0" style={{ color: pathname === "/admin" ? "#ef4444" : undefined }} />
              {!collapsed && <span className="text-sm font-medium">Admin</span>}
            </Link>
          </>
        )}
      </nav>

      {/* User Block */}
      <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[0.6rem] font-bold uppercase"
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(16,185,129,0.1))",
              color: "var(--color-gabi-primary)",
              border: "1px solid rgba(16,185,129,0.3)",
            }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.email || "—"}</p>
              <p className="text-[0.6rem] text-slate-500 uppercase tracking-wider font-medium">{role}</p>
            </div>
          )}
          <button
            onClick={() => signOut(auth)}
            className="p-1.5 rounded-[var(--radius-tech)] text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
