"use client"

import { useState, useEffect, useCallback } from "react"
import { ChatPanel, type Message } from "@/components/chat-panel"
import { MassUploadZone } from "@/components/mass-upload-zone"
import { HelpTooltip } from "@/components/help-tooltip"
import { gabi } from "@/lib/api"
import { Scale, ChevronDown, ChevronUp, Sparkles, Wand2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const ACCENT = "var(--color-mod-law)"
const CTX_WINDOW = 10

export default function LawPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [agent, setAgent] = useState("auto")
  const [docType, setDocType] = useState("law")
  const [showUpload, setShowUpload] = useState(false)
  const [recentInsights, setRecentInsights] = useState<Array<{ id: number; authority: string; numero: string; tipo_ato: string }>>([])

  useEffect(() => {
    gabi.legal.insights().then((data) => {
      if (Array.isArray(data)) setRecentInsights(data.slice(0, 3) as any)
    }).catch(console.error)
  }, [])

  const agents = [
    { key: "auto", label: "Auto", desc: "A Gabi decide os agentes ideais para sua pergunta", icon: "✨" },
    { key: "auditor", label: "Compliance", desc: "Cruza contratos com normativos e identifica não-conformidades", icon: "🔍" },
    { key: "researcher", label: "Pesquisa", desc: "Busca precedentes, jurisprudência e fundamentação na base", icon: "📚" },
    { key: "drafter", label: "Parecer", desc: "Redige pareceres, minutas e relatórios regulatórios", icon: "✍️" },
    { key: "watcher", label: "Radar", desc: "Monitora publicações do DOU e avalia impacto nos seus contratos", icon: "📡" },
  ]

  const selectedAgent = agents.find((a) => a.key === agent)

  const handleSend = async (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const history = messages.slice(-CTX_WINDOW).map((m) => ({ role: m.role, content: m.content }))
      const res = await gabi.law.agent({
        agent,
        query: text,
        chat_history: history,
      }) as { result: Record<string, unknown>; sources_used: number; sources?: Array<{ title: string; type: string }>; orchestration?: { agents: string[]; reason: string } }

      const content = typeof res.result === "string"
        ? res.result
        : res.result?.synthesis || res.result?.text || JSON.stringify(res.result, null, 2)

      // Build metadata footer
      let footer = `\n\n_Fontes utilizadas: ${res.sources_used}_`
      if (res.orchestration) {
        const agentNames: Record<string, string> = { auditor: "Compliance", researcher: "Pesquisa", drafter: "Parecer", watcher: "Radar" }
        const used = res.orchestration.agents.map((a: string) => agentNames[a] || a).join(" + ")
        footer += `\n_Agentes acionados: ${used}_`
      }

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: `${content}${footer}`,
        metadata: res.sources ? { sources: res.sources } : undefined,
      }])
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Erro"
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `⚠️ ${errorMsg}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = useCallback(async (file: File) => {
    const res = await gabi.legal.upload(docType, file)
    return res as { chunk_count?: number }
  }, [docType])

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${ACCENT}20`, color: ACCENT }}>
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">gabi.legal</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-zinc-500">Inteligência Jurídica com Orquestração IA</p>
                {recentInsights.length > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <Link href="/law/insights" className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-400 font-medium transition-colors group">
                      <Sparkles className="w-2.5 h-2.5" />
                      {recentInsights.length} análises hoje
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200"
            style={{ background: `color-mix(in srgb, ${ACCENT} 15%, transparent)`, color: ACCENT, border: `1px solid color-mix(in srgb, ${ACCENT} 25%, transparent)` }}
          >
            📎 Base Jurídica
            {showUpload ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Collapsible upload zone */}
        {showUpload && (
          <div className="mb-3 animate-fade-in-up">
            <MassUploadZone
              onUpload={handleUpload}
              docType={docType}
              docTypeOptions={[
                { key: "contract", label: "📑 Contratos" },
                { key: "regulation", label: "⚖️ Regulações" },
                { key: "precedent", label: "📋 Precedentes" },
                { key: "law", label: "📜 Legislação" },
              ]}
              onDocTypeChange={setDocType}
              moduleAccent={ACCENT}
              accept=".pdf,.docx,.txt"
              acceptLabel="PDF, DOCX, TXT — múltiplos arquivos"
              onComplete={() => toast.success("Base jurídica atualizada")}
            />
          </div>
        )}

        {/* Agent selector */}
        <div className="flex gap-2 flex-wrap">
          {agents.map((a) => (
            <button
              key={a.key}
              onClick={() => setAgent(a.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                agent === a.key ? "text-white" : "bg-white/5 text-slate-400 hover:text-white"
              }`}
              style={agent === a.key ? { background: `${ACCENT}20`, color: ACCENT, border: `1px solid ${ACCENT}30` } : undefined}
              title={a.desc}
            >
              <span className="text-[11px]">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

        {/* Agent description */}
        {selectedAgent && (
          <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            {agent === "auto" && <Wand2 className="w-3 h-3" style={{ color: ACCENT }} />}
            {selectedAgent.desc}
          </p>
        )}
      </header>
      <ChatPanel
        messages={messages}
        onSend={handleSend}
        isLoading={isLoading}
        placeholder={agent === "auto" ? "Pergunte qualquer coisa — a Gabi decide os melhores agentes..." : `Pergunte à ${selectedAgent?.label}...`}
        moduleAccent={ACCENT}
      />
      <HelpTooltip module="law" moduleAccent={ACCENT} />
    </div>
  )
}
