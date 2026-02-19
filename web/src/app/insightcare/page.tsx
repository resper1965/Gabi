"use client"

import { useState } from "react"
import { ChatPanel, type Message } from "@/components/chat-panel"
import { UploadButton } from "@/components/upload-button"
import { gabi } from "@/lib/api"
import { ShieldCheck } from "lucide-react"

const ACCENT = "var(--color-mod-insightcare)"

export default function InsightCarePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [agent, setAgent] = useState("policy_analyst")
  const [summary, setSummary] = useState<string | null>(null)

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
      const res = await gabi.insightcare.chat({
        tenant_id: "default",
        agent,
        question: text,
        chat_history: messages.map((m) => ({ role: m.role, content: m.content })),
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

  const handleUpload = async (file: File) => {
    await gabi.care.upload("default", "policy", file)
    const isXlsx = file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: isXlsx
          ? `📊 Planilha **${file.name}** importada como dados de sinistralidade.`
          : `📄 Documento **${file.name}** indexado na base de seguros.`,
      },
    ])
  }

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
          <UploadButton
            onUpload={handleUpload}
            accept=".pdf,.docx,.txt,.xlsx,.xls"
            moduleAccent={ACCENT}
            label="Upload"
          />
        </div>
        <div className="flex gap-2">
          {agents.map((a) => (
            <button
              key={a.key}
              onClick={() => setAgent(a.key)}
              className={`px-3 py-1.5 rounded-[var(--radius-tech)] text-xs font-medium transition-all duration-200 cursor-pointer ${
                agent === a.key
                  ? "text-white"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
              style={agent === a.key ? { background: `${ACCENT}20`, color: ACCENT, border: `1px solid ${ACCENT}30` } : undefined}
              title={a.desc}
            >
              {a.label}
            </button>
          ))}
        </div>
      </header>
      <ChatPanel
        messages={messages}
        onSend={handleSend}
        isLoading={isLoading}
        placeholder={`Pergunte à gabi. sobre ${agents.find((a) => a.key === agent)?.desc.toLowerCase()}...`}
        moduleAccent={ACCENT}
      />
    </div>
  )
}
