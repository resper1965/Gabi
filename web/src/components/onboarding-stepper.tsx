"use client"

import { PenTool, Sparkles, FileText, BookOpen, ArrowRight } from "lucide-react"

interface OnboardingStepperProps {
  moduleAccent?: string
  onStart: () => void
}

const steps = [
  {
    icon: PenTool,
    title: "Crie um Perfil",
    desc: "Defina quem será clonado — um autor, marca ou tom de voz",
  },
  {
    icon: FileText,
    title: "Alimente com Estilo",
    desc: "Suba textos do autor: artigos, e-mails, posts, livros",
  },
  {
    icon: BookOpen,
    title: "Alimente com Conteúdo",
    desc: "Suba a base factual: dados, relatórios, pesquisas",
  },
  {
    icon: Sparkles,
    title: "Peça para Escrever",
    desc: "A gabi. escreve COM o estilo SOBRE o conteúdo",
  },
]

export function OnboardingStepper({ moduleAccent = "var(--color-mod-ghost)", onStart }: OnboardingStepperProps) {
  return (
    <div className="flex items-center justify-center h-full animate-fade-in-up">
      <div className="max-w-md w-full px-6">
        {/* Title */}
        <div className="text-center mb-8">
          <p className="text-slate-500 text-sm mb-2">Como funciona</p>
          <h2 className="text-xl font-semibold">
            gabi<span style={{ color: moduleAccent }}>.</span>writer
          </h2>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4 group">
              {/* Step number + connector */}
              <div className="flex flex-col items-center">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{
                    background: `color-mix(in srgb, ${moduleAccent} 15%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${moduleAccent} 25%, transparent)`,
                  }}
                >
                  <step.icon className="w-4 h-4" style={{ color: moduleAccent }} />
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="w-px h-6 mt-1"
                    style={{ background: `color-mix(in srgb, ${moduleAccent} 15%, transparent)` }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pt-1.5">
                <p className="text-sm font-medium text-white">{step.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium
                     text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${moduleAccent}, color-mix(in srgb, ${moduleAccent} 70%, black))`,
            boxShadow: `0 4px 20px color-mix(in srgb, ${moduleAccent} 30%, transparent)`,
          }}
        >
          Começar
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
