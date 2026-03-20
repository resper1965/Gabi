"use client"

import { Sparkles } from "lucide-react"

interface EmptyStateProps {
  moduleAccent: string
  suggestedPrompts?: string[]
  onSelectPrompt: (prompt: string) => void
}

const ACTION_CARDS = [
  { icon: "⚖️", title: "Compliance", desc: "Contratos, normativos & auditoria regulatória" },
  { icon: "✍️", title: "Redação", desc: "Pareceres, relatórios & textos com estilo" },
  { icon: "📊", title: "Análise Regulatória", desc: "Radar de normas, impacto & mudanças" },
]

export function EmptyState({ moduleAccent, suggestedPrompts, onSelectPrompt }: EmptyStateProps) {
  return (
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
          {ACTION_CARDS.map((card, i) => (
            <button
              key={i}
              onClick={() => onSelectPrompt(suggestedPrompts[i] || suggestedPrompts[0])}
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
              onClick={() => onSelectPrompt(p)}
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
  )
}
