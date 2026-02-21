"use client"

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react"
import { Send, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  metadata?: Record<string, unknown>
}

interface ChatPanelProps {
  messages: Message[]
  onSend: (message: string) => void
  /** Optional streaming handler — returns a ReadableStreamDefaultReader for SSE */
  onSendStream?: (message: string) => Promise<ReadableStreamDefaultReader<Uint8Array>>
  isLoading: boolean
  placeholder?: string
  moduleAccent?: string
}

export function ChatPanel({
  messages,
  onSend,
  onSendStream,
  isLoading,
  placeholder = "Digite sua mensagem...",
  moduleAccent = "var(--color-gabi-primary)",
}: ChatPanelProps) {
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Keyboard shortcuts: Cmd+Enter to send, Escape to clear
  useKeyboardShortcuts([
    {
      key: "Enter",
      meta: true,
      action: () => {
        if (input.trim() && !isLoading && !isStreaming) {
          const text = input.trim()
          setInput("")
          if (onSendStream) handleStream(text)
          else onSend(text)
        }
      },
    },
    {
      key: "Escape",
      action: () => {
        setInput("")
        textareaRef.current?.blur()
      },
    },
  ])

  const handleStream = useCallback(async (text: string) => {
    if (!onSendStream) return
    setIsStreaming(true)

    try {
      const reader = await onSendStream(text)
      const decoder = new TextDecoder()
      const msgId = (Date.now() + 1).toString()

      // Add empty assistant message that we'll update progressively
      onSend(`__STREAM_START__${msgId}`)

      let fullText = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // Parse SSE: each event is "data: {...}\n\n"
        const lines = chunk.split("\n")
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6)
            if (payload === "[DONE]") break
            try {
              const parsed = JSON.parse(payload)
              if (parsed.text) {
                fullText += parsed.text
                // Update the streaming message
                onSend(`__STREAM_UPDATE__${msgId}__${fullText}`)
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Erro no streaming"
      onSend(`__STREAM_ERROR__${errorMsg}`)
    } finally {
      setIsStreaming(false)
    }
  }, [onSendStream, onSend])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || isStreaming) return
    const text = input.trim()
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"

    if (onSendStream) {
      // User message is added by the parent, then we stream
      handleStream(text)
    } else {
      onSend(text)
    }
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

  const busy = isLoading || isStreaming

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
              {msg.role === "assistant" ? (
                <div className="prose-chat" style={{ fontFamily: "var(--font-ui)" }}>
                  <ReactMarkdown
                    components={{
                      code: ({ className, children, ...props }) => {
                        const isBlock = className?.includes("language-")
                        if (isBlock) {
                          const codeText = String(children).replace(/\n$/, "")
                          return (
                            <div className="relative group my-2">
                              <button
                                onClick={() => { navigator.clipboard.writeText(codeText); }}
                                className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-slate-400
                                           opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 hover:text-white cursor-pointer"
                              >
                                Copiar
                              </button>
                              <pre className="bg-black/30 rounded-[var(--radius-tech)] p-3 overflow-x-auto text-xs">
                                <code className={className} style={{ fontFamily: "var(--font-data)" }} {...props}>
                                  {children}
                                </code>
                              </pre>
                            </div>
                          )
                        }
                        return (
                          <code
                            className="bg-white/10 px-1.5 py-0.5 rounded text-[0.85em]"
                            style={{ fontFamily: "var(--font-data)" }}
                            {...props}
                          >
                            {children}
                          </code>
                        )
                      },
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2 rounded-[var(--radius-tech)] border border-white/10">
                          <table className="w-full text-xs">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
                      th: ({ children }) => <th className="px-3 py-1.5 text-left font-medium text-slate-300 border-b border-white/10">{children}</th>,
                      td: ({ children }) => <td className="px-3 py-1.5 text-slate-400 border-b border-white/5">{children}</td>,
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      em: ({ children }) => <em className="text-slate-400">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 pl-1 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 pl-1 space-y-0.5">{children}</ol>,
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: moduleAccent }}>
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  {/* RAG Source Cards */}
                  {(() => {
                    const sources = msg.metadata?.sources as Array<{ title: string; type: string }> | undefined
                    if (!sources || !Array.isArray(sources) || sources.length === 0) return null
                    return (
                      <div className="mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-[10px] text-slate-600 mb-1.5 uppercase tracking-wider font-medium">📎 Fontes consultadas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {sources.map((src: { title: string; type: string }, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{
                                background: `color-mix(in srgb, ${moduleAccent} 10%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${moduleAccent} 20%, transparent)`,
                                color: moduleAccent,
                              }}
                            >
                              {src.type === "contract" ? "📑" : src.type === "regulation" ? "⚖️" : src.type === "style" ? "✍️" : "📄"}
                              {src.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="whitespace-pre-wrap" style={{ fontFamily: "var(--font-ui)" }}>
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && !isStreaming && (
          <div className="flex justify-start animate-fade-in">
            <div
              className="bg-[var(--color-surface-card)] rounded-[var(--radius-soft)] px-4 py-3"
              style={{ borderLeft: `2px solid ${moduleAccent}` }}
            >
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: moduleAccent }} />
                <span className="text-xs text-slate-500">gabi. está pensando...</span>
              </div>
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
            disabled={!input.trim() || busy}
            className="p-2 rounded-[var(--radius-tech)] disabled:opacity-20 disabled:cursor-not-allowed
                       transition-all duration-200 active:scale-95"
            style={{
              background: input.trim() && !busy ? moduleAccent : undefined,
              backgroundColor: !input.trim() || busy ? "rgba(255,255,255,0.05)" : undefined,
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  )
}
