"use client"

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
} from "react"
import { Send, Loader2, Square, Plus, Paperclip, X, FileText } from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/chat/empty-state"
import { AssistantBubble, CopyButton, formatTime } from "@/components/chat/message-bubble"

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
  onSend?: (text: string, attachedFileText?: string) => void
  onSendStream?: (
    text: string,
    signal: AbortSignal,
    attachedFileText?: string,
  ) => Promise<ReadableStreamDefaultReader<Uint8Array>>
  onStreamComplete?: (content: string, meta?: StreamMeta) => void
  onNewConversation?: () => void
  suggestedPrompts?: string[]
  isLoading: boolean
  placeholder?: string
  moduleAccent?: string
  fileExtractUrl?: string
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  const isStreaming = streamingContent !== null
  const busy = isLoading || isStreaming

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (e.target) e.target.value = ""

    const maxSize = 10 * 1024 * 1024
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

  // ── Streaming ──────────────────────────────────────────────────────────────
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
              if (parsed.type === "meta") {
                if (parsed.sources) streamMeta.sources = parsed.sources
                if (parsed.orchestration) streamMeta.orchestration = parsed.orchestration
              } else if (parsed.type === "text" && parsed.text) {
                fullText += parsed.text
                setStreamingContent(fullText)
              } else if (parsed.text) {
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
          onStreamComplete?.(
            "Ocorreu um erro durante a geração. Tente novamente.",
            {},
          )
          setStreamingContent(null)
          abortRef.current = null
          return
        }
      }

      setStreamingContent(null)
      abortRef.current = null
      if (fullText.trim()) {
        onStreamComplete?.(fullText, streamMeta)
      }
    },
    [onSendStream, onStreamComplete],
  )

  // ── Submit ─────────────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {messages.length === 0 && !isStreaming && (
          <EmptyState
            moduleAccent={moduleAccent}
            suggestedPrompts={suggestedPrompts}
            onSelectPrompt={fillPrompt}
          />
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex group ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
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

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[#1E293B]">
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
