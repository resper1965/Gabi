'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '../utils'

// ============================================
// Shared Chat UI Components
// Reusable across all Gabi chat projects
// ============================================

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: Date
  sources?: Array<{ id: string; content: string; score?: number }>
}

// ============================================
// Chat Message Bubble
// ============================================

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
  className?: string
}

export function ChatMessageBubble({ message, isStreaming, className }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn(
      'flex w-full gap-3',
      isUser ? 'justify-end' : 'justify-start',
      className
    )}>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-foreground',
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-current animate-pulse ml-0.5" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Chat Input
// ============================================

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

export function ChatInput({ onSend, isLoading, placeholder = 'Type a message...', className }: ChatInputProps) {
  const [input, setInput] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex items-end gap-2', className)}>
      <textarea
        ref={textareaRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder}
        rows={1}
        disabled={isLoading}
        className={cn(
          'flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3',
          'text-sm placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'max-h-[200px] min-h-[48px]'
        )}
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className={cn(
          'shrink-0 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground',
          'hover:bg-primary/90 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'min-h-[48px]'
        )}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          'Send'
        )}
      </button>
    </form>
  )
}

// ============================================
// Streaming Handler (server-side)
// ============================================

/**
 * Create a streaming response from an async generator.
 * Use in Next.js API routes to stream AI responses.
 */
export function createStreamResponse(stream: AsyncGenerator<string>): Response {
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (error) {
        console.error('[stream] Error:', error)
        controller.enqueue(encoder.encode('\n\n[Error generating response]'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
