"use client"

import { useState, useRef, useEffect, type FormEvent } from "react"
import { Send, Loader2 } from "lucide-react"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  metadata?: Record<string, unknown>
}

interface ChatPanelProps {
  messages: Message[]
  onSend: (message: string) => void
  isLoading: boolean
  placeholder?: string
  moduleAccent?: string
}

export function ChatPanel({
  messages,
  onSend,
  isLoading,
  placeholder = "Digite sua mensagem...",
  moduleAccent = "var(--color-gabi-primary)",
}: ChatPanelProps) {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    onSend(input.trim())
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const autoGrow = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-slate-600 text-sm">Comece uma conversa com a</p>
              <p className="brand-mark text-2xl mt-1 text-white">
                gabi<span className="dot">.</span>
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            <div
              className={`max-w-[75%] rounded-[var(--radius-soft)] px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-white/5 text-white tech-border"
                  : "bg-[var(--color-surface-card)] text-slate-200"
              }`}
              style={msg.role === "assistant" ? { borderLeft: `2px solid ${moduleAccent}` } : undefined}
            >
              <div className="whitespace-pre-wrap" style={{ fontFamily: "var(--font-ui)" }}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div
              className="bg-[var(--color-surface-card)] rounded-[var(--radius-soft)] px-4 py-3"
              style={{ borderLeft: `2px solid ${moduleAccent}` }}
            >
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: moduleAccent }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-end gap-2 tech-border rounded-[var(--radius-soft)] px-4 py-2.5 bg-[var(--color-surface-card)]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={autoGrow}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent resize-none text-sm text-white
                       placeholder:text-slate-600 focus:outline-none max-h-[200px]"
            style={{ fontFamily: "var(--font-ui)" }}
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-[var(--radius-tech)] disabled:opacity-20 disabled:cursor-not-allowed
                       transition-all duration-200 active:scale-95"
            style={{
              background: input.trim() && !isLoading ? moduleAccent : undefined,
              backgroundColor: !input.trim() || isLoading ? "rgba(255,255,255,0.05)" : undefined,
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  )
}
