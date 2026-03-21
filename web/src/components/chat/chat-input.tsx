"use client"
import type { FormEvent } from "react"
import { useRef, useState } from "react"
import { FileText, Loader2, Paperclip, Send, Square, X } from "lucide-react"

export interface ChatInputProps {
  onSend: (text: string, docText?: string) => void
  onSendStream: (text: string, docText?: string) => void
  hasStreamSupport: boolean
  busy: boolean
  isStreaming: boolean
  stopStreaming: () => void
  placeholder: string
  moduleAccent: string
  fileLoading: boolean
  attachedFile: { name: string; text: string } | null
  setAttachedFile: (file: null) => void
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}

export function ChatInputArea({
  onSend,
  onSendStream,
  hasStreamSupport,
  busy,
  isStreaming,
  stopStreaming,
  placeholder,
  moduleAccent,
  fileLoading,
  attachedFile,
  setAttachedFile,
  handleFileSelect,
  inputRef,
}: ChatInputProps) {
  const [input, setInput] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return

    const docText = attachedFile?.text
    setInput("")
    setAttachedFile(null)
    if (inputRef.current) inputRef.current.style.height = "auto"

    if (hasStreamSupport) {
      onSendStream(text, docText)
    } else {
      onSend(text, docText)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
    if (e.key === "Escape") {
      setInput("")
      inputRef.current?.blur()
    }
  }

  const autoGrow = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"
  }

  return (
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
          ref={inputRef}
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
              background: input.trim() && !busy ? moduleAccent : undefined,
              backgroundColor: !input.trim() || busy ? "#334155" : undefined,
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
  )
}
