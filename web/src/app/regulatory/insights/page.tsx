"use client"

import { useEffect, useState } from "react"
import { gabi } from "@/lib/api"
import { Info, ChevronRight, Radar, Filter } from "lucide-react"

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
})

const AUTHORITIES = [
  { key: "ALL", label: "Todos", color: "#94a3b8" },
  { key: "BACEN", label: "BCB", color: "#3b82f6" },
  { key: "CMN", label: "CMN", color: "#6366f1" },
  { key: "CVM", label: "CVM", color: "#8b5cf6" },
  { key: "ANS", label: "ANS", color: "#10b981" },
  { key: "SUSEP", label: "SUSEP", color: "#14b8a6" },
  { key: "ANPD", label: "ANPD", color: "#f59e0b" },
  { key: "ANEEL", label: "ANEEL", color: "#ef4444" },
  { key: "PLANALTO", label: "Planalto", color: "#06b6d4" },
]

interface Insight {
  id: number
  doc_id: number
  authority: string
  tipo_ato: string
  numero: string
  resumo_executivo: string
  risco_nivel: "Baixo" | "Medio" | "M\u00e9dio" | "Alto"
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

export default function RadarRegulatorioPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const [activeFilter, setActiveFilter] = useState("ALL")

  useEffect(() => {
    async function fetchInsights() {
      try {
        const data = await gabi.legal.insights() as Insight[]
        setInsights(data)
      } catch (e) {
        console.error("Failed to fetch insights", e)
      } finally {
        setLoading(false)
      }
    }
    fetchInsights()
  }, [])

  const filtered = activeFilter === "ALL"
    ? insights
    : insights.filter(i => i.authority === activeFilter)

  const riskCounts = {
    Alto: filtered.filter(i => i.risco_nivel === "Alto").length,
    Medio: filtered.filter(i => i.risco_nivel === "Medio" || i.risco_nivel === "Médio").length,
    Baixo: filtered.filter(i => i.risco_nivel === "Baixo").length,
  }

  const getAuthorityColor = (key: string) =>
    AUTHORITIES.find(a => a.key === key)?.color || "#94a3b8"

  const getRiskColor = (level: string) => {
    switch (level) {
      case "Alto": return "text-red-400 bg-red-500/10 border-red-500/20"
      case "Medio":
      case "Médio": return "text-amber-400 bg-amber-500/10 border-amber-500/20"
      case "Baixo": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/20"
    }
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
            <Radar className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Radar Regulatório</h1>
            <p className="text-xs text-slate-500">Monitoramento inteligente de normativos · Todas as agências</p>
          </div>
          {insights.length > 0 && (
            <span className="ml-auto text-[10px] text-zinc-600">
              Última atualização: {dateFormatter.format(new Date(insights[0].analisado_em))}
            </span>
          )}
        </div>

        {/* Agency Filter Pills */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-600 mr-1" />
          {AUTHORITIES.map(auth => (
            <button
              key={auth.key}
              onClick={() => setActiveFilter(auth.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                activeFilter === auth.key
                  ? "text-white border-white/20 shadow-lg"
                  : "text-slate-500 border-white/5 hover:border-white/15 hover:text-slate-300"
              }`}
              style={activeFilter === auth.key ? { backgroundColor: `${auth.color}20`, borderColor: `${auth.color}40`, color: auth.color } : {}}
            >
              {auth.label}
            </button>
          ))}
        </div>

        {/* Risk Summary Badges */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-600 font-medium">{filtered.length} insights</span>
            <span className="w-px h-3 bg-white/10" />
            {riskCounts.Alto > 0 && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                {riskCounts.Alto} alto
              </span>
            )}
            {riskCounts.Medio > 0 && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                {riskCounts.Medio} médio
              </span>
            )}
            {riskCounts.Baixo > 0 && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {riskCounts.Baixo} baixo
              </span>
            )}
          </div>
        )}
      </header>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-slate-500">Carregando radar...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 glass-panel rounded-2xl border border-white/5">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">
            {activeFilter === "ALL" ? "Nenhum insight disponível" : `Nenhum insight para ${activeFilter}`}
          </h3>
          <p className="text-sm text-slate-500 max-w-xs">
            As análises aparecerão aqui assim que novos normativos forem processados pela Gabi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((insight) => (
            <div
              key={insight.id}
              className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-amber-400/30 transition-all cursor-pointer group"
              onClick={() => setSelectedInsight(insight)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider"
                      style={{ backgroundColor: `${getAuthorityColor(insight.authority)}15`, color: getAuthorityColor(insight.authority) }}
                    >
                      {insight.authority}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white line-clamp-1">{insight.tipo_ato} {insight.numero}</h3>
                </div>
                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${getRiskColor(insight.risco_nivel)}`}>
                  {insight.risco_nivel.toUpperCase()}
                </div>
              </div>

              <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                {insight.resumo_executivo}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-[10px] text-slate-600">
                  {dateFormatter.format(new Date(insight.analisado_em))}
                </span>
                <div className="flex items-center gap-1 text-[10px] font-medium text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver detalhes <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedInsight && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-300" onClick={() => setSelectedInsight(null)} />
          <div
            className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0a0a0a] border-l border-white/10 z-50 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedInsight(null)}
              className="mb-8 p-2 rounded-lg hover:bg-white/5 transition-all text-slate-500 hover:text-white self-start"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider"
                  style={{ backgroundColor: `${getAuthorityColor(selectedInsight.authority)}15`, color: getAuthorityColor(selectedInsight.authority) }}
                >
                  {selectedInsight.authority}
                </span>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(selectedInsight.risco_nivel)}`}>
                  Risco {selectedInsight.risco_nivel}
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{selectedInsight.tipo_ato} {selectedInsight.numero}</h2>
            </div>

            <div className="space-y-8">
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

              {selectedInsight.extra_data?.obrigacoes && (
                <section>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Principais Obrigações</h4>
                  <div className="space-y-3">
                    {selectedInsight.extra_data.obrigacoes.map((ob, idx) => (
                      <div key={idx} className="p-5 rounded-2xl bg-white/2 border border-white/5 space-y-2">
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
          </div>
        </>
      )}
    </div>
  )
}
