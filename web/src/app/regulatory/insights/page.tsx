"use client"

import { useEffect, useState } from "react"
import { gabi } from "@/lib/api"
import {
  Info, ChevronRight, Radar, Filter, FileText, BarChart3,
  AlertTriangle, TrendingUp, Clock, Shield, Sparkles, MessageSquare, Download
} from "lucide-react"

/* ── Constants ── */

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" })
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })

const AUTHORITIES = [
  { key: "ALL", label: "Todos", color: "#94a3b8", icon: "🔍" },
  { key: "BACEN", label: "BCB", color: "#3b82f6", icon: "🏦" },
  { key: "CMN", label: "CMN", color: "#6366f1", icon: "📋" },
  { key: "CVM", label: "CVM", color: "#8b5cf6", icon: "📈" },
  { key: "ANS", label: "ANS", color: "#10b981", icon: "🏥" },
  { key: "SUSEP", label: "SUSEP", color: "#14b8a6", icon: "🛡" },
  { key: "ANPD", label: "ANPD", color: "#f59e0b", icon: "🔒" },
  { key: "ANEEL", label: "ANEEL", color: "#ef4444", icon: "⚡" },
  { key: "CADE", label: "CADE", color: "#ec4899", icon: "⚖" },
  { key: "PLANALTO", label: "Planalto", color: "#06b6d4", icon: "🏛" },
  { key: "DATAJUD_STJ", label: "STJ", color: "#a78bfa", icon: "⚖" },
  { key: "DATAJUD_STF", label: "STF", color: "#c084fc", icon: "⚖" },
]

interface Insight {
  id: number
  doc_id: number
  authority: string
  tipo_ato: string
  numero: string
  data_publicacao: string | null
  resumo_executivo: string
  risco_nivel: "Baixo" | "Medio" | "Médio" | "Alto"
  risco_justificativa: string
  analisado_em: string
  extra_data: {
    obrigacoes?: Array<{
      descricao: string
      prazo?: string
      sujeito_passivo?: string
    }>
    entidades_afetadas?: string[]
  }
}

interface Stats {
  total_docs: number
  total_insights: number
  risk_counts: { Alto: number; "Médio": number; Baixo: number }
  authority_counts: Record<string, number>
  new_7d: number
  last_update: string | null
  timeline: Array<{ label: string; week_start: string; week_end: string; alto: number; medio: number; baixo: number; total: number }>
}

/* ── Helpers ── */

const getAuthorityColor = (key: string) =>
  AUTHORITIES.find(a => a.key === key)?.color || "#94a3b8"

const getAuthorityLabel = (key: string) =>
  AUTHORITIES.find(a => a.key === key)?.label || key

const getRiskColor = (level: string) => {
  switch (level) {
    case "Alto": return "text-red-400 bg-red-500/10 border-red-500/20"
    case "Medio":
    case "Médio": return "text-amber-400 bg-amber-500/10 border-amber-500/20"
    case "Baixo": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    default: return "text-slate-400 bg-slate-500/10 border-slate-500/20"
  }
}

const getRiskBgGradient = (level: string) => {
  switch (level) {
    case "Alto": return "from-red-500/5 to-transparent border-red-500/10"
    case "Medio":
    case "Médio": return "from-amber-500/5 to-transparent border-amber-500/10"
    case "Baixo": return "from-emerald-500/5 to-transparent border-emerald-500/10"
    default: return "from-slate-500/5 to-transparent border-slate-500/10"
  }
}

const normalizeRisk = (level: string) => level === "Medio" ? "Médio" : level

/* ── Component ── */

