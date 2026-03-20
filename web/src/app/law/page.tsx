"use client"

import { useEffect, useState, useCallback } from "react"
import { ChatPanel, type StreamMeta } from "@/components/chat-panel"
import { ChatHistorySidebar } from "@/components/chat-history-sidebar"
import { MassUploadZone } from "@/components/mass-upload-zone"
import { HelpTooltip } from "@/components/help-tooltip"
import { useChatStore } from "@/contexts/chat-context"
import { gabi } from "@/lib/api"
import { Scale, ChevronDown, ChevronUp, Sparkles, History, Presentation, Download } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const ACCENT = "var(--color-mod-law)"
const CTX_WINDOW = 10

const SUGGESTED_PROMPTS = [
  "Analise a conformidade deste contrato com as normas BACEN",
  "Quais são as obrigações de compliance para seguros?",
  "Resuma as principais mudanças regulatórias da CVM",
  "Identifique riscos neste normativo SUSEP",
]

export default function LawPage() {
  const { messages, setMessages, clearMessages } = useChatStore("law")
  const agent = "auto"
  const [showUpload, setShowUpload] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [generatingPptx, setGeneratingPptx] = useState(false)
  const [recentInsights, setRecentInsights] = useState<
    Array<{ id: number; authority: string; numero: string; tipo_ato: string }>
  >([])

  useEffect(() => {
    gabi.legal
      .insights()
      .then((data) => {
        if (Array.isArray(data)) setRecentInsights(data.slice(0, 3) as typeof recentInsights)
      })
      .catch(console.error)
  }, [])



  // ── Streaming handler ──────────────────────────────────────────────────────
  const handleSendStream = useCallback(
    async (text: string, signal: AbortSignal) => {
      // Add user message immediately
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "user", content: text, createdAt: Date.now() },
      ])
      const history = messages
        .slice(-CTX_WINDOW)
        .map((m) => ({ role: m.role, content: m.content }))
      return gabi.legal.agentStream({ agent, query: text, chat_history: history }, signal)
    },
    [messages, setMessages],
  )

  // ── Stream complete: add final assistant message ───────────────────────────
  const handleStreamComplete = useCallback(
    (content: string, meta?: StreamMeta) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content,
          createdAt: Date.now(),
          metadata: {
            sources: meta?.sources,
            orchestration: meta?.orchestration,
          },
        },
      ])
    },
    [setMessages],
  )

  const handleUpload = useCallback(
    async (file: File) => {
      const res = await gabi.legal.upload(file)
      return res as { chunk_count?: number; classification?: Record<string, unknown> }
    },
    [],
  )

  const handleGeneratePresentation = useCallback(async () => {
    setGeneratingPptx(true)
    try {
      const docs = await gabi.legal.documents()
      if (docs.length === 0) {
        toast.error("Nenhum documento na base para gerar apresentação")
        return
      }
      const ids = docs.slice(0, 10).map((d) => d.id)
      const blob = await gabi.legal.presentation(ids)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "apresentacao_gabi.pptx"
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Apresentação gerada com sucesso")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar apresentação")
    } finally {
      setGeneratingPptx(false)
    }
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <header className="px-6 py-4 border-b border-[#1E293B]">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `color-mix(in srgb, var(--color-mod-law) 15%, transparent)` }}
            >
              <Scale className="w-4 h-4" style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">gabi.legal</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-zinc-500">Inteligência Jurídica com Orquestração IA</p>
                {recentInsights.length > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <Link
                      href="/law/insights"
                      className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-400 font-medium transition-colors"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      {recentInsights.length} análises hoje
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryOpen(true)}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
              title="Histórico de conversas"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={handleGeneratePresentation}
              disabled={generatingPptx}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50"
              style={{
                background: `color-mix(in srgb, #10B981 12%, transparent)`,
                color: "#10B981",
              }}
              title="Gerar apresentação PPTX a partir dos documentos"
            >
              {generatingPptx ? (
                <Download className="w-3 h-3 animate-pulse" />
              ) : (
                <Presentation className="w-3 h-3" />
              )}
              {generatingPptx ? "Gerando..." : "Apresentação"}
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer"
              style={{
                background: `color-mix(in srgb, var(--color-mod-law) 12%, transparent)`,
                color: ACCENT,
              }}
            >
              📎 Base Jurídica
              {showUpload ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible upload zone */}
        {showUpload && (
          <div className="mb-3 animate-fade-in-up">
            <MassUploadZone
              onUpload={handleUpload}
              moduleAccent={ACCENT}
              accept=".pdf,.docx,.txt"
              acceptLabel="PDF, DOCX, TXT — IA classifica automaticamente"
              onComplete={() => toast.success("Base jurídica atualizada — IA classificou seus documentos")}
            />
          </div>
        )}


      </header>

      {/* ── Chat ── */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 min-w-0">
          <ChatPanel
            messages={messages}
            onSendStream={handleSendStream}
            onStreamComplete={handleStreamComplete}
            onNewConversation={clearMessages}
            suggestedPrompts={SUGGESTED_PROMPTS}
            isLoading={false}
            placeholder="Pergunte qualquer coisa — a Gabi orquestra os agentes ideais..."
            moduleAccent={ACCENT}
          />
        </div>

        <ChatHistorySidebar
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onLoadSession={(msgs) => {
            setMessages(
              msgs.map((m, i) => ({
                id: `hist-${i}`,
                role: m.role as "user" | "assistant",
                content: m.content,
                metadata: m.metadata as Record<string, unknown> | undefined,
              })),
            )
          }}
          module="law"
          moduleAccent={ACCENT}
        />
      </div>

      <HelpTooltip module="law" moduleAccent={ACCENT} />
    </div>
  )
}
