"use client"

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react"
import { Send, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { DataTable } from "@/components/data-table"
import { DataChart } from "@/components/data-chart"

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
              className={`max-w-[75%] rounded-xl px-5 py-4 text-[0.9rem] leading-relaxed border ${
                msg.role === "user"
                  ? "bg-[#1E293B] border-[#334155] text-slate-100"
                  : "bg-transparent border-transparent text-slate-200"
              }`}
              style={msg.role === "assistant" ? { borderLeft: `3px solid ${moduleAccent}` } : undefined}
            >
              {msg.role === "assistant" ? (
                <div className="prose-chat">
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
                              <pre className="bg-black/30 rounded-tech p-3 overflow-x-auto text-xs">
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
                        <div className="overflow-x-auto my-2 rounded-tech border border-white/10">
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

                  {/* SQL Results Visuals — for gabi.data */}
                  {(() => {
                    const results = msg.metadata?.results as { columns: string[], rows: Record<string, string | number | null>[] } | undefined
                    if (!results?.columns || !results?.rows || results.rows.length === 0) return null
                    
                    // Show chart only if we have at least one numeric column (besides ID) and one string column
                    const hasNumeric = results.columns.some(c => typeof results.rows[0][c] === "number" && !c.toLowerCase().includes("id"))
                    
                    return (
                      <>
                        {hasNumeric && <DataChart columns={results.columns} rows={results.rows} />}
                        <DataTable columns={results.columns} rows={results.rows} accent={moduleAccent} />
                      </>
                    )
                  })()}

                  {/* RAG Source Cards */}
                  {(() => {
                    const sources = msg.metadata?.sources as Array<{ title: string; type: string }> | undefined
                    if (!sources || !Array.isArray(sources) || sources.length === 0) return null
                    return (
                      <div className="mt-4 pt-3 border-t border-[#1E293B]">
                        <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-widest font-semibold">📎 Fontes consultadas</p>
                        <div className="flex flex-wrap gap-2">
                          {sources.map((src: { title: string; type: string }, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1E293B] text-[10px] font-medium text-slate-300 border border-[#334155]"
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
              className="bg-[#1E293B] rounded-xl px-5 py-4 border border-[#334155]"
              style={{ borderLeft: `3px solid ${moduleAccent}` }}
            >
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: moduleAccent }} />
                <span className="text-[0.9rem] text-slate-400">gabi está pensando...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-[#1E293B]"
      >
        <div className="flex items-end gap-2 border border-[#334155] rounded-xl px-4 py-3 bg-[#1E293B] shadow-sm">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={autoGrow}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent resize-none text-[0.9rem] text-slate-100
                       placeholder:text-slate-500 focus:outline-none max-h-[200px]"
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="p-2 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed
                       transition-all duration-200 active:scale-95"
            style={{
              background: input.trim() && !busy ? moduleAccent : undefined,
              backgroundColor: !input.trim() || busy ? "#334155" : undefined,
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  )
}
