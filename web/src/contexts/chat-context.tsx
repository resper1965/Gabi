"use client"

/**
 * ChatContext — persists message state across module navigation.
 * Stored in memory (session-scoped). Each module key (e.g. "law")
 * holds its own independent message array. "ghost" is a legacy alias for writer.
 */

import { createContext, useCallback, useContext, useState } from "react"
import type { Message } from "@/components/chat-panel"

type Updater = Message[] | ((prev: Message[]) => Message[])

interface ChatContextValue {
  getMessages: (module: string) => Message[]
  setMessages: (module: string, updater: Updater) => void
  clearMessages: (module: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Record<string, Message[]>>({})

  const getMessages = useCallback(
    (module: string) => store[module] ?? [],
    [store],
  )

  const setMessages = useCallback((module: string, updater: Updater) => {
    setStore((prev) => ({
      ...prev,
      [module]:
        typeof updater === "function" ? updater(prev[module] ?? []) : updater,
    }))
  }, [])

  const clearMessages = useCallback((module: string) => {
    setStore((prev) => ({ ...prev, [module]: [] }))
  }, [])

  return (
    <ChatContext.Provider value={{ getMessages, setMessages, clearMessages }}>
      {children}
    </ChatContext.Provider>
  )
}

/** Hook for a specific module's chat state. */
export function useChatStore(module: string) {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChatStore must be used inside <ChatProvider>")
  return {
    messages: ctx.getMessages(module),
    setMessages: (updater: Updater) => ctx.setMessages(module, updater),
    clearMessages: () => ctx.clearMessages(module),
  }
}
