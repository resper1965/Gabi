"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/auth-provider"
import { gabiPlatform, type PlatformStats, type PlatformOrgInfo } from "@/lib/api"
import {
  Building2, Users, BarChart3, Wifi, Loader2, RefreshCw,
  Shield, ChevronLeft, ChevronRight, Crown
} from "lucide-react"
import { toast } from "sonner"

const PLAN_COLORS: Record<string, string> = {
  trial: "#fbbf24", starter: "#38bdf8", pro: "#818cf8", enterprise: "#f472b6",
}

export default function PlatformAdminPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [orgs, setOrgs] = useState<PlatformOrgInfo[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [changingPlan, setChangingPlan] = useState<string | null>(null)
  const limit = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, o] = await Promise.all([
        gabiPlatform.stats(),
        gabiPlatform.listOrgs(limit, page * limit),
      ])
      setStats(s)
      setOrgs(o.orgs)
      setTotal(o.total)
    } catch {
      toast.error("Erro ao carregar dados da plataforma")
    } finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  const handleChangePlan = async (orgId: string, planName: string) => {
    setChangingPlan(orgId)
    try {
      await gabiPlatform.changePlan(orgId, planName)
      toast.success(`Plano alterado para ${planName}`)
      fetchData()
    } catch {
      toast.error("Erro ao alterar plano")
    } finally { setChangingPlan(null) }
  }

  if (profile?.role !== "superadmin" || !profile?.email?.endsWith("@ness.com.br")) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Acesso restrito à plataforma ness.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Plataforma <span style={{ color: "var(--color-gabi-primary)" }}>ness.</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestão global de organizações e operações</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer bg-[#1E293B] text-slate-400 hover:text-white border border-[#334155] transition-all"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Organizações", value: stats.total_orgs, icon: Building2, color: "var(--color-gabi-primary)" },
            { label: "Usuários ativos", value: stats.total_users, icon: Users, color: "var(--color-mod-law)" },
            { label: "Ops este mês", value: stats.ops_this_month.toLocaleString("pt-BR"), icon: BarChart3, color: "var(--color-gabi-primary)" },
            { label: "Sessões ativas", value: stats.active_sessions, icon: Wifi, color: "#38bdf8" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl bg-[#1E293B] border border-[#334155] p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
                <span className="text-xs text-slate-500 font-medium">{card.label}</span>
              </div>
              <p className="text-2xl font-semibold">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Orgs Table */}
      <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden">
        <div className="p-4 border-b border-[#334155] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">Organizações</h2>
            <span className="text-xs text-slate-500">({total})</span>
          </div>
          {/* Pagination */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {page * limit + 1}–{Math.min((page + 1) * limit, total)} de {total}
            </span>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-white/5 text-slate-500 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * limit >= total}
              className="p-1 rounded hover:bg-white/5 text-slate-500 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <table className="data-grid w-full">
          <thead>
            <tr>
              <th>Organização</th>
              <th>Plano</th>
              <th>Membros</th>
              <th>Ops/mês</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id}>
                <td>
                  <div>
                    <p className="text-sm text-white font-medium">{org.name}</p>
                    <p className="text-[0.65rem] text-slate-500">
                      {org.sector || "—"} · {org.cnpj || "Sem CNPJ"}
                    </p>
                  </div>
                </td>
                <td>
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      color: PLAN_COLORS[org.plan] || "#94a3b8",
                      background: `${PLAN_COLORS[org.plan] || "#94a3b8"}15`,
                    }}
                  >
                    <Crown className="w-3 h-3 inline mr-1" />
                    {org.plan}
                  </span>
                </td>
                <td><span className="text-sm">{org.member_count}</span></td>
                <td><span className="text-sm">{org.ops_this_month.toLocaleString("pt-BR")}</span></td>
                <td>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    org.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {org.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <select
                    value={org.plan}
                    onChange={(e) => handleChangePlan(org.id, e.target.value)}
                    disabled={changingPlan === org.id}
                    className="bg-transparent text-xs px-2 py-1 rounded border border-slate-700 cursor-pointer text-slate-300 disabled:opacity-50"
                  >
                    {["trial", "starter", "pro", "enterprise"].map((p) => (
                      <option key={p} value={p} style={{ background: "#1a2332" }}>{p}</option>
                    ))}
                  </select>
                  {changingPlan === org.id && <Loader2 className="w-3 h-3 animate-spin inline ml-2 text-slate-500" />}
                </td>
              </tr>
            ))}
            {orgs.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center text-slate-600 py-8">
                  Nenhuma organização cadastrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
