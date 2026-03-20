"use client"

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
} from "react"
import { Send, Loader2, Square, Copy, Check, Plus, Paperclip, X, FileText, Sparkles } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { DataTable } from "@/components/data-table"
import { DataChart } from "@/components/data-chart"
import { toast } from "sonner"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  metadata?: Record<string, unknown>
  isError?: boolean
  createdAt?: number
}

/** SSE metadata emitted by /agent-stream as the first event. */
export interface StreamMeta {
  sources?: Array<{ title: string; type: string }>
  orchestration?: { agents: string[]; reason: string }
}

export interface ChatPanelProps {
  messages: Message[]

  /**
   * Non-streaming handler (ntalk).
   * The parent does: add user msg → call API → add assistant msg.
   */
  onSend?: (text: string, attachedFileText?: string) => void

  /**
   * Streaming handler (law, ghost).
   * ChatPanel adds the user message first (via onUserMessage),
   * then opens the SSE stream. When the stream ends it calls onStreamComplete.
   *
   * The SSE reader may emit two event shapes:
   *   {"type": "meta", "sources": [...], "orchestration": {...}}  ← first event (law only)
   *   {"type": "text", "text": "<chunk>"}                        ← content chunks
   *   {"text": "<chunk>"}                                        ← legacy shape (ghost)
   */
  onSendStream?: (
    text: string,
    signal: AbortSignal,
    attachedFileText?: string,
  ) => Promise<ReadableStreamDefaultReader<Uint8Array>>

  /** Called by ChatPanel when streaming finishes (or is stopped). */
  onStreamComplete?: (content: string, meta?: StreamMeta) => void

  /** Reset the conversation. */
  onNewConversation?: () => void

  /** Chips shown in the empty state. Clicking one pre-fills the input. */
  suggestedPrompts?: string[]

  /** True while the parent is waiting for a non-streaming API response. */
  isLoading: boolean

  placeholder?: string
  moduleAccent?: string

  /** Backend URL for extracting text from PDF/DOCX files. If not set, only .txt files work. */
  fileExtractUrl?: string
}

