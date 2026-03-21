"use client"

import { useState, useEffect, useCallback } from "react"
import { gabiPlatform } from "@/lib/api"
import { DollarSign, TrendingUp, Activity, Flame, BarChart3, Zap, Building2 } from "lucide-react"
import { toast } from "sonner"
import { FinOpsSummary, FinOpsOrg, MODULE_LABELS, MODULE_COLORS } from "./types"

interface AdminFinOpsTabProps {
  isSuperadmin: boolean
  refreshKey: number
}

export default function AdminFinOpsTab({ isSuperadmin, refreshKey }: AdminFinOpsTabProps) {
  const [finops, setFinops] = useState<FinOpsSummary | null>(null)
  const [finopsOrgs, setFinopsOrgs] = useState<FinOpsOrg[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFinOps = useCallback(async () => {
    if (!isSuperadmin) return
    setLoading(true)
    try {
      const [summary, byOrg] = await Promise.all([
        gabiPlatform.finopsSummary() as Promise<FinOpsSummary>,
        gabiPlatform.finopsByOrg() as Promise<{ orgs: FinOpsOrg[] }>,
      ])
      setFinops(summary)
      setFinopsOrgs(byOrg.orgs)
    } catch {
      toast.error("Erro ao carregar FinOps")
    } finally {
      setLoading(false)
    }
  }, [isSuperadmin])

  useEffect(() => {
    fetchFinOps()
  }, [fetchFinOps, refreshKey])

  if (loading && !finops) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-slate-800 mb-4" />
          <div className="h-2 w-24 bg-slate-800 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* FinOps Stats Cards */}
      {finops && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Custo Mensal", value: `$${finops.total_cost_usd.toFixed(2)}`, icon: DollarSign, color: "#34d399" },
              { label: "Projeção 30d", value: `$${finops.projected_monthly_usd.toFixed(2)}`, icon: TrendingUp, color: "#fbbf24" },
              { label: "Requisições", value: finops.total_requests.toLocaleString("pt-BR"), icon: Activity, color: "#38bdf8" },
              { label: "Custo/req", value: `$${finops.avg_cost_per_request.toFixed(4)}`, icon: Flame, color: "#f472b6" },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl bg-[#1E293B] border border-[#334155] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <c.icon className="w-4 h-4" style={{ color: c.color }} />
                  <span className="text-xs text-slate-500 font-medium">{c.label}</span>
                </div>
                <p className="text-2xl font-semibold">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Daily Burn Chart */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 rounded-2xl bg-[#1E293B] border border-[#334155] p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold">Burn Rate Diário (7 dias)</h2>
              </div>
              <div className="flex items-end gap-1 h-40">
                {finops.daily_burn.length > 0 ? finops.daily_burn.map((d) => {
                  const maxCost = Math.max(0.001, ...finops.daily_burn.map(x => x.cost_usd))
                  const h = (d.cost_usd / maxCost) * 100
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
                        style={{ height: `${h}%`, minHeight: d.cost_usd > 0 ? 4 : 0, background: "linear-gradient(to top, #34d399, #059669)" }} />
                      <span className="text-[0.5rem] text-slate-600 mt-auto">
                        {new Date(d.day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-[#0f172a] border border-[#334155] rounded-lg px-2 py-1 text-[0.6rem] whitespace-nowrap">
                        <span className="text-emerald-400 font-medium">${d.cost_usd.toFixed(4)}</span>
                        <span className="text-slate-500 ml-1">({d.requests} reqs)</span>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="flex-1 flex items-center justify-center h-full text-slate-600 text-sm">Sem dados</div>
                )}
              </div>
            </div>

            {/* By Module breakdown */}
            <div className="rounded-2xl bg-[#1E293B] border border-[#334155] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold">Custo por Módulo</h2>
              </div>
              <div className="space-y-3">
                {finops.by_module.length > 0 ? finops.by_module.map((m) => {
                  const pct = finops.total_cost_usd > 0 ? (m.cost_usd / finops.total_cost_usd) * 100 : 0
                  return (
                    <div key={m.module}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: MODULE_COLORS[m.module] }}>
                          gabi.{MODULE_LABELS[m.module]?.toLowerCase() || m.module}
                        </span>
                        <span className="text-xs text-slate-500">${m.cost_usd.toFixed(4)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: MODULE_COLORS[m.module] || "#94a3b8" }} />
                      </div>
                    </div>
                  )
                }) : <p className="text-xs text-slate-600">Sem dados</p>}
              </div>
              {finops.by_model.length > 0 && (
                <div className="mt-5 pt-4 border-t border-[#334155]">
                  <h3 className="text-xs text-slate-500 font-medium mb-2">Por Modelo</h3>
                  {finops.by_model.map((m) => (
                    <div key={m.model} className="flex justify-between text-xs py-1">
                      <span className="text-slate-400 truncate max-w-[130px]">{m.model.replace("gemini-", "").replace("-preview-05-06", "")}</span>
                      <span className="text-white font-medium">${m.cost_usd.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cost by Org */}
          {finopsOrgs.length > 0 && (
            <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden">
              <div className="p-4 border-b border-[#334155] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold">Custo por Organização</h2>
              </div>
              <table className="data-grid w-full">
                <thead>
                  <tr><th>Organização</th><th>Requisições</th><th>Tokens</th><th>Custo (USD)</th></tr>
                </thead>
                <tbody>
                  {finopsOrgs.filter(o => o.requests > 0).map((org) => (
                    <tr key={org.org_id}>
                      <td className="text-sm text-white font-medium">{org.org_name}</td>
                      <td className="text-sm">{org.requests.toLocaleString("pt-BR")}</td>
                      <td className="text-sm">{org.tokens.toLocaleString("pt-BR")}</td>
                      <td>
                        <span className="text-sm font-medium text-emerald-400">${org.cost_usd.toFixed(4)}</span>
                      </td>
                    </tr>
                  ))}
                  {finopsOrgs.filter(o => o.requests > 0).length === 0 && (
                    <tr><td colSpan={4} className="text-center text-slate-600 py-8">Sem uso registrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {!finops && !loading && (
        <div className="text-center py-12 text-slate-600">
          <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum dado de FinOps disponível</p>
        </div>
      )}
    </div>
  )
}
