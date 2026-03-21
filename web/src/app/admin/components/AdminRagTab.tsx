"use client"

import { useState, useEffect, useCallback } from "react"
import { gabi } from "@/lib/api"
import { BookOpen, Database, Search, Code, CheckCircle2, Loader2, Zap } from "lucide-react"
import { toast } from "sonner"

interface AdminRagTabProps {
  refreshKey: number
}

export default function AdminRagTab({ refreshKey }: AdminRagTabProps) {
  const [ragBases, setRagBases] = useState<{ law_documents: Record<string, unknown>[]; regulatory_insights: Record<string, unknown>[] } | null>(null)
  const [ragQuery, setRagQuery] = useState("")
  const [ragSimulation, setRagSimulation] = useState<{ intent?: Record<string, unknown>; did_retrieve?: boolean; chunks?: Record<string, unknown>[] } | null>(null)
  const [ragLoading, setRagLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchRag = useCallback(async () => {
    setLoading(true)
    try {
      const rag = await gabi.admin.regulatoryBases().catch(() => ({ law_documents: [], regulatory_insights: [] })) as { law_documents: Record<string, unknown>[]; regulatory_insights: Record<string, unknown>[] }
      setRagBases(rag)
    } catch {
      toast.error("Erro ao carregar acervo")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRag()
  }, [fetchRag, refreshKey])

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ragQuery.trim()) return
    setRagLoading(true)
    try {
      const res = await gabi.admin.simulateRag(ragQuery, "law") as Record<string, unknown>
      setRagSimulation(res)
    } catch {
      toast.error("Falha ao simular busca")
    } finally {
      setRagLoading(false)
    }
  }

  if (loading && !ragBases) {
    return (
       <div className="flex items-center justify-center py-12">
         <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
       </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* RAG Simulator */}
      <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden">
        <div className="p-5 border-b border-[#334155] bg-[#1a2332]/50">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">RAG Simulator</h2>
            <span className="text-[0.65rem] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">Preview Neural</span>
          </div>
          <form onSubmit={handleSimulate} className="flex gap-2">
            <input type="text" value={ragQuery} onChange={e => setRagQuery(e.target.value)}
              placeholder="Ex: Como funciona o crédito rural segundo o CMN?"
              className="flex-1 bg-transparent border border-[#334155] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              disabled={ragLoading} />
            <button type="submit" disabled={ragLoading || !ragQuery.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer">
              {ragLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Auditar Busca"}
            </button>
          </form>
        </div>
        {ragSimulation && (
          <div className="p-5">
            <div className="flex gap-4 mb-4">
              <div className="flex-1 bg-slate-900/50 rounded-lg p-4 border border-[#334155]">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> Intent</div>
                <code className="text-xs text-emerald-400">{JSON.stringify(ragSimulation.intent, null, 2)}</code>
              </div>
              <div className="flex-1 bg-slate-900/50 rounded-lg p-4 border border-[#334155]">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Database className="w-3 h-3" /> Vector Match</div>
                <div className="text-sm text-white">
                  Chunks: <strong className="text-emerald-400">{ragSimulation.chunks?.length || 0}</strong>
                </div>
              </div>
            </div>
            {ragSimulation.chunks && ragSimulation.chunks.length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2"><Code className="w-3 h-3" /> Raw Chunks</h3>
                {ragSimulation.chunks.map((ck: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="bg-slate-900 rounded-lg p-4 border border-[#334155]/50 text-xs">
                    <div className="flex items-center gap-2 mb-2 text-emerald-300">
                      <span className="font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded">#{idx+1}</span>
                      <span className="truncate max-w-[300px]">{(ck.metadata as Record<string, unknown>)?.source as string || "Doc"}</span>
                      {ck.distance !== undefined && <span className="ml-auto text-emerald-400">Score: {(1 - Number(ck.distance)).toFixed(3)}</span>}
                    </div>
                    <p className="text-slate-300 leading-relaxed max-h-[150px] overflow-y-auto">{String(ck.page_content || "")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RAG Catalog */}
      <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden">
        <div className="p-5 border-b border-[#334155] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Acervo Regulatório (Global)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-grid w-full text-left">
            <thead><tr><th>Autoridade</th><th>Título / Norma</th><th>Tipo</th><th>Status IA</th></tr></thead>
            <tbody>
              {ragBases?.regulatory_insights?.map((insight: Record<string, unknown>, i: number) => (
                <tr key={`reg-${i}`}>
                  <td className="text-white text-xs font-medium">{String(insight.authority || 'BACEN')}</td>
                  <td>
                    <p className="text-sm text-white">{String(insight.tipo_ato || '')} {String(insight.numero || '')}</p>
                    <p className="text-[0.65rem] text-slate-500 max-w-sm truncate">{String(insight.resumo_executivo || '')}</p>
                  </td>
                  <td><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[0.65rem]">Insight (Risco: {String(insight.risco_nivel || 'N/A')})</span></td>
                  <td><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[0.65rem] flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> Indexado</span></td>
                </tr>
              ))}
              {ragBases?.law_documents?.map((doc: Record<string, unknown>) => (
                <tr key={`law-${doc.id}`}>
                  <td className="text-slate-400 text-xs font-medium">Seed Pack</td>
                  <td><p className="text-sm text-slate-300">{String(doc.title || '')}</p></td>
                  <td><span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-400 text-[0.65rem]">{String(doc.doc_type || 'PDF')}</span></td>
                  <td><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[0.65rem] flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> Indexado</span></td>
                </tr>
              ))}
              {(!ragBases?.law_documents?.length && !ragBases?.regulatory_insights?.length) && (
                <tr><td colSpan={4} className="text-center text-slate-500 py-8 text-sm">Acervo vazio</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
