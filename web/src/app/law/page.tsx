"use client"

import { useState } from "react"
import { ChatPanel, type Message } from "@/components/chat-panel"
import { UploadButton } from "@/components/upload-button"
import { gabi } from "@/lib/api"
import { Scale } from "lucide-react"

const ACCENT = "var(--color-mod-law)"

export default function LawPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [agent, setAgent] = useState("auditor")

  const agents = [
    { key: "auditor", label: "Auditora", desc: "Cruza contratos com regulações" },
    { key: "researcher", label: "Pesquisadora", desc: "Busca precedentes" },
    { key: "drafter", label: "Redatora", desc: "Redige peças jurídicas" },
    { key: "watcher", label: "Sentinela", desc: "Monitora regulações" },
  ]

  const handleSend = async (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const res = await gabi.law.agent({
        agent,
        query: text,
        chat_history: messages.map((m) => ({ role: m.role, content: m.content })),
      }) as { result: Record<string, unknown>; sources_used: number }

      const content = typeof res.result === "string"
        ? res.result
        : res.result?.text || JSON.stringify(res.result, null, 2)

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: `${content}\n\n_Fontes utilizadas: ${res.sources_used}_`,
      }])
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Erro"
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `⚠️ ${errorMsg}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (file: File) => {
    await gabi.legal.upload("law", file)
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "assistant", content: `📄 Documento **${file.name}** indexado na base jurídica.` },
    ])
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[var(--radius-tech)] flex items-center justify-center" style={{ background: `${ACCENT}20`, color: ACCENT }}>
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">gabi.legal</h1>
              <p className="text-xs text-zinc-500">Sua Auditora Jurídica</p>
            </div>
          </div>
          <UploadButton
            onUpload={handleUpload}
            accept=".pdf,.docx,.txt"
            moduleAccent={ACCENT}
            label="Upload Doc"
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
        placeholder={`Pergunte à gabi. ${agents.find((a) => a.key === agent)?.label}...`}
        moduleAccent={ACCENT}
      />
    </div>
  )
}
