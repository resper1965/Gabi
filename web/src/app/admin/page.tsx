"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Shield, RefreshCw, Users, Building2, DollarSign, Zap } from "lucide-react"
import AdminUsersTab from "./components/AdminUsersTab"
import AdminOrgsTab from "./components/AdminOrgsTab"
import AdminFinOpsTab from "./components/AdminFinOpsTab"
import AdminRagTab from "./components/AdminRagTab"

type AdminTab = "users" | "orgs" | "finops" | "rag"

export default function AdminPage() {
  const { profile } = useAuth()
  const isSuperadmin = profile?.role === "superadmin"
  
  const [activeTab, setActiveTab] = useState<AdminTab>("users")
  const [refreshKey, setRefreshKey] = useState(0)

  if (profile?.role !== "admin" && profile?.role !== "superadmin") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Acesso restrito a administradores</p>
        </div>
      </div>
    )
  }

  const TABS: { key: AdminTab; label: string; icon: React.ElementType; color: string; superOnly?: boolean }[] = [
    { key: "users", label: "Usuários", icon: Users, color: "var(--color-gabi-primary)" },
    { key: "orgs", label: "Organizações", icon: Building2, color: "#38bdf8", superOnly: true },
    { key: "finops", label: "FinOps", icon: DollarSign, color: "#34d399", superOnly: true },
    { key: "rag", label: "Acervo IA", icon: Zap, color: "#818cf8" },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão centralizada da plataforma</p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer bg-[#1E293B] text-slate-400 hover:text-white border border-[#334155] transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* TABS */}
      <div className="flex border-b border-[#334155] mb-6">
        {TABS.filter(t => !t.superOnly || isSuperadmin).map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === t.key ? "text-white" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
            style={{ borderBottomColor: activeTab === t.key ? t.color : "transparent" }}
          >
            <t.icon className="w-4 h-4" style={{ color: activeTab === t.key ? t.color : undefined }} />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "users" && <AdminUsersTab isSuperadmin={isSuperadmin} refreshKey={refreshKey} />}
      {activeTab === "orgs" && <AdminOrgsTab isSuperadmin={isSuperadmin} refreshKey={refreshKey} />}
      {activeTab === "finops" && <AdminFinOpsTab isSuperadmin={isSuperadmin} refreshKey={refreshKey} />}
      {activeTab === "rag" && <AdminRagTab refreshKey={refreshKey} />}
    </div>
  )
}
