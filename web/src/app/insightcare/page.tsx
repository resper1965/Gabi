"use client"

import { useState, useCallback } from "react"
import { ChatPanel, type Message } from "@/components/chat-panel"
import { MassUploadZone } from "@/components/mass-upload-zone"
import { HelpTooltip } from "@/components/help-tooltip"
import { gabi } from "@/lib/api"
import { ShieldCheck, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"

const ACCENT = "var(--color-mod-insightcare)"
const CTX_WINDOW = 10

export default function InsightCarePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [agent, setAgent] = useState("policy_analyst")
  const [summary, setSummary] = useState<string | null>(null)
  const [docType, setDocType] = useState("policy")
  const [showUpload, setShowUpload] = useState(false)

  const agents = [
    { key: "policy_analyst", label: "Apólices", desc: "Analisa e compara coberturas" },
    { key: "claims_analyst", label: "Sinistralidade", desc: "KPIs: Loss Ratio, PMPM, tendências" },
    { key: "regulatory_consultant", label: "Regulatório", desc: "Normas ANS/SUSEP" },
  ]

  const handleSend = async (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const history = messages.slice(-CTX_WINDOW).map((m) => ({ role: m.role, content: m.content }))
      const res = await gabi.insightcare.chat({
        tenant_id: "default",
        agent,
        question: text,
        chat_history: history,
        summary: summary || undefined,
      }) as { response: string | Record<string, unknown>; sources_used: number; summary?: string }

      const content = typeof res.response === "string"
        ? res.response
        : JSON.stringify(res.response, null, 2)

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: `${content}\n\n_Fontes: ${res.sources_used}_`,
      }])

      if (res.summary) setSummary(res.summary)
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Erro"
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `⚠️ ${errorMsg}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = useCallback(async (file: File) => {
    const res = await gabi.care.upload("default", docType, file)
    return res as { chunk_count?: number }
  }, [docType])

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[var(--radius-tech)] flex items-center justify-center" style={{ background: `${ACCENT}20`, color: ACCENT }}>
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">gabi.care</h1>
              <p className="text-xs text-zinc-500">Sua Analista de Seguros</p>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200"
            style={{ background: `color-mix(in srgb, ${ACCENT} 15%, transparent)`, color: ACCENT, border: `1px solid color-mix(in srgb, ${ACCENT} 25%, transparent)` }}
          >
            📎 Base de Seguros
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
                { key: "policy", label: "📋 Apólices" },
                { key: "report", label: "📊 Sinistros (XLSX)" },
                { key: "regulation", label: "⚖️ Normas ANS" },
                { key: "contract", label: "📑 Contratos" },
              ]}
              onDocTypeChange={setDocType}
              moduleAccent={ACCENT}
              accept=".pdf,.docx,.txt,.xlsx,.xls"
              acceptLabel="PDF, DOCX, TXT, XLSX — múltiplos arquivos"
              onComplete={() => toast.success("Base de seguros atualizada")}
            />
          </div>
        )}

        <div className="flex gap-2">
          {agents.map((a) => (
            <button
              key={a.key}
              onClick={() => setAgent(a.key)}
              className={`px-3 py-1.5 rounded-[var(--radius-tech)] text-xs font-medium transition-all duration-200 cursor-pointer ${
                agent === a.key ? "text-white" : "bg-white/5 text-slate-400 hover:text-white"
              }`}
              style={agent === a.key ? { background: `${ACCENT}20`, color: ACCENT, border: `1px solid ${ACCENT}30` } : undefined}
              title={a.desc}
            >
              {a.label}
            </button>
          ))}
        </div>
      </header>
      <ChatPanel messages={messages} onSend={handleSend} isLoading={isLoading} placeholder={`Pergunte à gabi. sobre ${agents.find((a) => a.key === agent)?.desc.toLowerCase()}...`} moduleAccent={ACCENT} />
      <HelpTooltip module="insightcare" moduleAccent={ACCENT} />
    </div>
  )
}
