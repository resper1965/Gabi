"use client"

import { useEffect, useState } from "react"
import { gabi } from "@/lib/api"
import { Sparkles, Info, ChevronRight, Scale } from "lucide-react"

// Native date formatter
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
})

const ACCENT = "var(--color-mod-law)"

interface Insight {
  id: number
  doc_id: number
  authority: string
  tipo_ato: string
  numero: string
  resumo_executivo: string
  risco_nivel: "Baixo" | "Médio" | "Alto"
  risco_justificativa: string
  analisado_em: string
  extra_data: {
    obrigacoes?: Array<{
      descricao: string
      prazo?: string
      sujeito_passivo?: string
    }>
  }
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)

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

  const getRiskColor = (level: string) => {
    switch (level) {
      case "Alto": return "text-red-400 bg-red-400/10 border-red-400/20"
      case "Médio": return "text-amber-400 bg-amber-400/10 border-amber-400/20"
      case "Baixo": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      default: return "text-slate-400 bg-slate-400/10 border-slate-400/20"
    }
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-tech flex items-center justify-center" style={{ background: `${ACCENT}20`, color: ACCENT }}>
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">gabi.legal</h1>
              <p className="text-xs text-zinc-500">Sua Auditora Jurídica</p>
            </div>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse text-slate-500">Carregando inteligência...</div>
        </div>
      ) : insights.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 glass-panel rounded-2xl border border-white/5">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Info className="w-8 h-8 text-slate-600" />
             </div>
             <h3 className="text-lg font-medium text-white mb-1">Nenhum insight disponível</h3>
             <p className="text-sm text-slate-500 max-w-xs">As análises aparecerão aqui assim que novos normativos forem processados pela Gabi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
           {insights.map((insight) => (
             <div 
               key={insight.id}
               className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-amber-400/30 transition-all cursor-pointer group"
               onClick={() => setSelectedInsight(insight)}
             >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{insight.authority}</span>
                        <h3 className="text-sm font-semibold text-white line-clamp-1">{insight.tipo_ato} {insight.numero}</h3>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${getRiskColor(insight.risco_nivel)}`}>
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
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-100 animate-in fade-in duration-300" onClick={() => setSelectedInsight(null)} />
            <div 
                className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0a0a0a] border-l border-white/10 z-100 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                  onClick={() => setSelectedInsight(null)}
                  className="mb-8 p-2 rounded-lg hover:bg-white/5 transition-all text-slate-500 hover:text-white"
                >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                </button>

                <div className="mb-8">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-2">{selectedInsight.authority}</span>
                    <h2 className="text-2xl font-bold text-white mb-2">{selectedInsight.tipo_ato} {selectedInsight.numero}</h2>
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(selectedInsight.risco_nivel)}`}>
                        Risco {selectedInsight.risco_nivel}
                    </div>
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

                    {selectedInsight.extra_data?.obrigacoes && (
                        <section>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Principais Obrigações</h4>
                            <div className="space-y-3">
                                {selectedInsight.extra_data.obrigacoes.map((ob: { descricao: string; prazo?: string; sujeito_passivo?: string; }, idx: number) => (
                                    <div key={idx} className="p-5 rounded-2xl bg-white/2 border border-white/5 space-y-4">
                                        <p className="text-sm text-white font-medium mb-1">{ob.descricao}</p>
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
