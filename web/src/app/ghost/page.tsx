"use client"

import { useState, useCallback } from "react"
import { ChatPanel } from "@/components/chat-panel"
import { KnowledgePanel } from "@/components/knowledge-panel"
import { OnboardingStepper } from "@/components/onboarding-stepper"
import { ChatHistorySidebar } from "@/components/chat-history-sidebar"
import { HelpTooltip } from "@/components/help-tooltip"
import { useChatStore } from "@/contexts/chat-context"
import { gabi } from "@/lib/api"
import { PenTool, History } from "lucide-react"

const ACCENT = "var(--color-mod-ghost)"
const CTX_WINDOW = 10

const SUGGESTED_PROMPTS = [
  "Escreva um relatório executivo sobre resultado do trimestre",
  "Redija um e-mail formal para parceiros comerciais",
  "Crie uma análise de mercado para apresentação",
  "Revise e melhore o tom deste texto",
]

export default function GhostPage() {
  const { messages, setMessages, clearMessages } = useChatStore("ghost")
  const [isLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [profileId, setProfileId] = useState("default")
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Dismiss onboarding on first interaction
  const dismissOnboarding = useCallback(() => setShowOnboarding(false), [])

  // ── Streaming handler ─────────────────────────────────────────────────────
  const handleSendStream = useCallback(
    async (text: string, signal: AbortSignal) => {
      // Add user message
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "user", content: text, createdAt: Date.now() },
      ])
      dismissOnboarding()

      const history = messages
        .slice(-CTX_WINDOW)
        .map((m) => ({ role: m.role, content: m.content }))

      return gabi.ghost.generateStream(
        { profile_id: profileId, prompt: text, chat_history: history },
        signal,
      )
    },
    [messages, profileId, setMessages, dismissOnboarding],
  )

  const handleStreamComplete = useCallback(
    (content: string) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content, createdAt: Date.now() },
      ])
    },
    [setMessages],
  )

  const handleNewConversation = useCallback(() => {
    clearMessages()
    setShowOnboarding(true)
  }, [clearMessages])

  return (
    <div className="h-full flex">
      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-6 py-4 flex items-center justify-between border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `color-mix(in srgb, var(--color-mod-ghost) 15%, transparent)` }}
            >
              <PenTool className="w-4 h-4" style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">gabi.writer</h1>
              <p className="text-xs text-slate-500">Sua IA Escritora</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
              title="Histórico"
            >
              <History className="w-4 h-4" />
            </button>
            <KnowledgePanel
              isOpen={false}
              onToggle={() => setPanelOpen(!panelOpen)}
              moduleAccent={ACCENT}
              onProfileChange={setProfileId}
              activeProfileId={profileId}
            />
          </div>
        </header>

        {/* Onboarding or Chat */}
        {showOnboarding && messages.length === 0 ? (
          <OnboardingStepper
            moduleAccent={ACCENT}
            onStart={() => {
              setPanelOpen(true)
              dismissOnboarding()
            }}
          />
        ) : (
          <ChatPanel
            messages={messages}
            onSendStream={handleSendStream}
            onStreamComplete={handleStreamComplete}
            onNewConversation={handleNewConversation}
            suggestedPrompts={SUGGESTED_PROMPTS}
            isLoading={isLoading}
            placeholder="Peça para a gabi. escrever algo..."
            moduleAccent={ACCENT}
          />
        )}
      </div>

      {/* Knowledge Panel sidebar */}
      {panelOpen && (
        <KnowledgePanel
          isOpen={true}
          onToggle={() => setPanelOpen(false)}
          moduleAccent={ACCENT}
          onProfileChange={setProfileId}
          activeProfileId={profileId}
        />
      )}

      {/* Chat History sidebar */}
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
          dismissOnboarding()
        }}
        module="ghost"
        moduleAccent={ACCENT}
      />

      <HelpTooltip module="ghost" moduleAccent={ACCENT} />
    </div>
  )
}
