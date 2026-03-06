"use client"

import Link from "next/link"
import NextImage from "next/image"
import { useState, useEffect } from "react"
import {
  PenTool,
  Scale,
  BarChart3,
  Radar,
  Lock,
  Building2,
  Briefcase,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Database,
  Globe2,
  ShieldCheck
} from "lucide-react"

/* ═══════════════════════════════════════════
   Data
   ═══════════════════════════════════════════ */

const painPoints = [
  {
    before: "Horas perdidas buscando normas fragmentadas",
    after: "Monitoramento em tempo real de 8 fontes essenciais",
    audience: "Compliance Officers & Jurídico",
    impact: "+80% Produtividade",
    icon: Radar,
    accent: "#10b981", // Emerald
    module: "radar regulatório",
  },
  {
    before: "Leitura manual de dezenas de diários oficiais",
    after: "IA extrai obrigações, prazos e impacto regulatório",
    audience: "Bancos & Fintechs",
    impact: "Análise em Segundos",
    icon: Scale,
    accent: "#f59e0b", // Amber
    module: "gabi.legal",
  },
  {
    before: "Redação morosa de pareceres padronizados",
    after: "Pareceres gerados com o seu estilo de escrita",
    audience: "Escritórios de Advocacia",
    impact: "Zero Copy/Paste",
    icon: PenTool,
    accent: "#06b6d4", // Cyan
    module: "gabi.writer",
  },
  {
    before: "Dificuldade em cruzar dados de conformidade",
    after: "Insights gráficos imediatos através de linguagem natural",
    audience: "Gestores de Risco & CFOs",
    impact: "Decisões Data-Driven",
    icon: BarChart3,
    accent: "#8b5cf6", // Violet
    module: "gabi.data",
  },
]

const regulatoryAgencies = [
  { name: "BCB", full: "Banco Central do Brasil", desc: "Resoluções e circulares", color: "#f59e0b", featured: true },
  { name: "CMN", full: "Conselho Monetário Nacional", desc: "Mercado monetário e crédito", color: "#f59e0b", featured: false },
  { name: "CVM", full: "Comissão de Valores Mobiliários", desc: "Mercado de capitais e fundos", color: "#00ade8", featured: true },
  { name: "LGPD", full: "Lei Geral de Proteção de Dados", desc: "Privacidade e conformidade", color: "#8b5cf6", featured: false },
  { name: "ANS", full: "Agência Nacional de Saúde", desc: "Planos de saúde", color: "#f43f5e", featured: false },
  { name: "SUSEP", full: "Superintendência de Seguros", desc: "Seguros e previdência", color: "#f43f5e", featured: false },
  { name: "ANPD", full: "Autoridade Nac. Proteção de Dados", desc: "Guias de conformidade", color: "#8b5cf6", featured: false },
  { name: "ANEEL", full: "Agência Nac. Energia Elétrica", desc: "Setor elétrico", color: "#06b6d4", featured: false },
]

const markets = [
  { label: "Escritórios de Advocacia", icon: Building2 },
  { label: "Consultorias e Auditorias", icon: Briefcase },
  { label: "Departamentos Financeiros", icon: TrendingUp },
  { label: "Fintechs e Gestoras", icon: Globe2 },
  { label: "Produtoras de Conteúdo", icon: FileText },
]

const trustBadges = [
  { icon: Database, label: "Hospedado no Brasil 🇧🇷" },
  { icon: ShieldCheck, label: "Roadmap ISO 27001" },
  { icon: Lock, label: "Adequação LGPD" },
]

/* ═══════════════════════════════════════════
   Components
   ═══════════════════════════════════════════ */

// Animated Counter Component
function AnimatedCounter({ end, suffix = "", prefix = "" }: { end: number, suffix?: string, prefix?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 2000 // 2 seconds
    const increment = end / (duration / 16) // roughly 60fps
    
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [end])

  return <span>{prefix}{count}{suffix}</span>
}


