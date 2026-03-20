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
    <div className="flex flex-col items-center justify-center h-full gap-8 pb-16 px-4 relative z-10 w-full animate-in fade-in duration-700">
      {/* Background Aurora Blob */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] mix-blend-screen pointer-events-none opacity-20 motion-reduce:hidden"
        style={{ background: `radial-gradient(circle, ${moduleAccent} 0%, transparent 70%)` }}
      />
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 blur-xl opacity-50 motion-safe:animate-pulse" style={{ background: moduleAccent }}></div>
          <div
            className="relative w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border border-white/10 shadow-xl backdrop-blur-md"
            style={{ background: `color-mix(in srgb, ${moduleAccent} 20%, rgba(2,6,23,0.8))` }}
          >
            <Sparkles className="w-7 h-7" style={{ color: moduleAccent }} />
          </div>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight shadow-sm" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          Como posso te ajudar{" "}
          <span
            className="bg-clip-text text-transparent drop-shadow-sm"
            style={{
              backgroundImage: `linear-gradient(135deg, ${moduleAccent}, #fff)`,
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
              className="group relative p-5 rounded-2xl text-left transition-all duration-300
                         bg-slate-900/50 backdrop-blur-sm border border-slate-800
                         hover:border-slate-600 hover:-translate-y-1 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ boxShadow: "0 4px 20px -10px rgba(0,0,0,0.5)" }}
            >
              {/* Internal Hover Glow */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at top right, color-mix(in srgb, ${moduleAccent} 10%, transparent), transparent 70%)` }}
              ></div>
              <span className="text-2xl block mb-3 relative z-10 transition-transform group-hover:scale-110">{card.icon}</span>
              <span className="text-sm font-semibold text-white block mb-1.5 relative z-10">{card.title}</span>
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors relative z-10">
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
              className="px-4 py-2 rounded-full text-xs font-medium text-slate-400 hover:text-white
                         bg-slate-900/40 backdrop-blur-sm border border-slate-800
                         hover:border-slate-600 hover:bg-slate-800/60 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 shadow-sm"
              style={{
                boxShadow: "0 2px 10px -5px rgba(0,0,0,0.3)"
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
