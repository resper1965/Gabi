"use client"

import { useState } from "react"
import { ChatPanel, type Message } from "@/components/chat-panel"
import { UploadButton } from "@/components/upload-button"
import { gabi } from "@/lib/api"
import { PenTool } from "lucide-react"
import { toast } from "sonner"

const ACCENT = "var(--color-mod-ghost)"
const CTX_WINDOW = 10

export default function GhostPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const history = messages.slice(-CTX_WINDOW).map((m) => ({ role: m.role, content: m.content }))
      const res = await gabi.ghost.generate({
        profile_id: "default",
        prompt: text,
        chat_history: history,
      }) as { text: string }

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: res.text || "Sem resposta",
      }])
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Erro desconhecido"
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `⚠️ ${errorMsg}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (file: File) => {
    await gabi.writer.upload("default", "content", file)
    toast.success(`📄 ${file.name} indexado com sucesso`)
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-tech)] flex items-center justify-center" style={{ background: `${ACCENT}20`, color: ACCENT }}>
            <PenTool className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">gabi.writer</h1>
            <p className="text-xs text-zinc-500">Sua Ghost Writer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UploadButton onUpload={handleUpload} accept=".pdf,.docx,.txt,.md" moduleAccent={ACCENT} label="Estilo" />
          <UploadButton onUpload={async (f) => { await gabi.writer.upload("default", "content", f); toast.success(`📄 ${f.name} indexado`) }} accept=".pdf,.docx,.txt,.md" moduleAccent={ACCENT} label="Conteúdo" />
        </div>
      </header>
      <ChatPanel messages={messages} onSend={handleSend} isLoading={isLoading} placeholder="Peça para a gabi. escrever algo..." moduleAccent={ACCENT} />
    </div>
  )
}
