"use client"

import { useRef, useEffect } from "react"
import { Plus } from "lucide-react"

import { useChatStream } from "./chat/use-chat"
import { ChatInputArea } from "./chat/chat-input"
import { ChatMessageList } from "./chat/chat-message-list"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  metadata?: Record<string, unknown>
  isError?: boolean
  createdAt?: number
}

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
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    streamingContent,
    attachedFile,
    setAttachedFile,
    fileLoading,
    handleFileSelect,
    handleStream,
    stopStreaming,
  } = useChatStream({ onSendStream, onStreamComplete, fileExtractUrl })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  const isStreaming = streamingContent !== null
  const busy = isLoading || isStreaming

  const fillPrompt = (prompt: string) => {
    if (inputRef.current) {
      inputRef.current.value = prompt
      // Trigger onChange event to autoGrow
      const event = new Event("change", { bubbles: true })
      inputRef.current.dispatchEvent(event)
      inputRef.current.focus()
    }
  }

  const handleSendAdapter = (text: string, docText?: string) => {
    if (onSend) onSend(text, docText)
  }

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
      <ChatMessageList
        messages={messages}
        isStreaming={isStreaming}
        isLoading={isLoading}
        streamingContent={streamingContent}
        moduleAccent={moduleAccent}
        suggestedPrompts={suggestedPrompts}
        fillPrompt={fillPrompt}
        bottomRef={bottomRef}
      />

      {/* Input area */}
      <ChatInputArea
        onSend={handleSendAdapter}
        onSendStream={handleStream}
        hasStreamSupport={!!onSendStream}
        busy={busy}
        isStreaming={isStreaming}
        stopStreaming={stopStreaming}
        placeholder={placeholder}
        moduleAccent={moduleAccent}
        fileLoading={fileLoading}
        attachedFile={attachedFile}
        setAttachedFile={setAttachedFile}
        handleFileSelect={handleFileSelect}
        inputRef={inputRef}
      />
    </div>
  )
}