export default function LandingPage() {
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  return (
    <div className="min-h-screen bg-[#0F172A] selection:bg-[#0369A1] selection:text-white">
      {/* ── Hero Split View ── */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pt-24 pb-20 overflow-hidden flex flex-col-reverse md:grid md:grid-cols-2 gap-12 items-center">
        {/* Glow background restricted to text side */}
        <div
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(3,105,161,0.3) 0%, transparent 70%)",
          }}
        />

        {/* Left Column (Text & CTA) */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left relative z-10 w-full">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-md mb-8 shadow-inner">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span className="text-xs font-bold text-slate-200 tracking-widest uppercase">Gabi by Ness</span>
          </div>

          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-tight"
            style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
          >
            A inteligência <span className="text-transparent bg-clip-text bg-linear-to-r from-[#00ade8] to-[#0369A1]">regulatória</span><br />
            para o seu jurídico.
          </h1>

          <p className="mt-6 text-lg tracking-wide md:text-xl text-slate-300 max-w-xl leading-relaxed font-light">
            A Gabi transforma a gestão normativa para <strong>escritórios de advocacia</strong> e <strong>departamentos jurídicos e de compliance</strong>. Monitoramento ativo, análise avançada de leis por IA e pareceres automáticos para a sua operação.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="mailto:contato@ness.com.br?subject=Demo%20Gabi"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white
                         transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0369A1]/30"
              style={{ backgroundColor: "#0369A1" }}
            >
              Agendar Demonstração
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white
                         transition-all duration-300 bg-white/5 hover:bg-white/10 border border-white/10"
            >
              Acessar Plataforma
            </Link>
          </div>

          <div className="mt-16 flex items-center justify-center md:justify-start gap-4 text-sm text-slate-500 opacity-90">
            <span className="font-semibold tracking-wider text-xs">DESENVOLVIDO POR</span>
            <div className="flex gap-4 items-center transition-all duration-500">
              <span className="font-black text-white text-xl tracking-tighter mix-blend-screen drop-shadow-md">ness<span className="text-[#00ade8]">.</span></span>
            </div>
          </div>
        </div>

        {/* Right Column (Avatar & Icon Composition) */}
        <div className="relative w-full max-w-lg mx-auto aspect-square md:aspect-[4/5] flex items-center justify-center">
           {/* Glow Effects */}
           <div className="absolute inset-0 bg-linear-to-tr from-[#0369A1]/60 to-[#00ade8]/30 rounded-[2.5rem] opacity-30 blur-3xl mix-blend-screen animate-pulse"></div>
           
           {/* Floating App Icon */}
           <div className="absolute -top-6 -right-6 z-30 p-4 bg-slate-900 border border-slate-700/50 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-float">
             <NextImage src="/logo.png" alt="App Icon" width={72} height={72} unoptimized className="rounded-xl object-contain drop-shadow-sm" />
           </div>

           {/* Hero Photo - Gabi Avatar */}
           <div className="absolute inset-4 rounded-[2.5rem] border border-white/10 bg-slate-800/20 backdrop-blur-xl z-10 overflow-hidden shadow-2xl">
             <NextImage 
               src="/gabi-avatar.png"
               alt="A Gabi — Assistente Virtual IA Corporativa"
               fill
               unoptimized
               className="object-cover object-top hover:scale-105 transition-transform duration-[2s] ease-in-out"
               sizes="(max-width: 768px) 100vw, 50vw"
               priority
             />
           </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-white/5 bg-slate-900/50 backdrop-blur-sm px-6 py-10 relative z-20">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x divide-white/5">
          <div className="text-center px-4">
            <h3 className="text-4xl font-bold text-white mb-1"><AnimatedCounter end={8} /></h3>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Fontes Oficiais</p>
          </div>
          <div className="text-center px-4">
            <h3 className="text-4xl font-bold text-white mb-1"><AnimatedCounter end={10} prefix="+" suffix="k" /></h3>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Normativos Analisados</p>
          </div>
          <div className="text-center px-4">
            <h3 className="text-4xl font-bold text-white mb-1"><AnimatedCounter end={80} suffix="%" /></h3>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Redução de Tempo</p>
          </div>
          <div className="text-center px-4">
            <h3 className="text-4xl font-bold text-white mb-1">24<span className="text-2xl text-slate-500">/7</span></h3>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Monitoramento Ativo</p>
          </div>
        </div>
      </section>

      {/* ── Trust Badges ── */}
      <section className="py-12 px-6">
         <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {trustBadges.map((badge, idx) => (
              <div key={idx} className="flex items-center gap-2 text-slate-300">
                <badge.icon className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-semibold uppercase tracking-wider">{badge.label}</span>
              </div>
            ))}
         </div>
      </section>

      {/* ── Pain Points (Before / After) ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Do caótico ao estratégico
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Abandone os processos manuais. A inteligência artificial da Gabi transforma dados regulatórios em ações claras.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {painPoints.map((p, i) => (
            <div
              key={i}
              className="group relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 bg-slate-900 border border-slate-800 hover:border-slate-700"
            >
              {/* Header */}
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

              {/* Before/After */}
              <div className="space-y-4 relative">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-slate-400 text-sm italic pr-4">&quot;{p.before}&quot;</p>
                </div>
                
                {/* Visual connector line */}
                <div className="absolute left-2.5 top-6 w-px h-6 bg-slate-800"></div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-white font-medium text-base">{p.after}</p>
                </div>
              </div>

              {/* Audience footer */}
              <div className="mt-8 pt-4 border-t border-slate-800">
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  Ideal para: <span className="text-slate-300">{p.audience}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Regulatory Monitoring ── */}
      <section className="max-w-6xl mx-auto px-6 py-20 bg-slate-900/40 rounded-3xl border border-white/5 mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            O Ecossistema Normativo Integrado
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto">
            Ingestão direta dos diários oficiais e APIs governamentais. Nossa infraestrutura centralizada alimenta todos os módulos da plataforma simultaneamente.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {regulatoryAgencies.map((a) => (
            <div
              key={a.name}
              className={`rounded-xl p-5 border transition-all duration-200 hover:border-slate-600 ${
                a.featured ? "md:col-span-2 bg-slate-800/80 border-slate-700" : "bg-slate-900/50 border-white/5"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className={`font-bold ${a.featured ? "text-2xl" : "text-lg"}`} style={{ color: a.color }}>
                  {a.name}
                </p>
                {a.featured && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border" style={{ borderColor: `${a.color}40`, color: a.color }}>
                    Essencial
                  </span>
                )}
              </div>
              <p className="text-white font-medium text-sm mb-1">{a.full}</p>
              <p className="text-slate-400 text-xs leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Target Markets ── */}
      <section className="max-w-5xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-10" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          Construído para Operações Críticas
        </h2>

        <div className="flex flex-wrap justify-center gap-4">
          {markets.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-4 rounded-xl bg-slate-800 border border-slate-700 transition-colors hover:bg-slate-700/80"
            >
              <m.icon className="w-5 h-5 text-[#00ade8]" />
              <span className="text-sm font-semibold text-slate-200">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Final (Full Width) ── */}
      <section className="relative px-6 py-24 text-center overflow-hidden border-t border-white/10" style={{ backgroundColor: "#020617" }}>
         {/* Background accent */}
         <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle at center, #0369A1 0%, transparent 70%)" }} />
         
         <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Pronto para elevar seu compliance?
            </h2>
            <p className="text-slate-400 text-lg mb-10">
              Junte-se à nova era de gestão regulatória. Segurança nível enterprise com a melhor inteligência artificial do mercado.
            </p>
            
            <Link
              href="mailto:contato@ness.com.br?subject=Demo%20Gabi"
              className="inline-flex items-center gap-2 px-10 py-5 rounded-xl text-base font-bold text-white
                         transition-all duration-300 hover:scale-[1.03] shadow-2xl hover:shadow-cyan-500/30"
              style={{ backgroundColor: "#0369A1" }}
            >
              Falar com Especialistas
              <ArrowRight className="w-5 h-5" />
            </Link>
         </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 bg-[#0F172A] px-6 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Legal Accordions */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
              <button
                onClick={() => setShowPrivacy(!showPrivacy)}
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Política de Privacidade
                {showPrivacy ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
              {showPrivacy && (
                <div className="px-6 pb-6 text-xs text-slate-400 leading-relaxed space-y-4">
                  <p><strong className="text-slate-200">1. Introdução.</strong> Bem-vindo à Plataforma Gabi, operada pela ness. Respeitamos a sua privacidade e estamos comprometidos em proteger seus dados.</p>
                  <p><strong className="text-slate-200">2. Uso dos Dados.</strong> Seus dados são usados exclusivamente para fornecer resultados. A ness. não vende dados sob hipótese alguma.</p>
                  <p><strong className="text-slate-200">3. IA e Segurança.</strong> É estritamente vedado usar seus dados para treinar modelos fundacionais públicos.</p>
                  <p className="pt-2">
                    <Link href="/privacy" className="text-[#00ade8] hover:underline">Ver documento completo →</Link>
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
              <button
                onClick={() => setShowTerms(!showTerms)}
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Termos de Serviço
                {showTerms ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
              {showTerms && (
                <div className="px-6 pb-6 text-xs text-slate-400 leading-relaxed space-y-4">
                  <p><strong className="text-slate-200">1. Natureza Consultiva.</strong> Quaisquer insights gerados não constituem aconselhamentos finalísticos. Toda inferência deve ser validada por humano.</p>
                  <p><strong className="text-slate-200">2. Responsabilidades.</strong> O Usuário compromete-se a não enviar dados sensíveis ou informações de litígio penal severo.</p>
                  <p><strong className="text-slate-200">3. Disponibilidade.</strong> Garantimos 99% de uptime, podendo o acesso ser temporariamente suspenso para segurança.</p>
                  <p className="pt-2">
                    <Link href="/terms" className="text-[#00ade8] hover:underline">Ver documento completo →</Link>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-8 text-xs text-slate-500">
            <div className="flex items-center gap-6 font-medium uppercase tracking-wider">
              <Link href="/trust" className="text-emerald-400 hover:text-emerald-300 transition-colors">Trust Center</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Termos</Link>
              <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            </div>
            
            <div className="flex items-center gap-2">
              <p>&copy; {new Date().getFullYear()} ness. Todos os direitos reservados.</p>
              <span className="hidden sm:inline">&bull;</span>
              <p>powered by <span className="font-bold text-slate-300">ness<span className="text-[#00ade8]">.</span></span></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
