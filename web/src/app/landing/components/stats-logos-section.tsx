"use client"
import { AnimatedCounter } from "./animated-counter"
import { clientLogos } from "./landing-data"

export function StatsAndLogosSection() {
  return (
    <>
      <div className="h-px w-full max-w-6xl mx-auto bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
      <section className="bg-slate-900/20 backdrop-blur-md px-6 py-12 relative z-20 border-b border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x divide-white/5">
          <div className="text-center px-4">
            <h3 className="text-4xl font-semibold text-white mb-1"><AnimatedCounter end={8} /></h3>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Fontes Oficiais</p>
          </div>
          <div className="text-center px-4">
            <h3 className="text-4xl font-semibold text-white mb-1"><AnimatedCounter end={10} prefix="+" suffix="k" /></h3>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Normativos Analisados</p>
          </div>
          <div className="text-center px-4">
            <h3 className="text-4xl font-semibold text-white mb-1"><AnimatedCounter end={80} suffix="%" /></h3>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Redução de Tempo</p>
          </div>
          <div className="text-center px-4">
            <h3 className="text-4xl font-semibold text-white mb-1"><AnimatedCounter end={7} /></h3>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Agentes de IA</p>
          </div>
        </div>
      </section>

      <section className="py-10 px-6 border-y border-white/5 bg-slate-900/30">
         <div className="max-w-5xl mx-auto text-center mb-6">
           <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">O motor de conformidade escolhido por</p>
         </div>
         <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
            {clientLogos.map((logo, idx) => (
              <div key={idx} className="flex items-center gap-3 text-slate-300 transition-all hover:text-white hover:scale-105">
                <logo.icon className="w-8 h-8 md:w-9 md:h-9 text-slate-400" />
                <span className="text-lg md:text-xl font-bold tracking-tight">{logo.name}</span>
              </div>
            ))}
         </div>
      </section>
    </>
  )
}