export default function RadarRegulatorioPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const [activeFilter, setActiveFilter] = useState("ALL")

  useEffect(() => {
    async function fetchData() {
      try {
        const [insightsData, statsData] = await Promise.all([
          gabi.legal.insights() as Promise<Insight[]>,
          gabi.legal.insightStats() as Promise<Stats>,
        ])
        setInsights(insightsData)
        setStats(statsData)
      } catch (e) {
        console.error("Failed to fetch radar data", e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filtered = activeFilter === "ALL"
    ? insights
    : insights.filter(i => i.authority === activeFilter)

  /* Group by risk level */
  const altoInsights = filtered.filter(i => i.risco_nivel === "Alto")
  const medioInsights = filtered.filter(i => i.risco_nivel === "Medio" || i.risco_nivel === "Médio")
  const baixoInsights = filtered.filter(i => i.risco_nivel === "Baixo")

  const timeAgo = (iso: string | null) => {
    if (!iso) return "—"
    const diff = Date.now() - new Date(iso).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return "agora"
    if (hours < 24) return `${hours}h atrás`
    return `${Math.floor(hours / 24)}d atrás`
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Radar className="w-8 h-8 text-amber-400 animate-pulse" />
          <span className="text-sm text-slate-500">Carregando radar regulatório...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar">
      {/* ══════════════════════════════════════════════════════ */}
      {/* KPI Dashboard Header */}
      {/* ══════════════════════════════════════════════════════ */}
      <header className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20">
            <Radar className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white tracking-tight">Radar Regulatório</h1>
            <p className="text-[11px] text-slate-500">
              Monitoramento inteligente · {Object.keys(stats?.authority_counts || {}).length} agências ativas
              {stats?.last_update && <> · Atualizado {timeAgo(stats.last_update)}</>}
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="glass-panel p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Documentos</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.total_docs.toLocaleString("pt-BR")}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">{stats.total_insights} analisados</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-red-500/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Alto Risco</span>
              </div>
              <div className="text-2xl font-bold text-red-400">{stats.risk_counts.Alto}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">atenção imediata</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-emerald-500/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Novos 7d</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">{stats.new_7d}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">esta semana</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Última Atualização</span>
              </div>
              <div className="text-lg font-bold text-white">{timeAgo(stats.last_update)}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">
                {stats.last_update ? shortDateFormatter.format(new Date(stats.last_update)) : "—"}
              </div>
            </div>
          </div>
        )}

        {/* Timeline — mini bar chart */}
        {stats?.timeline && stats.timeline.some(w => w.total > 0) && (
          <div className="glass-panel p-4 rounded-xl border border-white/5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Atividade 30 dias
              </span>
            </div>
            <div className="flex items-end gap-2 h-16">
              {stats.timeline.map((week, i) => {
                const maxTotal = Math.max(...stats.timeline.map(w => w.total), 1)
                const height = Math.max((week.total / maxTotal) * 100, 4)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col-reverse rounded-md overflow-hidden" style={{ height: `${height}%` }}>
                      {week.alto > 0 && <div className="bg-red-500/60" style={{ flex: week.alto }} />}
                      {week.medio > 0 && <div className="bg-amber-500/50" style={{ flex: week.medio }} />}
                      {week.baixo > 0 && <div className="bg-emerald-500/40" style={{ flex: week.baixo }} />}
                      {week.total === 0 && <div className="bg-white/5 h-full" />}
                    </div>
                    <span className="text-[9px] text-slate-600">{week.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Agency Buttons with Counters ── */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-600 mr-1 shrink-0" />
          {AUTHORITIES.map(auth => {
            const count = auth.key === "ALL"
              ? stats?.total_insights || insights.length
              : stats?.authority_counts?.[auth.key] || 0
            if (auth.key !== "ALL" && count === 0) return null
            return (
              <button
                key={auth.key}
                onClick={() => setActiveFilter(auth.key)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  activeFilter === auth.key
                    ? "text-white border-white/20 shadow-lg"
                    : "text-slate-500 border-white/5 hover:border-white/15 hover:text-slate-300"
                }`}
                style={activeFilter === auth.key ? { backgroundColor: `${auth.color}20`, borderColor: `${auth.color}40`, color: auth.color } : {}}
              >
                <span>{auth.label}</span>
                {count > 0 && (
                  <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 ${
                    activeFilter === auth.key ? "bg-white/10" : "bg-white/5"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════ */}
      {/* Content — Risk-Grouped Sections */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="flex-1 px-6 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-12 glass-panel rounded-2xl border border-white/5">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Info className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">
              {activeFilter === "ALL" ? "Nenhum insight disponível" : `Nenhum insight para ${getAuthorityLabel(activeFilter)}`}
            </h3>
            <p className="text-sm text-slate-500 max-w-xs">
              As análises aparecerão aqui assim que novos normativos forem processados pela Gabi.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ALTO RISCO */}
            {altoInsights.length > 0 && (
              <RiskSection
                label="Atenção Imediata"
                icon={<AlertTriangle className="w-4 h-4" />}
                color="red"
                insights={altoInsights}
                onSelect={setSelectedInsight}
                getAuthorityColor={getAuthorityColor}
              />
            )}

            {/* MÉDIO RISCO */}
            {medioInsights.length > 0 && (
              <RiskSection
                label="Acompanhamento"
                icon={<Shield className="w-4 h-4" />}
                color="amber"
                insights={medioInsights}
                onSelect={setSelectedInsight}
                getAuthorityColor={getAuthorityColor}
              />
            )}

            {/* BAIXO RISCO */}
            {baixoInsights.length > 0 && (
              <RiskSection
                label="Informativo"
                icon={<Sparkles className="w-4 h-4" />}
                color="emerald"
                insights={baixoInsights}
                onSelect={setSelectedInsight}
                getAuthorityColor={getAuthorityColor}
              />
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* Detail Drawer */}
      {/* ══════════════════════════════════════════════════════ */}
      {selectedInsight && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-300" onClick={() => setSelectedInsight(null)} />
          <div
            className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#08080a] border-l border-white/10 z-50 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className={`p-6 pb-4 bg-gradient-to-b ${getRiskBgGradient(selectedInsight.risco_nivel)}`}>
              <button
                onClick={() => setSelectedInsight(null)}
                className="mb-4 p-2 rounded-lg hover:bg-white/5 transition-all text-slate-500 hover:text-white"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider"
                  style={{ backgroundColor: `${getAuthorityColor(selectedInsight.authority)}15`, color: getAuthorityColor(selectedInsight.authority) }}
                >
                  {getAuthorityLabel(selectedInsight.authority)}
                </span>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(selectedInsight.risco_nivel)}`}>
                  Risco {normalizeRisk(selectedInsight.risco_nivel)}
                </div>
                {selectedInsight.data_publicacao && (
                  <span className="text-[10px] text-slate-600 ml-auto">
                    Publicado em {dateFormatter.format(new Date(selectedInsight.data_publicacao))}
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">{selectedInsight.tipo_ato} {selectedInsight.numero}</h2>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all cursor-pointer">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Perguntar à Gabi
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs font-semibold hover:bg-white/10 transition-all cursor-pointer">
                  <Download className="w-3.5 h-3.5" />
                  Exportar PDF
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1">
              <section>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Resumo Executivo</h4>
                <div className="glass-panel p-4 rounded-xl border border-white/5 text-sm text-slate-300 leading-relaxed italic">
                  &quot;{selectedInsight.resumo_executivo}&quot;
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Justificativa de Risco</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {selectedInsight.risco_justificativa}
                </p>
              </section>

              {selectedInsight.extra_data?.entidades_afetadas && selectedInsight.extra_data.entidades_afetadas.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Entidades Afetadas</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedInsight.extra_data.entidades_afetadas.map((ent, idx) => (
                      <span key={idx} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
                        {ent}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {selectedInsight.extra_data?.obrigacoes && selectedInsight.extra_data.obrigacoes.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Principais Obrigações</h4>
                  <div className="space-y-3">
                    {selectedInsight.extra_data.obrigacoes.map((ob, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                        <p className="text-sm text-white font-medium">{ob.descricao}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {ob.sujeito_passivo && <span className="text-[10px] text-slate-500">Sujeito: <span className="text-slate-300">{ob.sujeito_passivo}</span></span>}
                          {ob.prazo && <span className="text-[10px] text-slate-500">Prazo: <span className="text-slate-300">{ob.prazo}</span></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/5 text-[10px] text-slate-600 text-center">
              Analisado em {selectedInsight.analisado_em ? dateFormatter.format(new Date(selectedInsight.analisado_em)) : "—"} · ID #{selectedInsight.id}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


/* ── Risk Section Component ── */

function RiskSection({
  label,
  icon,
  color,
  insights,
  onSelect,
  getAuthorityColor,
}: {
  label: string
  icon: React.ReactNode
  color: "red" | "amber" | "emerald"
  insights: Insight[]
  onSelect: (i: Insight) => void
  getAuthorityColor: (key: string) => string
}) {
  const colorMap = {
    red: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/15", dot: "bg-red-500" },
    amber: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/15", dot: "bg-amber-500" },
    emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15", dot: "bg-emerald-500" },
  }
  const c = colorMap[color]

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${c.dot}`} />
        <span className={`text-xs font-bold uppercase tracking-wider ${c.text} flex items-center gap-1.5`}>
          {icon} {label}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
          {insights.length}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`glass-panel p-5 rounded-2xl border ${c.border} hover:border-opacity-60 transition-all cursor-pointer group`}
            onClick={() => onSelect(insight)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider"
                    style={{ backgroundColor: `${getAuthorityColor(insight.authority)}15`, color: getAuthorityColor(insight.authority) }}
                  >
                    {getAuthorityLabel(insight.authority)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white line-clamp-1">{insight.tipo_ato} {insight.numero}</h3>
              </div>
            </div>

            <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
              {insight.resumo_executivo}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <span className="text-[10px] text-slate-600">
                {insight.analisado_em ? dateFormatter.format(new Date(insight.analisado_em)) : "—"}
              </span>
              <div className="flex items-center gap-1 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: getAuthorityColor(insight.authority) }}>
                Ver detalhes <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
