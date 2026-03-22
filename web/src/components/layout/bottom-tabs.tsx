"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import {
  Sparkles,
  LayoutDashboard,
  BookOpen,
  Settings,
  User,
} from "lucide-react"
import { useState } from "react"

/* ── Mobile user menu (slide-up sheet) ── */
function UserSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { user, profile } = useAuth()
  const displayName = profile?.name || user?.displayName || user?.email?.split("@")[0] || "Usuário"
  const roleLabel = profile?.role === "superadmin" ? "Super Admin" : profile?.role === "admin" ? "Admin" : "Usuário"

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-[68px] left-3 right-3 z-[95] rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
        style={{ background: "var(--color-surface-card)" }}
      >
        <div className="p-4 space-y-2">
          <p className="text-sm text-white font-medium">{displayName}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
        <div className="border-t border-white/5 p-2 space-y-0.5">
          {(profile?.role === "admin" || profile?.role === "superadmin") && (
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Administração</span>
            </Link>
          )}
          <Link
            href="/docs"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-sm">Documentação</span>
          </Link>
          <button
            onClick={() => {
              try { localStorage.removeItem("gabi_profile_cache") } catch {}
              import("@/lib/firebase").then(({ signOut, auth }) => signOut(auth))
              onClose()
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Bottom Tab Bar ── */
export function BottomTabs() {
  const pathname = usePathname()
  const { profile } = useAuth()
  const [userSheetOpen, setUserSheetOpen] = useState(false)

  const isSuperadmin = profile?.role === "superadmin"
  const allowedModules = profile?.allowed_modules || []
  const hasGabi = isSuperadmin || allowedModules.includes("law") || allowedModules.includes("gabi")

  const tabs = [
    { key: "home", label: "Painel", icon: LayoutDashboard, href: "/" },
    ...(hasGabi ? [{ key: "gabi", label: "Gabi", icon: Sparkles, href: "/chat" }] : []),
  ]

  return (
    <>
      <UserSheet open={userSheetOpen} onClose={() => setUserSheetOpen(false)} />

      <nav
        className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden border-t border-white/8"
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-stretch justify-around h-[60px] max-w-md mx-auto">
          {tabs.map((tab) => {
            const isActive = tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href)
            const Icon = tab.icon

            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors duration-150 relative ${
                  isActive ? "text-white" : "text-slate-500 active:text-slate-300"
                }`}
              >
                {isActive && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full"
                    style={{ background: "var(--color-gabi-primary)" }}
                  />
                )}
                <Icon
                  className="w-5 h-5"
                  style={isActive ? { color: "var(--color-gabi-primary)" } : undefined}
                />
                <span className="text-[10px] font-medium tracking-tight">{tab.label}</span>
              </Link>
            )
          })}

          {/* User/More tab */}
          <button
            onClick={() => setUserSheetOpen(!userSheetOpen)}
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors duration-150 ${
              userSheetOpen ? "text-white" : "text-slate-500 active:text-slate-300"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight">Mais</span>
          </button>
        </div>
      </nav>
    </>
  )
}
