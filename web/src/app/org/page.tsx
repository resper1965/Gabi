"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/auth-provider"
import { gabiOrg, type OrgInfo } from "@/lib/api"
import {
  Building2, Users, Package, BarChart3, Send, Loader2,
  RefreshCw, Crown, UserPlus, CheckCircle2
} from "lucide-react"
import { toast } from "sonner"

const MODULE_LABELS: Record<string, string> = { ghost: "Writer", law: "Legal", ntalk: "Data" }
const MODULE_COLORS: Record<string, string> = {
  ghost: "var(--color-mod-ghost)", law: "var(--color-mod-law)", ntalk: "var(--color-mod-ntalk)",
}

export default function OrgDashboardPage() {
  const { profile } = useAuth()
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [sending, setSending] = useState(false)

  const fetchOrg = useCallback(async () => {
    setLoading(true)
    try {
      const data = await gabiOrg.getMyOrg()
      setOrg(data.org)
    } catch {
      toast.error("Erro ao carregar organização")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchOrg() }, [fetchOrg])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setSending(true)
    try {
      await gabiOrg.sendInvite({ email: inviteEmail, role: inviteRole })
      toast.success(`Convite enviado para ${inviteEmail}`)
      setInviteEmail("")
      fetchOrg()
    } catch {
      toast.error("Erro ao enviar convite")
    } finally { setSending(false) }
  }

  if (!profile?.org_id) {
    return (
      <div className="flex items-center justify-center h-full animate-fade-in-up">
        <div className="text-center max-w-sm">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Sem organização</h2>
          <p className="text-slate-500 text-sm mb-6">
            Crie uma nova organização ou peça um convite para um administrador.
          </p>
          <a
            href="/org/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, var(--color-gabi-primary), color-mix(in srgb, var(--color-gabi-primary) 70%, black))",
              boxShadow: "0 4px 20px rgba(16,185,129,0.2)",
            }}
          >
            <Building2 className="w-4 h-4" />
            Criar Organização
          </a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!org) return null

  const isAdmin = profile.org_role === "owner" || profile.org_role === "admin"
  const opsPercent = org.limits ? Math.min(100, (org.usage?.ops_count || 0) / org.limits.max_ops_month * 100) : 0

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            Plano {org.plan} · {org.members.length} membro{org.members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={fetchOrg}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer bg-[#1E293B] text-slate-400 hover:text-white border border-[#334155] transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Membros", value: `${org.members.length}/${org.limits?.max_seats || "∞"}`, icon: Users, color: "var(--color-gabi-primary)" },
          { label: "Módulos", value: org.modules.filter(m => m.enabled).length, icon: Package, color: "var(--color-mod-ghost)" },
          { label: "Ops/mês", value: `${org.usage?.ops_count || 0}/${org.limits?.max_ops_month || "∞"}`, icon: BarChart3, color: "var(--color-mod-law)" },
          { label: "Plano", value: org.plan.charAt(0).toUpperCase() + org.plan.slice(1), icon: Crown, color: "#fbbf24" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-[#1E293B] border border-[#334155] p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
              <span className="text-xs text-slate-500 font-medium">{card.label}</span>
            </div>
            <p className="text-xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Usage Bar */}
      {org.limits && (
        <div className="mb-8 rounded-2xl bg-[#1E293B] border border-[#334155] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">Uso mensal</span>
            </div>
            <span className="text-xs text-slate-500">{org.usage?.ops_count || 0} / {org.limits.max_ops_month} operações</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${opsPercent}%`,
                background: opsPercent > 80 ? "#ef4444" : opsPercent > 50 ? "#fbbf24" : "var(--color-gabi-primary)",
              }}
            />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Members */}
        <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden">
          <div className="p-4 border-b border-[#334155] flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">Membros</h2>
          </div>
          <div className="divide-y divide-[#334155]">
            {org.members.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[0.6rem] font-bold text-slate-400 shrink-0">
                  {m.email.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{m.email}</p>
                  <p className="text-[0.6rem] text-slate-500">
                    {m.joined_at ? `Desde ${new Date(m.joined_at).toLocaleDateString("pt-BR")}` : "Convite pendente"}
                  </p>
                </div>
                <span
                  className="text-[0.6rem] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    color: m.role === "owner" ? "#fbbf24" : m.role === "admin" ? "#818cf8" : "#94a3b8",
                    background: m.role === "owner" ? "rgba(251,191,36,0.1)" : m.role === "admin" ? "rgba(129,140,248,0.1)" : "rgba(148,163,184,0.05)",
                  }}
                >
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Modules + Invite */}
        <div className="space-y-6">
          {/* Modules */}
          <div className="rounded-2xl bg-[#1E293B] border border-[#334155] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold">Módulos</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {org.modules.map((m) => (
                <span
                  key={m.module}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
                  style={{
                    color: m.enabled ? MODULE_COLORS[m.module] || "#94a3b8" : "#475569",
                    background: m.enabled ? `${MODULE_COLORS[m.module] || "#94a3b8"}15` : "transparent",
                    border: `1px solid ${m.enabled ? `${MODULE_COLORS[m.module] || "#94a3b8"}30` : "#334155"}`,
                  }}
                >
                  {m.enabled && <CheckCircle2 className="w-3 h-3" />}
                  gabi.{MODULE_LABELS[m.module]?.toLowerCase() || m.module}
                </span>
              ))}
            </div>
          </div>

          {/* Invite Form */}
          {isAdmin && (
            <div className="rounded-2xl bg-[#1E293B] border border-[#334155] p-5">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold">Convidar membro</h2>
              </div>
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@empresa.com"
                    className="flex-1 bg-transparent border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="bg-transparent border border-[#334155] rounded-xl px-3 py-2.5 text-sm text-slate-300 cursor-pointer"
                  >
                    <option value="member" style={{ background: "#1a2332" }}>Membro</option>
                    <option value="admin" style={{ background: "#1a2332" }}>Admin</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={sending || !inviteEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar convite
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
