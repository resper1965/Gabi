"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/auth-provider"
import { gabi } from "@/lib/api"
import {
  BarChart3, Users, Loader2, RefreshCw, Shield,
  TrendingUp, Activity, Zap
} from "lucide-react"
import { toast } from "sonner"

interface AnalyticsData {
  period: string
  total_events: number
  queries_by_day: Array<{ day: string; module: string; count: number }>
  top_users: Array<{ user_id: string; count: number }>
  module_totals: Record<string, number>
}

const MODULE_LABELS: Record<string, string> = { law: "Legal" }
const MODULE_COLORS: Record<string, string> = {
  law: "var(--color-mod-law)",
}

export default function ObservabilityPage() {
  const { profile } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await gabi.admin.analytics() as AnalyticsData
      setData(res)
    } catch {
      toast.error("Erro ao carregar analytics")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!data) return null

  // Aggregate daily data for the chart
  const days = [...new Set(data.queries_by_day.map(d => d.day))].sort()
  const maxDailyCount = Math.max(1, ...days.map(day =>
    data.queries_by_day.filter(d => d.day === day).reduce((sum, d) => sum + d.count, 0)
  ))
  const moduleTotal = Object.values(data.module_totals).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Observabilidade</h1>
          <p className="text-slate-500 text-sm mt-1">Métricas dos últimos 7 dias</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Operações", value: data.total_events.toLocaleString("pt-BR"), icon: Activity, color: "var(--color-gabi-primary)" },
          { label: "Média/dia", value: Math.round(data.total_events / Math.max(1, days.length)), icon: TrendingUp, color: "#38bdf8" },
          { label: "Módulos ativos", value: Object.keys(data.module_totals).length, icon: Zap, color: "#818cf8" },
          { label: "Usuários ativos", value: data.top_users.length, icon: Users, color: "#fbbf24" },
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

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Daily ops chart */}
        <div className="md:col-span-2 rounded-2xl bg-[#1E293B] border border-[#334155] p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">Operações por dia</h2>
          </div>
          <div className="flex items-end gap-1 h-40">
            {days.map((day) => {
              const dayData = data.queries_by_day.filter(d => d.day === day)
              const totalForDay = dayData.reduce((sum, d) => sum + d.count, 0)
              const heightPercent = (totalForDay / maxDailyCount) * 100

              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Stacked bar */}
                  <div
                    className="w-full rounded-t-md overflow-hidden transition-all duration-300 hover:opacity-80"
                    style={{ height: `${heightPercent}%`, minHeight: totalForDay > 0 ? 4 : 0 }}
                  >
                    {dayData.map((d) => {
                      const segmentPercent = totalForDay > 0 ? (d.count / totalForDay) * 100 : 0
                      return (
                        <div
                          key={d.module}
                          style={{
                            height: `${segmentPercent}%`,
                            background: MODULE_COLORS[d.module] || "#94a3b8",
                            minHeight: segmentPercent > 0 ? 2 : 0,
                          }}
                        />
                      )
                    })}
                  </div>
                  <span className="text-[0.5rem] text-slate-600 mt-auto">
                    {new Date(day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-[#0f172a] border border-[#334155] rounded-lg px-2 py-1 text-[0.6rem] whitespace-nowrap">
                    <span className="text-white font-medium">{totalForDay} ops</span>
                  </div>
                </div>
              )
            })}
            {days.length === 0 && (
              <div className="flex-1 flex items-center justify-center h-full text-slate-600 text-sm">
                Sem dados no período
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#334155]">
            {Object.entries(MODULE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: MODULE_COLORS[key] }} />
                <span className="text-[0.6rem] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Module breakdown */}
        <div className="rounded-2xl bg-[#1E293B] border border-[#334155] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold">Por módulo</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(data.module_totals)
              .sort((a, b) => b[1] - a[1])
              .map(([mod, count]) => {
                const percent = (count / moduleTotal) * 100
                return (
                  <div key={mod}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: MODULE_COLORS[mod] }}>
                        gabi.{MODULE_LABELS[mod]?.toLowerCase() || mod}
                      </span>
                      <span className="text-xs text-slate-500">{count} ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${percent}%`, background: MODULE_COLORS[mod] || "#94a3b8" }}
                      />
                    </div>
                  </div>
                )
              })}
            {Object.keys(data.module_totals).length === 0 && (
              <p className="text-xs text-slate-600">Sem dados no período</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Users */}
      <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden">
        <div className="p-4 border-b border-[#334155] flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold">Top Usuários (7 dias)</h2>
        </div>
        <table className="data-grid w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Usuário</th>
              <th>Operações</th>
              <th>% do total</th>
            </tr>
          </thead>
          <tbody>
            {data.top_users.map((u, i) => (
              <tr key={u.user_id}>
                <td>
                  <span className={`text-xs font-mono ${i < 3 ? "text-amber-400" : "text-slate-500"}`}>
                    #{i + 1}
                  </span>
                </td>
                <td className="text-sm text-white">{u.user_id}</td>
                <td className="text-sm font-medium">{u.count}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(u.count / data.total_events) * 100}%`,
                          background: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : "#64748b",
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">
                      {((u.count / data.total_events) * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {data.top_users.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-slate-600 py-8">
                  Sem uso registrado no período
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
