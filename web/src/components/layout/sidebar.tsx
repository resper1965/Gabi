"use client"

import Link from "next/link"
import NextImage from "next/image"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { NessBrand } from "@/components/ness-brand"
import { signOut, auth } from "@/lib/firebase"
import {
  PenTool,
  Scale,
  Database,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  BookOpen,
  Sparkles,
} from "lucide-react"
import { useState } from "react"

const modules = [
  { key: "ghost", label: "gabi.writer", icon: PenTool, href: "/ghost", accent: "var(--color-mod-ghost)" },
  { key: "law", label: "gabi.legal", icon: Scale, href: "/law", accent: "var(--color-mod-law)" },
  { key: "ntalk", label: "gabi.data", icon: Database, href: "/ntalk", accent: "var(--color-mod-ntalk)" },
]

const ENV_LABEL = process.env.NEXT_PUBLIC_ENV || (
  typeof window !== "undefined" && window.location.hostname.includes("staging") ? "STAGING" : "PROD"
)

export function Sidebar() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const isSuperadmin = profile?.role === "superadmin"
  const allowedModules = profile?.allowed_modules || []
  const visibleModules = modules.filter(
    (m) => isSuperadmin || allowedModules.includes(m.key)
  )

  const displayName = profile?.name || user?.displayName || user?.email?.split("@")[0] || "Usuário"
  const avatarUrl = profile?.picture || user?.photoURL || null
  const initials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
  const roleLabel = profile?.role === "superadmin" ? "Super Admin" : profile?.role === "admin" ? "Admin" : "Usuário"
  const roleColor = profile?.role === "superadmin" ? "#10b981" : profile?.role === "admin" ? "#f59e0b" : "#64748b"

  return (
    <aside
      className={`${
        collapsed ? "w-[72px]" : "w-[250px]"
      } h-screen flex flex-col transition-all duration-300 z-50 relative`}
      style={{
        background: "var(--color-surface-glass)",
        backdropFilter: "blur(12px)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Brand Header ── */}
      <div
        className="p-4 flex items-center gap-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 shadow-lg overflow-hidden">
            <NextImage
              src="/logo.png"
              alt="Gabi Logo"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0a]" />
        </div>

        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span
              className="text-lg text-white font-semibold leading-none"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Gabi<span style={{ color: "var(--color-gabi-primary)" }}>.</span>
            </span>
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">
              ness.AI
            </span>
          </div>
        )}

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
            title="Recolher sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Expand button (collapsed state) ── */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-surface-card border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-emerald-500/50 transition-all shadow-lg z-50"
          title="Expandir sidebar"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}

      {/* ── Navigation ── */}
      <div className="flex-1 p-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        {/* Dashboard */}
        <NavItem
          href="/"
          icon={LayoutDashboard}
          label="Painel Principal"
          isActive={pathname === "/"}
          activeColor="var(--color-gabi-primary)"
          collapsed={collapsed}
        />

        {/* Radar Regulatório */}
        <NavItem
          href="/regulatory/insights"
          icon={Sparkles}
          label="Radar Regulatório"
          isActive={pathname === "/regulatory/insights"}
          activeColor="#f59e0b"
          collapsed={collapsed}
        />

        {/* Section: Módulos de IA */}
        <SectionHeader label="Inteligência" collapsed={collapsed} />

        {visibleModules.map((mod) => (
          <NavItem
            key={mod.key}
            href={mod.href}
            icon={mod.icon}
            label={mod.label}
            isActive={pathname.startsWith(mod.href)}
            activeColor={mod.accent}
            collapsed={collapsed}
          />
        ))}

        {/* Section: Suporte */}
        <SectionHeader label="Suporte" collapsed={collapsed} />

        <NavItem
          href="/docs"
          icon={BookOpen}
          label="Documentação"
          isActive={pathname === "/docs"}
          activeColor="#10b981"
          collapsed={collapsed}
        />

        {(profile?.role === "admin" || profile?.role === "superadmin") && (
          <NavItem
            href="/admin"
            icon={Settings}
            label="Administração"
            isActive={pathname === "/admin"}
            activeColor="#f43f5e"
            collapsed={collapsed}
          />
        )}
      </div>

      {/* ── User Block ── */}
      <div className="p-3 mt-auto shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className={`flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/5 ${collapsed ? "justify-center" : ""}`}>
          {/* Avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-9 h-9 rounded-lg shrink-0 object-cover border border-white/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-[0.7rem] font-bold"
              style={{
                background: `linear-gradient(135deg, ${roleColor}33, ${roleColor}15)`,
                color: roleColor,
                border: `1px solid ${roleColor}33`,
              }}
            >
              {initials}
            </div>
          )}

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate leading-tight">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: roleColor }}
                />
                <span className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: roleColor }}>
                  {roleLabel}
                </span>
              </div>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={() => {
                try { localStorage.removeItem("gabi_profile_cache") } catch {}
                signOut(auth)
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 shrink-0"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed: logout below */}
        {collapsed && (
          <button
            onClick={() => {
              try { localStorage.removeItem("gabi_profile_cache") } catch {}
              signOut(auth)
            }}
            className="w-full mt-2 p-1.5 flex justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}

        {/* Environment + ness. branding */}
        <div className="mt-2 flex items-center justify-center gap-2">
          <span
            className="text-[0.55rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              background: ENV_LABEL === "PROD" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
              color: ENV_LABEL === "PROD" ? "#10b981" : "#f59e0b",
              border: `1px solid ${ENV_LABEL === "PROD" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
            }}
          >
            {ENV_LABEL === "PROD" ? "●" : "●"}
          </span>
          {!collapsed && (
            <span className="text-[0.6rem] text-slate-600">
              por <NessBrand size="text-[0.6rem]" />
            </span>
          )}
        </div>
      </div>
    </aside>
  )
}

/* ── Reusable Nav Item ── */
function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  activeColor,
  collapsed,
}: {
  href: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  isActive: boolean
  activeColor: string
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
        isActive
          ? "bg-white/5 text-white shadow-inner"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      } ${collapsed ? "justify-center" : ""}`}
      title={collapsed ? label : undefined}
    >
      <Icon
        className="w-5 h-5 shrink-0 transition-colors"
        style={{ color: isActive ? activeColor : undefined }}
      />
      {!collapsed && (
        <span className="text-sm font-medium tracking-tight truncate">{label}</span>
      )}
    </Link>
  )
}

/* ── Section Header ── */
function SectionHeader({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="pt-3" />
  return (
    <div className="pt-5 pb-1.5 px-3">
      <div className="flex items-center gap-2">
        <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">
          {label}
        </span>
        <div className="flex-1 h-px bg-white/5" />
      </div>
    </div>
  )
}
