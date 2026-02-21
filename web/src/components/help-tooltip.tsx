"use client"

import { useState } from "react"
import { HelpCircle, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { getModuleDocs } from "@/lib/docs-content"

interface HelpTooltipProps {
  module: string
  moduleAccent?: string
}

export function HelpTooltip({ module, moduleAccent = "var(--color-gabi-primary)" }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const content = getModuleDocs(module)

  if (!content) return null

  return (
    <>
      {/* Floating ? button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full flex items-center justify-center
                   shadow-lg hover:scale-110 transition-all duration-200 cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${moduleAccent}, ${moduleAccent}88)`,
          boxShadow: `0 4px 20px ${moduleAccent}33`,
        }}
        title="Ajuda"
      >
        <HelpCircle className="w-5 h-5 text-white" />
      </button>

      {/* Drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <aside
            className="relative w-full max-w-md h-full overflow-y-auto animate-in slide-in-from-right-full"
            style={{ background: "var(--color-surface-card)" }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
              style={{
                background: "var(--color-surface-card)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" style={{ color: moduleAccent }} />
                <span className="text-sm font-semibold text-white">Guia Rápido</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="prose-docs">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => <h2 className="text-lg font-semibold text-white mt-0 mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-5 mb-2">{children}</h3>,
                    p: ({ children }) => <p className="text-sm text-slate-400 mb-2.5 leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2.5 pl-1 space-y-1 text-sm text-slate-400">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2.5 pl-1 space-y-1 text-sm text-slate-400">{children}</ol>,
                    code: ({ children }) => (
                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-[0.85em]" style={{ color: moduleAccent, fontFamily: "var(--font-data)" }}>
                        {children}
                      </code>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2.5 rounded-lg border border-white/10">
                        <table className="w-full text-xs">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
                    th: ({ children }) => <th className="px-3 py-1.5 text-left font-medium text-slate-300 border-b border-white/10">{children}</th>,
                    td: ({ children }) => <td className="px-3 py-1.5 text-slate-400 border-b border-white/5">{children}</td>,
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>

              {/* Link to full docs */}
              <a
                href="/docs"
                className="mt-6 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: `${moduleAccent}15`,
                  color: moduleAccent,
                  border: `1px solid ${moduleAccent}30`,
                }}
              >
                Ver documentação completa →
              </a>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
