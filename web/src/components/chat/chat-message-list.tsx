"use client"
import { Loader2 } from "lucide-react"
import { AssistantBubble, CopyButton, formatTime } from "./message-bubble"
import { EmptyState } from "./empty-state"
import type { Message } from "@/components/chat-panel"

export interface ChatMessageListProps {
  messages: Message[]
  isStreaming: boolean
  isLoading: boolean
  streamingContent: string | null
  moduleAccent: string
  suggestedPrompts?: string[]
  fillPrompt: (prompt: string) => void
  bottomRef: React.RefObject<HTMLDivElement | null>
}

export function ChatMessageList({
  messages,
  isStreaming,
  isLoading,
  streamingContent,
  moduleAccent,
  suggestedPrompts,
  fillPrompt,
  bottomRef,
}: ChatMessageListProps) {
  return (
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
              <div
                className="rounded-xl px-5 py-4 text-[0.9rem] leading-relaxed
                           bg-[#1E293B] border border-[#334155] text-slate-100
                           whitespace-pre-wrap"
              >
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
  )
}
