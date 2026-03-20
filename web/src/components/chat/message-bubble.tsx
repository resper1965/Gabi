"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { DataTable } from "@/components/data-table"
import { DataChart } from "@/components/data-chart"
import { toast } from "sonner"
import type { Message } from "@/components/chat-panel"

const AGENT_LABELS: Record<string, string> = {
  auditor: "Compliance",
  researcher: "Pesquisa",
  drafter: "Parecer",
  watcher: "Radar",
  writer: "Redação",
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function CopyButton({ text }: { text: string }) {
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

export function AssistantBubble({
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

      {/* Orchestration metadata */}
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
