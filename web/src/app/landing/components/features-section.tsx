"use client"
import Link from "next/link"
import { ArrowRight, Star, Quote, Gavel, TrendingUp, ShieldCheck } from "lucide-react"
import { painPoints, regulatoryAgencies, testimonials } from "./landing-data"

export function FeaturesSection() {
  return (
    <>
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Muito além do chat
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Abandone os processos manuais. A inteligência artificial da <span className="brand-mark text-slate-300">Gabi<span className="text-[#00ade8]">.</span></span> transforma dados regulatórios em ações claras.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {painPoints.map((p, i) => (
            <div
              key={i}
              className="group relative rounded-2xl p-8 transition-all duration-500 bg-slate-900/60 backdrop-blur-sm border border-slate-800 hover:border-slate-600 hover:shadow-[0_0_40px_rgba(6,182,212,0.1)] hover:-translate-y-1 cursor-default overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800" style={{ color: p.accent }}>
                    <p.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {p.module}
                  </span>
                </div>
                <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ color: p.accent, backgroundColor: `${p.accent}15` }}>
                  {p.impact}
                </span>
              </div>

              <div className="space-y-4 relative pt-2">
                <div className="pl-4 border-l-2 border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">O Problema</span>
                  <p className="text-slate-400 text-sm leading-relaxed">&quot;{p.before}&quot;</p>
                </div>
                <div className="pl-4 border-l-2 transition-colors duration-300" style={{ borderColor: `${p.accent}50` }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: p.accent }}>Com a Gabi</span>
                  <p className="text-white font-medium text-base leading-relaxed tracking-tight">{p.after}</p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-800">
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  Ideal para: <span className="text-slate-300">{p.audience}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-24 relative mb-12">
        <div className="absolute inset-0 bg-slate-900/40 rounded-3xl border border-white/5 backdrop-blur-xs"></div>
        <div className="relative z-10 text-center mb-16 pt-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            A Base de Conhecimento Regulatória
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto">
            A Gabi não sofre de &quot;achismo&quot;. Todas as respostas são fundamentadas e rastreáveis na base vetorial mantida com dados oficiais dos reguladores.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {regulatoryAgencies.map((a) => (
            <div
              key={a.name}
              className={`rounded-xl p-6 border transition-colors duration-300 hover:border-slate-600 cursor-default group ${
                a.featured ? "md:col-span-2 bg-slate-800/30 border-slate-700/50 backdrop-blur-sm" : "bg-slate-900/30 border-white/5 hover:bg-slate-800/40 backdrop-blur-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full group-hover:shadow-md transition-shadow duration-300" style={{ backgroundColor: a.color, boxShadow: `0 0 8px ${a.color}40` }}></span>
                  <p className={`font-medium tracking-wide text-white ${a.featured ? "text-xl" : "text-base"}`}>
                    {a.name}
                  </p>
                </div>
                {a.featured && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    Core
                  </span>
                )}
              </div>
              <p className="text-slate-200 font-medium text-sm mb-1.5 tracking-tight">{a.full}</p>
              <p className="text-slate-500 text-xs leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Uma assistente para cada realidade
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            A <span className="brand-mark text-slate-300">Gabi<span className="text-[#00ade8]">.</span></span> entende as exigências específicas do seu setor e responde como especialista — seja na defesa de clientes ou na mitigação de riscos internos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-800 relative overflow-hidden group hover:border-slate-600 hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] hover:-translate-y-1 transition-all duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -mr-20 -mt-20 transition-all duration-700 group-hover:bg-cyan-500/20 group-hover:scale-110"></div>
            <Gavel className="w-10 h-10 text-cyan-500 mb-6 relative z-10" />
            <h3 className="text-xl font-bold text-white mb-4 relative z-10 tracking-tight">Escritórios Privados</h3>
            <ul className="space-y-4 mb-8 relative z-10">
              <li className="flex flex-col gap-1"><span className="text-xs font-bold text-cyan-500 tracking-wider">COMANDO</span><span className="text-slate-300 font-light text-sm">&quot;Analise este contrato contra as regras da CVM.&quot;</span><span className="text-white font-medium text-sm mt-1 border-l-2 border-slate-700 pl-3">→ Mapeamento completo de riscos em segundos.</span></li>
              <li className="flex flex-col gap-1 mt-4"><span className="text-xs font-bold text-cyan-500 tracking-wider">COMANDO</span><span className="text-slate-300 font-light text-sm">&quot;Redija um parecer sobre a nova resolução.&quot;</span><span className="text-white font-medium text-sm mt-1 border-l-2 border-slate-700 pl-3">→ Parecer gerado usando o seu Perfil de Redação personalizado.</span></li>
              <li className="flex flex-col gap-1 mt-4"><span className="text-xs font-bold text-cyan-500 tracking-wider">COMANDO</span><span className="text-slate-300 font-light text-sm">&quot;Busque precedentes sobre fundos imobiliários.&quot;</span><span className="text-white font-medium text-sm mt-1 border-l-2 border-slate-700 pl-3">→ Teses a favor e contra com citações diretas.</span></li>
            </ul>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-800 relative overflow-hidden group hover:border-slate-600 hover:shadow-[0_0_40px_rgba(245,158,11,0.1)] hover:-translate-y-1 transition-all duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] -mr-20 -mt-20 transition-all duration-700 group-hover:bg-amber-500/20 group-hover:scale-110"></div>
            <TrendingUp className="w-10 h-10 text-amber-500 mb-6 relative z-10" />
            <h3 className="text-xl font-bold text-white mb-4 relative z-10 tracking-tight">Fundos & Asset Management</h3>
            <ul className="space-y-4 mb-8 relative z-10">
              <li className="flex flex-col gap-1"><span className="text-xs font-bold text-amber-500 tracking-wider">COMANDO</span><span className="text-slate-300 font-light text-sm">&quot;Esta instrução impacta nosso FIP?&quot;</span><span className="text-white font-medium text-sm mt-1 border-l-2 border-slate-700 pl-3">→ Alerta automático de impacto no portfólio.</span></li>
              <li className="flex flex-col gap-1 mt-4"><span className="text-xs font-bold text-amber-500 tracking-wider">COMANDO</span><span className="text-slate-300 font-light text-sm">&quot;Crie uma apresentação para os cotistas.&quot;</span><span className="text-white font-medium text-sm mt-1 border-l-2 border-slate-700 pl-3">→ Relatório executivo exportado direto em .pptx.</span></li>
              <li className="flex flex-col gap-1 mt-4"><span className="text-xs font-bold text-amber-500 tracking-wider">COMANDO</span><span className="text-slate-300 font-light text-sm">&quot;Verifique nossas diretrizes de compliance.&quot;</span><span className="text-white font-medium text-sm mt-1 border-l-2 border-slate-700 pl-3">→ Cruzamento ágil com novas normas do BACEN/CMN.</span></li>
            </ul>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-800 relative overflow-hidden group hover:border-slate-600 hover:shadow-[0_0_40px_rgba(16,185,129,0.1)] hover:-translate-y-1 transition-all duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-20 -mt-20 transition-all duration-700 group-hover:bg-emerald-500/20 group-hover:scale-110"></div>
            <ShieldCheck className="w-10 h-10 text-emerald-500 mb-6 relative z-10" />
            <h3 className="text-xl font-bold text-white mb-4 relative z-10 tracking-tight">Compliance Interno</h3>
            <ul className="space-y-4 mb-8 relative z-10">
              <li className="flex flex-col gap-1"><span className="text-xs font-bold text-emerald-500 tracking-wider">COMANDO</span><span className="text-slate-300 font-light text-sm">&quot;Audite esta nova política interna.&quot;</span><span className="text-white font-medium text-sm mt-1 border-l-2 border-slate-700 pl-3">→ Identificação de gaps e desalinhamentos legais.</span></li>
              <li className="flex flex-col gap-1 mt-4"><span className="text-xs font-bold text-emerald-500 tracking-wider">COMANDO</span><span className="text-slate-300 font-light text-sm">&quot;O que mudou na LGPD este mês?&quot;</span><span className="text-white font-medium text-sm mt-1 border-l-2 border-slate-700 pl-3">→ Resumo executivo das alterações mais críticas.</span></li>
              <li className="flex flex-col gap-1 mt-4"><span className="text-xs font-bold text-emerald-500 tracking-wider">COMANDO</span><span className="text-slate-300 font-light text-sm">&quot;Alerte-me sobre resoluções da SUSEP.&quot;</span><span className="text-white font-medium text-sm mt-1 border-l-2 border-slate-700 pl-3">→ O agente Watcher monitora ativamente para você.</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-slate-900/30 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Performance corporativa comprovada
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Veja o que os líderes de mercado reportam desde a implantação da inteligência artificial da plataforma.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-surface-base p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors relative">
                <Quote className="absolute top-8 right-8 w-10 h-10 text-slate-800/50" />
                <div className="flex gap-1 mb-6">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-base text-slate-300 mb-8 font-light leading-relaxed italic relative z-10">&quot;{t.quote}&quot;</p>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center font-bold text-base text-slate-300 border border-slate-700 shrink-0">
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{t.author}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 py-32 text-center overflow-hidden border-t border-slate-800 bg-[#020617]">
         <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle at center, rgba(3,105,161,0.4) 0%, transparent 60%)" }} />
         <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
         
         <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-semibold text-white mb-6" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Pronto para ter sua assistente regulatória?
            </h2>
            <p className="text-slate-400 text-lg mb-10">
              Uma conversa com a Gabi substitui horas de trabalho manual. Segurança enterprise. IA de ponta.
            </p>
            
            <Link
              href="mailto:contato@ness.com.br?subject=Demo%20Gabi"
              className="inline-flex items-center gap-2 px-10 py-5 rounded-xl text-base font-bold text-white
                         transition-all duration-300 hover:scale-[1.03] shadow-2xl hover:shadow-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              style={{ backgroundColor: "#0369A1" }}
            >
              Falar com Especialistas
              <ArrowRight className="w-5 h-5" />
            </Link>
         </div>
      </section>
    </>
  )
}
