"use client"
import Link from "next/link"
import NextImage from "next/image"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative w-full max-w-7xl mx-auto px-6 pt-32 pb-24 overflow-hidden flex flex-col-reverse md:grid md:grid-cols-2 gap-12 items-center">
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-700/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none animate-pulse"></div>
      <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none animate-pulse" style={{ animationDelay: "2s" }}></div>

      <div className="flex flex-col items-center md:items-start text-center md:text-left relative z-10 w-full">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-md mb-8 shadow-inner">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 motion-safe:animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
          <span className="text-xs font-medium text-slate-200 tracking-wide">
            <span className="brand-mark">Gabi<span className="text-[#00ade8]">.</span></span> by <span className="brand-mark">ness<span className="text-[#00ade8]">.</span></span>
          </span>
        </div>

        <h1
          className="text-5xl md:text-6xl lg:text-7xl font-semibold text-white tracking-tight leading-tight"
          style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
        >
          Diga o que precisa.<br />
          A Gabi <span className="text-transparent bg-clip-text bg-linear-to-r from-[#00ade8] to-[#0369A1]">resolve.</span>
        </h1>

        <p className="mt-6 text-lg tracking-wide md:text-xl text-slate-300 max-w-xl leading-relaxed font-light">
          Uma única conversa aciona a inteligência de <strong className="text-white">7 agentes de IA</strong> especializados. Monitoramento 24/7, auditoria de contratos, pesquisa regulatória e redação com Ghost Writer integrado — para escritórios, gestoras e compliance.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="mailto:contato@ness.com.br?subject=Demo%20Gabi"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white
                       transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0369A1]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ade8] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            style={{ backgroundColor: "#0369A1" }}
          >
            Agendar Demonstração
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white
                       transition-all duration-300 bg-white/5 hover:bg-white/10 border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Acessar Plataforma
          </Link>
        </div>

        <div className="mt-16 flex items-center justify-center md:justify-start gap-2 text-white">
          <span className="font-medium text-sm tracking-wide" style={{ fontFamily: "Montserrat, sans-serif" }}>powered by</span>
          <span className="brand-mark text-xl drop-shadow-md">ness<span className="text-[#00ade8]">.</span></span>
        </div>
      </div>

      <div className="relative w-full max-w-lg mx-auto aspect-square md:aspect-4/5 flex items-center justify-center">
         <div className="absolute inset-2 bg-linear-to-tr from-cyan-500 via-blue-600 to-emerald-500 rounded-[2.5rem] opacity-30 blur-2xl animate-[spin_10s_linear_infinite] motion-reduce:animate-none"></div>
         <div className="absolute inset-0 bg-linear-to-bl from-[#0369A1] to-emerald-400 rounded-[2.5rem] opacity-20 blur-3xl mix-blend-screen motion-safe:animate-pulse"></div>
         
         <div className="absolute -top-6 -right-6 z-30 p-4 bg-slate-900 border border-slate-700/50 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl motion-safe:animate-float">
           <NextImage src="/logo.png" alt="App Icon" width={72} height={72} unoptimized className="rounded-xl object-contain drop-shadow-sm" />
         </div>

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
  )
}
