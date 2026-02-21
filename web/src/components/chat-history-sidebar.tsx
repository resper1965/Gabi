"use client"

import { useState, useEffect, useCallback } from "react"
import { History, Trash2, Download, ChevronDown, ChevronRight, X } from "lucide-react"
import { gabi } from "@/lib/api"
import { toast } from "sonner"

interface ChatSession {
  id: string
  module: string
  title: string | null
  message_count: number
  created_at: string | null
  updated_at: string | null
}

interface ChatHistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  onLoadSession: (messages: Array<{ role: string; content: string; metadata?: unknown }>) => void
  module?: string
  moduleAccent?: string
}

export function ChatHistorySidebar({
  isOpen,
  onClose,
  onLoadSession,
  module,
  moduleAccent = "var(--color-gabi-primary)",
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await gabi.chat.sessions(module) as ChatSession[]
      setSessions(data)
    } catch {
      toast.error("Erro ao carregar histórico")
    } finally {
      setLoading(false)
    }
  }, [module])

  useEffect(() => {
    if (isOpen) loadSessions()
  }, [isOpen, loadSessions])

  const handleLoad = async (sessionId: string) => {
    try {
      const data = await gabi.chat.messages(sessionId) as Array<{ role: string; content: string; metadata?: unknown }>
      onLoadSession(data)
      onClose()
      toast.success("Conversa carregada")
    } catch {
      toast.error("Erro ao carregar mensagens")
    }
  }

  const handleExport = async (sessionId: string) => {
    try {
      const data = await gabi.chat.exportMd(sessionId)
      const blob = new Blob([data.markdown], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${data.title || "conversa"}.md`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Exportado como .md")
    } catch {
      toast.error("Erro ao exportar")
    }
  }

  const handleDelete = async (sessionId: string) => {
    try {
      await gabi.chat.deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast.success("Conversa removida")
    } catch {
      toast.error("Erro ao remover")
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="w-72 h-full flex flex-col"
      style={{
        background: "var(--color-surface-card)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" style={{ color: moduleAccent }} />
          <span className="text-sm font-medium text-white">Histórico</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-slate-600">Carregando...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-slate-600">Nenhuma conversa salva</span>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                {expandedId === session.id ? (
                  <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white truncate">{session.title || "Conversa sem título"}</p>
                  <p className="text-[10px] text-slate-600">
                    {session.message_count} msgs · {session.updated_at ? new Date(session.updated_at).toLocaleDateString("pt-BR") : ""}
                  </p>
                </div>
              </button>

              {expandedId === session.id && (
                <div className="flex items-center gap-1 px-3 pb-2">
                  <button
                    onClick={() => handleLoad(session.id)}
                    className="flex-1 text-[10px] py-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Abrir
                  </button>
                  <button
                    onClick={() => handleExport(session.id)}
                    className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors cursor-pointer"
                    title="Exportar .md"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                    title="Remover"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
