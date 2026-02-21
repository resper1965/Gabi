"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import {
  BookOpen,
  PenTool,
  Scale,
  Database,
  ShieldCheck,
  Keyboard,
  HelpCircle,
} from "lucide-react"
import { docsContent } from "@/lib/docs-content"

const sections = [
  { id: "overview", label: "Visão Geral", icon: BookOpen },
  { id: "ghost", label: "gabi.writer", icon: PenTool },
  { id: "law", label: "gabi.legal", icon: Scale },
  { id: "ntalk", label: "gabi.data", icon: Database },
  { id: "insightcare", label: "gabi.care", icon: ShieldCheck },
  { id: "shortcuts", label: "Atalhos", icon: Keyboard },
  { id: "faq", label: "FAQ", icon: HelpCircle },
] as const

type SectionId = (typeof sections)[number]["id"]

function getSectionContent(id: SectionId): string {
  if (id === "overview") return docsContent.overview
  if (id === "shortcuts") return docsContent.shortcuts
  if (id === "faq") return docsContent.faq
  return docsContent.modules[id as keyof typeof docsContent.modules] || ""
}

export default function DocsPage() {
  const [active, setActive] = useState<SectionId>("overview")

  return (
    <div className="h-full flex">
      {/* Left sidebar nav */}
      <aside
        className="w-56 h-full flex flex-col shrink-0"
        style={{
          background: "var(--color-surface-card)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span className="text-base font-semibold text-white">Documentação</span>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {sections.map((section) => {
            const isActive = active === section.id
            return (
              <button
                key={section.id}
                onClick={() => setActive(section.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-white/5 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <section.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : ""}`} />
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          <div className="prose-docs">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-white mb-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-white mt-8 mb-3">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-slate-200 mt-6 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm text-slate-400 mb-3 leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-white">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-slate-300">{children}</em>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-3 pl-1 space-y-1 text-sm text-slate-400">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-3 pl-1 space-y-1 text-sm text-slate-400">{children}</ol>
                ),
                code: ({ className, children, ...props }) => {
                  const isBlock = className?.includes("language-")
                  if (isBlock) {
                    return (
                      <pre className="bg-black/30 rounded-lg p-3 overflow-x-auto my-3 text-xs">
                        <code className={className} style={{ fontFamily: "var(--font-data)" }} {...props}>
                          {children}
                        </code>
                      </pre>
                    )
                  }
                  return (
                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-[0.85em] text-emerald-300" style={{ fontFamily: "var(--font-data)" }}>
                      {children}
                    </code>
                  )
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3 rounded-lg border border-white/10">
                    <table className="w-full text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
                th: ({ children }) => <th className="px-3 py-2 text-left font-medium text-slate-300 border-b border-white/10">{children}</th>,
                td: ({ children }) => <td className="px-3 py-2 text-slate-400 border-b border-white/5">{children}</td>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-emerald-500/50 pl-4 my-3 text-sm text-slate-400 italic">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="border-white/5 my-6" />,
              }}
            >
              {getSectionContent(active)}
            </ReactMarkdown>
          </div>
        </div>
      </main>
    </div>
  )
}
