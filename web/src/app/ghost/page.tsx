"use client"

import { useState, useCallback, useRef } from "react"
import { ChatPanel, type Message } from "@/components/chat-panel"
import { KnowledgePanel } from "@/components/knowledge-panel"
import { OnboardingStepper } from "@/components/onboarding-stepper"
import { gabi } from "@/lib/api"
import { PenTool } from "lucide-react"

const ACCENT = "var(--color-mod-ghost)"
const CTX_WINDOW = 10

export default function GhostPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [profileId, setProfileId] = useState("default")
  const [showOnboarding, setShowOnboarding] = useState(true)
  const streamingMsgRef = useRef<string | null>(null)

  const handleSend = useCallback(async (text: string) => {
    // Handle streaming protocol messages from ChatPanel
    if (text.startsWith("__STREAM_START__")) {
      const msgId = text.replace("__STREAM_START__", "")
      streamingMsgRef.current = msgId
      setMessages((prev) => [...prev, { id: msgId, role: "assistant", content: "" }])
      return
    }
    if (text.startsWith("__STREAM_UPDATE__")) {
      const parts = text.replace("__STREAM_UPDATE__", "").split("__")
      const msgId = parts[0]
      const content = parts.slice(1).join("__")
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content } : m))
      )
      return
    }
    if (text.startsWith("__STREAM_ERROR__")) {
      const errorMsg = text.replace("__STREAM_ERROR__", "")
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: `⚠️ ${errorMsg}` }])
      return
    }

    // Normal user message
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setShowOnboarding(false)
    setIsLoading(true)

    // If no stream handler, fall back to regular generation
    try {
      const history = messages.slice(-CTX_WINDOW).map((m) => ({ role: m.role, content: m.content }))
      const res = await gabi.ghost.generate({
        profile_id: profileId,
        prompt: text,
        chat_history: history,
      }) as { text: string; sources?: Array<{ title: string; type: string }> }

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: res.text || "Sem resposta",
        metadata: res.sources ? { sources: res.sources } : undefined,
      }])
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Erro desconhecido"
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `⚠️ ${errorMsg}` }])
    } finally {
      setIsLoading(false)
    }
  }, [messages, profileId])

  const handleSendStream = useCallback(async (text: string): Promise<ReadableStreamDefaultReader<Uint8Array>> => {
    // Add user message first
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setShowOnboarding(false)

    const history = messages.slice(-CTX_WINDOW).map((m) => ({ role: m.role, content: m.content }))
    return gabi.ghost.generateStream({
      profile_id: profileId,
      prompt: text,
      chat_history: history,
    })
  }, [messages, profileId])

  const handleProfileChange = useCallback((id: string) => {
    setProfileId(id)
  }, [])

  const handleStartOnboarding = () => {
    setPanelOpen(true)
    setShowOnboarding(false)
  }

  return (
    <div className="h-full flex">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
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

          {/* Panel toggle */}
          <KnowledgePanel
            isOpen={false}
            onToggle={() => setPanelOpen(!panelOpen)}
            moduleAccent={ACCENT}
            onProfileChange={handleProfileChange}
            activeProfileId={profileId}
          />
        </header>

        {/* Onboarding or Chat */}
        {showOnboarding && messages.length === 0 ? (
          <OnboardingStepper moduleAccent={ACCENT} onStart={handleStartOnboarding} />
        ) : (
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            onSendStream={handleSendStream}
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
          onProfileChange={handleProfileChange}
          activeProfileId={profileId}
        />
      )}
    </div>
  )
}
