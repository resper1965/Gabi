"use client"

import { useEffect, useState } from "react"
import { gabi } from "@/lib/api"
import { ShieldCheck, Info, ChevronRight, ExternalLink } from "lucide-react"

// Native date formatter
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
})

const ACCENT = "var(--color-mod-insightcare)"

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
  extra_data: any
}

export default function CareInsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)

  useEffect(() => {
    async function fetchInsights() {
      try {
        const data = await gabi.insightcare.insights() as Insight[]
        setInsights(data)
      } catch (e) {
        console.error("Failed to fetch insurance insights", e)
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Insights de Seguros</h1>
            <p className="text-sm text-slate-400">Monitoramento de Resoluções ANS e Normativos SUSEP</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse text-slate-500">Sincronizando com ANS/SUSEP...</div>
        </div>
      ) : insights.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 glass-panel rounded-2xl border border-white/5">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Info className="w-8 h-8 text-slate-600" />
             </div>
             <h3 className="text-lg font-medium text-white mb-1">Nenhum insight regulatório</h3>
             <p className="text-sm text-slate-500 max-w-xs">As análises de normas de seguros aparecerão aqui assim que forem processadas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
           {insights.map((insight) => (
             <div 
               key={insight.id}
               className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group"
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
                    <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver detalhes <ChevronRight className="w-3 h-3" />
                    </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-300" onClick={() => setSelectedInsight(null)}>
            <div 
                className="w-full max-w-xl h-full bg-[#0a0a0a] border-l border-white/10 p-8 overflow-y-auto animate-in slide-in-from-right duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-8">
                    <button 
                    onClick={() => setSelectedInsight(null)}
                    className="p-2 rounded-lg hover:bg-white/5 transition-all text-slate-500 hover:text-white"
                    >
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <a 
                      href={`https://www.google.com/search?q=${selectedInsight.authority}+${selectedInsight.tipo_ato}+${selectedInsight.numero}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-slate-500 hover:text-emerald-400 transition-colors"
                    >
                        Ver via original <ExternalLink className="w-3 h-3" />
                    </a>
                </div>

                <div className="mb-8">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">{selectedInsight.authority}</span>
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
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Impacto no Setor</h4>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            {selectedInsight.risco_justificativa}
                        </p>
                    </section>

                    {selectedInsight.extra_data?.obrigacoes && (
                        <section>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Obrigações e Prazos</h4>
                            <div className="space-y-3">
                                {selectedInsight.extra_data.obrigacoes.map((ob: any, idx: number) => (
                                    <div key={idx} className="p-4 rounded-xl bg-white/2 border border-white/5">
                                        <p className="text-sm text-white font-medium mb-1">{ob.descricao}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                            {ob.sujeito_passivo && <span className="text-[10px] text-slate-500">Destinatário: <span className="text-slate-300">{ob.sujeito_passivo}</span></span>}
                                            {ob.prazo && <span className="text-[10px] text-slate-500">Prazo: <span className="text-slate-300">{ob.prazo}</span></span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
