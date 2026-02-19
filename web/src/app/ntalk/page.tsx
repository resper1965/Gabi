"use client"

import { useState } from "react"
import { ChatPanel, type Message } from "@/components/chat-panel"
import { gabi } from "@/lib/api"
import { Database, Settings, RefreshCw } from "lucide-react"
import { toast } from "sonner"

const ACCENT = "var(--color-mod-ntalk)"
const CTX_WINDOW = 10

export default function NTalkPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const handleSend = async (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const history = messages.slice(-CTX_WINDOW).map((m) => ({ role: m.role, content: m.content }))
      const res = await gabi.ntalk.ask({
        tenant_id: "default",
        question: text,
        chat_history: history,
        summary: summary || undefined,
      }) as { analysis: string; sql?: string; results?: { row_count: number }; summary?: string }

      let content = res.analysis || "Sem resposta"
      if (res.sql) content = `**SQL Gerado:**\n\`\`\`sql\n${res.sql}\n\`\`\`\n\n${content}`
      if (res.results) content += `\n\n_${res.results.row_count} linhas retornadas_`

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant", content,
      }])

      if (res.summary) setSummary(res.summary)
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Erro"
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `⚠️ ${errorMsg}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncSchema = async () => {
    setIsLoading(true)
    try {
      const res = await gabi.data.syncSchema("default") as { tables_synced: number; terms_created: number }
      toast.success(`🔄 Schema sincronizado: ${res.tables_synced} tabelas, ${res.terms_created} termos`)
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Erro"
      toast.error(`Sync falhou: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-tech)] flex items-center justify-center" style={{ background: `${ACCENT}20`, color: ACCENT }}>
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">gabi.data</h1>
            <p className="text-xs text-zinc-500">Sua CFO de Dados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncSchema}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200"
            style={{ background: `color-mix(in srgb, ${ACCENT} 15%, transparent)`, color: ACCENT, border: `1px solid color-mix(in srgb, ${ACCENT} 25%, transparent)` }}
            title="Sincronizar schema do banco MS SQL"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Schema</span>
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 bg-white/5 text-slate-400 hover:text-white"
            title="Configurar conexão"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>
      <ChatPanel messages={messages} onSend={handleSend} isLoading={isLoading} placeholder="Pergunte sobre seus dados..." moduleAccent={ACCENT} />
    </div>
  )
}