const AGENT_LABELS: Record<string, string> = {
  auditor: "Compliance",
  researcher: "Pesquisa",
  drafter: "Parecer",
  watcher: "Radar",
  writer: "Redação",
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all
                 hover:bg-white/10 text-slate-500 hover:text-slate-300"
      title="Copiar mensagem"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

/** Renders a single assistant message bubble. */
function AssistantBubble({
  msg,
  moduleAccent,
}: {
  msg: Message
  moduleAccent: string
}) {
  const sources = msg.metadata?.sources as Array<{ title: string; type: string }> | undefined
  const orch = msg.metadata?.orchestration as { agents: string[]; reason: string } | undefined
  const results = msg.metadata?.results as
    | { columns: string[]; rows: Record<string, string | number | null>[] }
    | undefined

  const borderColor = msg.isError ? "#ef4444" : moduleAccent

  return (
    <div
      className="max-w-[80%] rounded-xl px-5 py-4 text-[0.9rem] leading-relaxed
                 border border-transparent bg-transparent text-slate-200 prose-chat"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <ReactMarkdown
        components={{
          code: ({ className, children, ...props }) => {
            const isBlock = className?.includes("language-")
            if (isBlock) {
              const codeText = String(children).replace(/\n$/, "")
              return (
                <div className="relative group/code my-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(codeText)
                      toast.success("Código copiado")
                    }}
                    className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px]
                               bg-white/10 text-slate-400 opacity-0 group-hover/code:opacity-100
                               transition-opacity hover:bg-white/20 hover:text-white cursor-pointer"
                  >
                    Copiar
                  </button>
                  <pre className="bg-black/30 rounded p-3 overflow-x-auto text-xs">
                    <code
                      className={className}
                      style={{ fontFamily: "var(--font-data)" }}
                      {...props}
                    >
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
            <div className="overflow-x-auto my-2 rounded border border-white/10">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
          th: ({ children }) => (
            <th className="px-3 py-1.5 text-left font-medium text-slate-300 border-b border-white/10">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-1.5 text-slate-400 border-b border-white/5">
              {children}
            </td>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="text-slate-400">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 pl-1 space-y-0.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 pl-1 space-y-0.5">{children}</ol>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: moduleAccent }}
            >
              {children}
            </a>
          ),
        }}
      >
        {msg.content}
      </ReactMarkdown>

      {/* SQL results (gabi.data) */}
      {results?.columns && results?.rows && results.rows.length > 0 && (() => {
        const hasNumeric = results.columns.some(
          (c) =>
            typeof results.rows[0][c] === "number" &&
            !c.toLowerCase().includes("id"),
        )
        return (
          <>
            {hasNumeric && (
              <DataChart columns={results.columns} rows={results.rows} />
            )}
            <DataTable columns={results.columns} rows={results.rows} />
          </>
        )
      })()}

      {/* RAG source chips */}
      {sources && sources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-widest font-semibold">
            📎 Fontes consultadas
          </p>
          <div className="flex flex-wrap gap-2">
            {sources.map((src, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded
                           bg-[#1E293B] text-[10px] font-medium text-slate-300 border border-[#334155]"
              >
                {src.type === "contract"
                  ? "📑"
                  : src.type === "regulation"
                    ? "⚖️"
                    : src.type === "style"
                      ? "✍️"
                      : "📄"}
                {src.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Orchestration metadata (gabi.legal) */}
      {orch && (
        <p className="text-[10px] text-slate-600 mt-2 flex items-center gap-1">
          <span>Agentes:</span>
          <span className="text-slate-500">
            {orch.agents.map((a) => AGENT_LABELS[a] || a).join(" + ")}
          </span>
          {sources && (
            <>
              <span className="mx-1">·</span>
              <span className="text-slate-500">{sources.length} fontes</span>
            </>
          )}
        </p>
      )}
    </div>
  )
}

export function ChatPanel({
  messages,
  onSend,
  onSendStream,
  onStreamComplete,
  onNewConversation,
  suggestedPrompts,
  isLoading,
  placeholder = "Digite sua mensagem...",
  moduleAccent = "var(--color-gabi-primary)",
  fileExtractUrl,
}: ChatPanelProps) {
  const [input, setInput] = useState("")
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll when messages or streaming content changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  const isStreaming = streamingContent !== null
  const busy = isLoading || isStreaming

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (e.target) e.target.value = ""

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande (máx 10MB)")
      return
    }

    setFileLoading(true)
    try {
      const ext = file.name.split(".").pop()?.toLowerCase()

      if (ext === "txt" || ext === "md" || ext === "csv") {
        const text = await file.text()
        setAttachedFile({ name: file.name, text })
      } else if (fileExtractUrl && (ext === "pdf" || ext === "docx")) {
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch(fileExtractUrl, {
          method: "POST",
          body: formData,
          credentials: "include",
        })
        if (!res.ok) throw new Error("Falha ao extrair texto")
        const data = await res.json()
        setAttachedFile({ name: file.name, text: data.text || "" })
      } else {
        toast.error(`Tipo não suportado: .${ext}. Use PDF, DOCX ou TXT.`)
        return
      }
      toast.success(`📎 ${file.name} anexado`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao ler arquivo")
    } finally {
      setFileLoading(false)
    }
  }, [fileExtractUrl])

  const handleStream = useCallback(
    async (text: string, docText?: string) => {
      if (!onSendStream) return

      const controller = new AbortController()
      abortRef.current = controller
      setStreamingContent("")

      let fullText = ""
      const streamMeta: StreamMeta = {}

      try {
        const reader = await onSendStream(text, controller.signal, docText)
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const raw = decoder.decode(value, { stream: true })
          for (const line of raw.split("\n")) {
            if (!line.startsWith("data: ")) continue
            const payload = line.slice(6).trim()
            if (payload === "[DONE]") break
            try {
              const parsed = JSON.parse(payload)

              // Structured event (law): {"type": "meta"|"text", ...}
              if (parsed.type === "meta") {
                if (parsed.sources) streamMeta.sources = parsed.sources
                if (parsed.orchestration) streamMeta.orchestration = parsed.orchestration
              } else if (parsed.type === "text" && parsed.text) {
                fullText += parsed.text
                setStreamingContent(fullText)
              } else if (parsed.text) {
                // Legacy shape (ghost): {"text": "..."}
                fullText += parsed.text
                setStreamingContent(fullText)
              }
            } catch {
              // skip malformed line
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          // Surface real errors as a failed message
          onStreamComplete?.(
            "Ocorreu um erro durante a geração. Tente novamente.",
            {},
          )
          setStreamingContent(null)
          abortRef.current = null
          return
        }
        // AbortError = user stopped streaming; keep whatever was streamed
      }

      setStreamingContent(null)
      abortRef.current = null

      if (fullText.trim()) {
        onStreamComplete?.(fullText, streamMeta)
      }
    },
    [onSendStream, onStreamComplete],
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return

    const docText = attachedFile?.text
    setInput("")
    setAttachedFile(null)
    if (textareaRef.current) textareaRef.current.style.height = "auto"

    if (onSendStream) {
      handleStream(text, docText)
    } else {
      onSend?.(text, docText)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
    if (e.key === "Escape") {
      setInput("")
      textareaRef.current?.blur()
    }
  }

  const autoGrow = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"
  }

  const fillPrompt = (prompt: string) => {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      {onNewConversation && (
        <div className="px-4 pt-3 flex justify-end">
          <button
            onClick={onNewConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       text-slate-400 hover:text-white bg-[#1E293B] hover:bg-white/10
                       border border-[#334155] transition-all duration-200"
            title="Nova conversa"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova conversa
          </button>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Empty state */}
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full gap-8 pb-16 px-4">
            {/* Hero */}
            <div className="text-center space-y-3">
              <div
                className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
                style={{ background: `color-mix(in srgb, ${moduleAccent} 15%, transparent)` }}
              >
                <Sparkles className="w-7 h-7" style={{ color: moduleAccent }} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                Como posso te ajudar{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${moduleAccent}, color-mix(in srgb, ${moduleAccent} 60%, #fff))`,
                  }}
                >
                  hoje?
                </span>
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Orquesto agentes jurídicos, de redação e compliance para resolver qualquer demanda.
              </p>
            </div>

            {/* Action Cards */}
            {suggestedPrompts && suggestedPrompts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full">
                {[
                  {
                    icon: "⚖️",
                    title: "Compliance",
                    desc: "Contratos, normativos & auditoria regulatória",
                    prompt: suggestedPrompts[0],
                  },
                  {
                    icon: "✍️",
                    title: "Redação",
                    desc: "Pareceres, relatórios & textos com estilo",
                    prompt: suggestedPrompts[1] || suggestedPrompts[0],
                  },
                  {
                    icon: "📊",
                    title: "Análise Regulatória",
                    desc: "Radar de normas, impacto & mudanças",
                    prompt: suggestedPrompts[2] || suggestedPrompts[0],
                  },
                ].map((card, i) => (
                  <button
                    key={i}
                    onClick={() => fillPrompt(card.prompt)}
                    className="group p-4 rounded-xl text-left transition-all duration-200
                               bg-[#1E293B]/60 hover:bg-[#263145] border border-[#334155]
                               hover:border-slate-500 hover:scale-[1.02] hover:shadow-lg"
                  >
                    <span className="text-2xl block mb-2">{card.icon}</span>
                    <span className="text-sm font-semibold text-white block mb-1">{card.title}</span>
                    <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                      {card.desc}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick prompt chips */}
            {suggestedPrompts && suggestedPrompts.length > 3 && (
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                {suggestedPrompts.slice(3).map((p, i) => (
                  <button
                    key={i}
                    onClick={() => fillPrompt(p)}
                    className="px-3 py-1.5 rounded-full text-xs text-slate-500 hover:text-white
                               bg-[#1E293B]/40 hover:bg-[#263145] border border-[#334155]/50
                               hover:border-slate-500 transition-all duration-200"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex group ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            {/* Copy button — assistant left, user right */}
            {msg.role === "assistant" && (
              <div className="pt-1 pr-2 shrink-0 self-start">
                <CopyButton text={msg.content} />
              </div>
            )}

            <div className="flex flex-col gap-1 max-w-[78%]">
              {msg.role === "user" ? (
                <div className="rounded-xl px-5 py-4 text-[0.9rem] leading-relaxed
                                bg-[#1E293B] border border-[#334155] text-slate-100
                                whitespace-pre-wrap">
                  {msg.content}
                </div>
              ) : (
                <AssistantBubble msg={msg} moduleAccent={moduleAccent} />
              )}
              {/* Timestamp */}
              {msg.createdAt && (
                <span
                  className={`text-[10px] text-slate-600 ${
                    msg.role === "user" ? "text-right" : "text-left pl-1"
                  }`}
                >
                  {formatTime(msg.createdAt)}
                </span>
              )}
            </div>

            {msg.role === "user" && (
              <div className="pt-1 pl-2 shrink-0 self-start">
                <CopyButton text={msg.content} />
              </div>
            )}
          </div>
        ))}

        {/* In-progress streaming bubble */}
        {isStreaming && (
          <div className="flex justify-start animate-fade-in">
            <AssistantBubble
              msg={{
                id: "__streaming__",
                role: "assistant",
                content: streamingContent ?? "",
              }}
              moduleAccent={moduleAccent}
            />
          </div>
        )}

        {/* Non-streaming loading indicator */}
        {isLoading && !isStreaming && (
          <div className="flex justify-start animate-fade-in">
            <div
              className="bg-transparent rounded-xl px-5 py-4 border border-transparent"
              style={{ borderLeft: `3px solid ${moduleAccent}` }}
            >
              <div className="flex items-center gap-2">
                <Loader2
                  className="w-4 h-4 animate-spin"
                  style={{ color: moduleAccent }}
                />
                <span className="text-[0.9rem] text-slate-400">
                  gabi está pensando...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[#1E293B]">
        {/* Attached file chip */}
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px]">{attachedFile.name}</span>
              <span className="text-amber-500/50 text-[10px]">({(attachedFile.text.length / 1024).toFixed(0)}KB)</span>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-0.5 rounded hover:bg-amber-500/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* File loading indicator */}
        {fileLoading && (
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Extraindo texto do arquivo...
          </div>
        )}

        <div
          className="flex items-end gap-2 border rounded-xl px-4 py-3 bg-[#1E293B] shadow-sm
                     transition-all duration-200 focus-within:border-slate-500"
          style={{ borderColor: "#334155" }}
        >
          {/* File attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || fileLoading}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5
                       transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            title="Anexar documento (PDF, DOCX, TXT)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={autoGrow}
            onKeyDown={handleKeyDown}
            placeholder={attachedFile ? `Pergunte sobre ${attachedFile.name}...` : placeholder}
            disabled={busy && !isStreaming}
            className="flex-1 bg-transparent resize-none text-[0.9rem] text-slate-100
                       placeholder:text-slate-500 focus:outline-none max-h-[200px]
                       disabled:opacity-50"
            rows={1}
          />

          {/* Stop streaming button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30
                         text-red-400 hover:text-red-300 transition-all duration-200"
              title="Parar geração"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="p-2 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed
                         transition-all duration-200 active:scale-95"
              style={{
                background:
                  input.trim() && !busy ? moduleAccent : undefined,
                backgroundColor:
                  !input.trim() || busy ? "#334155" : undefined,
              }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-700 mt-1.5 text-center">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </form>
    </div>
  )
}
