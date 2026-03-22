"use client"

import { useState, useCallback } from "react"
import { ChatPanel, type StreamMeta } from "@/components/chat-panel"
import { ChatHistorySidebar } from "@/components/chat-history-sidebar"
import { MassUploadZone } from "@/components/mass-upload-zone"
import { KnowledgePanel } from "@/components/knowledge-panel"
import { HelpTooltip } from "@/components/help-tooltip"
import { useChatStore } from "@/contexts/chat-context"
import { gabi } from "@/lib/api"
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  History,
  Presentation,
  Download,
  PenTool,
} from "lucide-react"
import { toast } from "sonner"

const ACCENT = "var(--color-gabi-primary)"
const CTX_WINDOW = 10

const SUGGESTED_PROMPTS = [
  "Analise a conformidade deste contrato com as normas BACEN",
  "Escreva um relatório executivo sobre resultado do trimestre",
  "Quais são as obrigações de compliance para seguros?",
  "Redija um e-mail formal para parceiros comerciais",
  "Resuma as principais mudanças regulatórias da CVM",
  "Revise e melhore o tom deste texto",
]

export default function UnifiedChatPage() {
  const { messages, setMessages, clearMessages } = useChatStore("gabi")
  const [showUpload, setShowUpload] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [styleOpen, setStyleOpen] = useState(false)
  const [profileId, setProfileId] = useState("default")
  const [generatingPptx, setGeneratingPptx] = useState(false)


  // ── Streaming handler (unified: law orchestrator + style profile) ──────────
  const handleSendStream = useCallback(
    async (text: string, signal: AbortSignal, attachedFileText?: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          content: attachedFileText ? `📎 [documento anexado]\n\n${text}` : text,
          createdAt: Date.now(),
        },
      ])
      const history = messages
        .slice(-CTX_WINDOW)
        .map((m) => ({ role: m.role, content: m.content }))

      return gabi.legal.agentStream(
        {
          agent: "auto",
          query: text,
          document_text: attachedFileText,
          chat_history: history,
          style_profile_id: profileId !== "default" ? profileId : undefined,
        },
        signal,
      )
    },
    [messages, setMessages, profileId],
  )

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
    <div className="h-full flex flex-col bg-[#020617] relative pb-[76px] lg:pb-0 selection:bg-[color:var(--color-gabi-primary)] selection:text-white">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none z-0"></div>

      {/* ── Header ── */}
      <header className="px-6 py-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl relative z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `color-mix(in srgb, var(--color-gabi-primary) 15%, transparent)` }}
            >
              <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Gabi</h1>
              <p className="text-xs text-zinc-500 hidden sm:block">Sua IA Orquestradora — Legal, Redação, Compliance</p>

            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            <button
              onClick={() => setHistoryOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-all duration-300 relative z-10"
              title="Histórico de conversas"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Style Profile toggle */}
            <button
              onClick={() => setStyleOpen(!styleOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer hover:shadow-[0_0_15px_color-mix(in_srgb,var(--color-gabi-primary)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-gabi-primary)] relative z-10"
              style={{
                background: `color-mix(in srgb, var(--color-gabi-primary) 12%, transparent)`,
                color: "var(--color-gabi-primary)",
              }}
              title="Configurar perfil de estilo para redação"
            >
              <PenTool className="w-3 h-3" />
              Estilo
            </button>

            <button
              onClick={handleGeneratePresentation}
              disabled={generatingPptx}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer disabled:opacity-50 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] relative z-10"
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
              {generatingPptx ? "..." : "PPTX"}
            </button>

            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer hover:shadow-[0_0_15px_color-mix(in_srgb,var(--color-gabi-primary)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-gabi-primary)] relative z-10"
              style={{
                background: `color-mix(in srgb, var(--color-gabi-primary) 12%, transparent)`,
                color: ACCENT,
              }}
            >
              📎 <span className="hidden sm:inline">Base Jurídica</span>
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

      {/* ── Chat + Panels ── */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        <div className="flex-1 min-w-0">
          <ChatPanel
            messages={messages}
            onSendStream={handleSendStream}
            onStreamComplete={handleStreamComplete}
            onNewConversation={clearMessages}
            suggestedPrompts={SUGGESTED_PROMPTS}
            isLoading={false}
            placeholder="Pergunte qualquer coisa — a Gabi orquestra agentes jurídicos e de redação..."
            moduleAccent={ACCENT}
            fileExtractUrl="/api/law/extract-text"
          />
        </div>

        {/* Knowledge Panel (style profiles) */}
        {styleOpen && (
          <KnowledgePanel
            isOpen={true}
            onToggle={() => setStyleOpen(false)}
            moduleAccent="var(--color-gabi-primary)"
            onProfileChange={setProfileId}
            activeProfileId={profileId}
          />
        )}

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
          module="gabi"
          moduleAccent={ACCENT}
        />
      </div>

      <HelpTooltip module="gabi" moduleAccent={ACCENT} />
    </div>
  )
}
