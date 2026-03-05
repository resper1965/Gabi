"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import {
  PenTool,
  Scale,
  BarChart3,
  Radar,
  Lock,
  Trash2,
  ShieldOff,
  Building2,
  Heart,
  Briefcase,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Eye,
} from "lucide-react"

/* ═══════════════════════════════════════════
   Data
   ═══════════════════════════════════════════ */

const painPoints = [
  {
    quote: "Preciso de pareceres e relatórios impecáveis, mas ninguém escreve como eu.",
    audience: "Compliance Officers, Advogados, Acadêmicos",
    solution:
      "A gabi.writer aprende seu estilo e gera pareceres, minutas e relatórios regulatórios como se fosse você.",
    icon: PenTool,
    accent: "#10b981",
    module: "gabi.writer",
  },
  {
    quote: "Preciso acompanhar dezenas de normativos do BCB, CMN e CVM todo mês.",
    audience: "Bancos, Fintechs, Gestoras de Investimento",
    solution:
      "A gabi.legal ingere normativos do Diário Oficial, analisa riscos com IA e te entrega obrigações, prazos e impacto regulatório.",
    icon: Scale,
    accent: "#f59e0b",
    module: "gabi.legal",
  },
  {
    quote: "Perco horas montando relatórios financeiros para a diretoria.",
    audience: "CFOs, Controllers, Gestores Financeiros",
    solution:
      "A gabi.data responde em português, gera gráficos e cruza indicadores de conformidade regulatória em segundos.",
    icon: BarChart3,
    accent: "#06b6d4",
    module: "gabi.data",
  },
  {
    quote: "Preciso acompanhar ANS, SUSEP, BCB, CVM e mais — tudo de um só lugar.",
    audience: "Corretoras de Seguros, Compliance Officers, Gestores de Risco",
    solution:
      "O Radar Regulatório da Gabi unifica 8 agências reguladoras, analisa riscos com IA e entrega obrigações e prazos em um painel interativo.",
    icon: Radar,
    accent: "#f43f5e",
    module: "radar regulatório",
  },
  {
    quote: "Tenho medo de descobrir uma mudança regulatória tarde demais.",
    audience: "Compliance, Jurídico, Gestores de Risco",
    solution:
      "A plataforma monitora 8 fontes regulatórias — BCB, CMN, CVM, ANS, SUSEP, ANPD, ANEEL e LGPD — com alertas automáticos.",
    icon: Eye,
    accent: "#8b5cf6",
    module: "plataforma",
  },
  {
    quote: "Leio 50 páginas de uma resolução e no final não sei o que mudou para mim.",
    audience: "Todo profissional regulado",
    solution:
      "A IA da Gabi extrai resumo executivo, nível de risco, obrigações e prazos — em segundos, não em horas.",
    icon: FileText,
    accent: "#00ade8",
    module: "análise IA",
  },
]

const regulatoryAgencies = [
  { name: "BCB", full: "Banco Central do Brasil", desc: "Resoluções, circulares e normativos do sistema financeiro", color: "#f59e0b", featured: false },
  { name: "CMN", full: "Conselho Monetário Nacional", desc: "Resoluções que regulam o mercado monetário e de crédito", color: "#f59e0b", featured: false },
  { name: "CVM", full: "Comissão de Valores Mobiliários", desc: "Instruções e resoluções do mercado de capitais e fundos de investimento", color: "#00ade8", featured: true },
  { name: "LGPD", full: "Lei Geral de Proteção de Dados", desc: "Monitoramento de adequação e novas regulamentações de privacidade", color: "#8b5cf6", featured: false },
  { name: "ANS", full: "Agência Nacional de Saúde", desc: "Resoluções normativas de planos de saúde e operadoras", color: "#f43f5e", featured: false },
  { name: "SUSEP", full: "Superintendência de Seguros", desc: "Circulares e normas do mercado de seguros e previdência", color: "#f43f5e", featured: false },
  { name: "ANPD", full: "Autoridade Nac. Proteção de Dados", desc: "Resoluções e guias de conformidade com a LGPD", color: "#8b5cf6", featured: false },
  { name: "ANEEL", full: "Agência Nac. Energia Elétrica", desc: "Resoluções normativas e homologatórias do setor elétrico", color: "#06b6d4", featured: false },
]

const markets = [
  { label: "Escritórios de Advocacia", icon: Building2 },
  { label: "Operadoras de Saúde", icon: Heart },
  { label: "Consultorias e Auditorias", icon: Briefcase },
  { label: "Departamentos Financeiros", icon: TrendingUp },
  { label: "Produtoras de Conteúdo", icon: FileText },
]

const securityItems = [
  {
    icon: Lock,
    title: "Criptografia ponta-a-ponta",
    text: "Seus documentos são protegidos em trânsito e em repouso.",
  },
  {
    icon: ShieldOff,
    title: "Dados nunca usados para treinar modelos",
    text: "Sua informação é isolada. Ponto final.",
  },
  {
    icon: Trash2,
    title: "Exclusão total a qualquer momento",
    text: "Você pode apagar tudo com um clique.",
  },
]


/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */

export default function LandingPage() {
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-24">
        {/* Glow background */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(0,173,232,0.08) 0%, transparent 70%)",
          }}
        />

        <Image
          src="/logo.png"
          alt="Gabi"
          width={80}
          height={80}
          className="w-20 h-20 rounded-3xl object-cover shadow-2xl mb-6 relative z-10"
          unoptimized
        />

        <h1
          className="text-5xl md:text-6xl font-medium text-white tracking-tight leading-tight relative z-10"
          style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 500 }}
        >
          Gabi<span style={{ color: "#00ade8" }}>.</span>
        </h1>

        <p className="mt-4 text-lg md:text-xl text-slate-300 max-w-xl relative z-10 leading-relaxed">
          Sua equipe trabalha demais.
          <br />
          <span className="text-white font-medium">
            A Gabi trabalha com vocês.
          </span>
        </p>

        <p className="mt-3 text-sm text-slate-500 max-w-md relative z-10">
          Inteligência que entende o seu negócio, fala a sua língua e respeita o
          seu tempo.
        </p>

        <Link
          href="/login"
          className="mt-10 inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white
                     transition-all duration-300 hover:scale-105 active:scale-[0.98] shadow-lg relative z-10"
          style={{
            background: "linear-gradient(135deg, #00ade8, #0090c4)",
            boxShadow: "0 8px 32px rgba(0,173,232,0.3)",
          }}
        >
          Acessar a Plataforma
          <ArrowRight className="w-4 h-4" />
        </Link>

        <p className="mt-6 text-[11px] text-slate-600 relative z-10">
          powered by{" "}
          <span className="text-white" style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 500 }}>ness<span style={{ color: "#00ade8" }}>.</span></span>
        </p>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-4xl mx-auto h-px" style={{ background: "linear-gradient(to right, transparent, rgba(0,173,232,0.2), transparent)" }} />

      {/* ── Pain Points ── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-bold text-center mb-3">
          Dores reais
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold text-white text-center mb-16"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Você conhece essas dores?
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {painPoints.map((p, i) => (
            <div
              key={i}
              className="group relative rounded-2xl p-7 transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: "var(--color-surface-card)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Icon + Module tag */}
              <div className="flex items-center justify-between mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${p.accent}15`,
                    color: p.accent,
                  }}
                >
                  <p.icon className="w-5 h-5" />
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{
                    background: `${p.accent}12`,
                    color: p.accent,
                  }}
                >
                  {p.module}
                </span>
              </div>

              {/* Quote */}
              <p
                className="text-lg font-semibold text-white mb-2 leading-snug"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                &ldquo;{p.quote}&rdquo;
              </p>

              {/* Audience */}
              <p className="text-[11px] uppercase tracking-wider font-bold mb-3" style={{ color: p.accent }}>
                {p.audience}
              </p>

              {/* Solution */}
              <p className="text-sm text-slate-400 leading-relaxed">
                {p.solution}
              </p>

              {/* Bottom accent */}
              <div
                className="absolute bottom-0 left-7 right-7 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: p.accent }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-4xl mx-auto h-px bg-linear-to-r from-transparent via-emerald-500/20 to-transparent" />

      {/* ── Target Markets ── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-bold text-center mb-3">
          Mercados
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold text-white text-center mb-14"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Para quem a Gabi foi feita
        </h2>

        <div className="flex flex-wrap justify-center gap-6">
          {markets.map((m, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl transition-all duration-200 hover:scale-105"
              style={{
                background: "var(--color-surface-card)",
                border: "1px solid rgba(255,255,255,0.05)",
                minWidth: 160,
              }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,173,232,0.1)" }}>
                <m.icon className="w-5 h-5" style={{ color: "#00ade8" }} />
              </div>
              <span className="text-sm font-medium text-slate-300 text-center">
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-4xl mx-auto h-px" style={{ background: "linear-gradient(to right, transparent, rgba(0,173,232,0.2), transparent)" }} />

      {/* ── Regulatory Monitoring ── */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3">
          Monitoramento Regulatório
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold text-white mb-4"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          8 fontes regulatórias. Atualização diária. Análise IA.
        </h2>
        <p className="text-slate-500 text-sm max-w-2xl mx-auto mb-14 leading-relaxed">
          A Gabi ingere normativos diretamente do Diário Oficial da União e das APIs oficiais,
          analisa riscos com IA e distribui inteligência regulatória para todos os módulos da plataforma.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {regulatoryAgencies.map((a) => (
            <div
              key={a.name}
              className={`group rounded-xl p-5 transition-all duration-200 hover:scale-105 text-left ${
                a.featured ? "md:col-span-2 ring-1" : ""
              }`}
              style={{
                background: a.featured
                  ? `linear-gradient(135deg, ${a.color}08, ${a.color}15)`
                  : "var(--color-surface-card)",
                border: a.featured
                  ? `1px solid ${a.color}30`
                  : "1px solid rgba(255,255,255,0.05)",
                ...(a.featured ? { ringColor: `${a.color}20` } : {}),
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <p
                  className={`font-bold ${a.featured ? "text-2xl" : "text-lg"}`}
                  style={{ color: a.color }}
                >
                  {a.name}
                </p>
                {a.featured && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: `${a.color}20`, color: a.color }}
                  >
                    destaque
                  </span>
                )}
              </div>
              <p className={`text-slate-400 mb-1 ${a.featured ? "text-xs font-medium" : "text-[10px]"}`}>
                {a.full}
              </p>
              <p className={`text-slate-600 leading-tight ${a.featured ? "text-xs" : "text-[10px]"}`}>
                {a.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-4xl mx-auto h-px bg-linear-to-r from-transparent via-emerald-500/20 to-transparent" />

      {/* ── Security ── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3">
          Segurança
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold text-white mb-4"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Seus dados nunca saem do seu controle.
        </h2>
        <p className="text-slate-400 text-sm mb-14 max-w-lg mx-auto">
          A Gabi foi construída com privacidade como prioridade absoluta.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {securityItems.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 text-center"
              style={{
                background: "var(--color-surface-card)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <s.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">{s.title}</h3>
              <p className="text-xs text-slate-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="text-center px-6 pb-20">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl text-base font-bold text-white
                     transition-all duration-300 hover:scale-105 active:scale-[0.98] shadow-xl"
          style={{
            background: "linear-gradient(135deg, #00ade8, #0090c4)",
            boxShadow: "0 12px 40px rgba(0,173,232,0.35)",
          }}
        >
          Comece Agora
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-4xl mx-auto h-px" style={{ background: "linear-gradient(to right, transparent, rgba(0,173,232,0.2), transparent)" }} />

      {/* ── Footer with Inline Legal ── */}
      <footer className="max-w-4xl mx-auto px-6 py-16">
        {/* Privacy Accordion */}
        <div className="mb-4 rounded-xl overflow-hidden" style={{ background: "var(--color-surface-card)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <button
            onClick={() => setShowPrivacy(!showPrivacy)}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Política de Privacidade
            {showPrivacy ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
          {showPrivacy && (
            <div className="px-6 pb-6 text-xs text-slate-400 leading-relaxed space-y-4 animate-fade-in">
              <p><strong className="text-slate-200">1. Introdução.</strong> Bem-vindo à Plataforma Gabi., operada pela Ness. Respeitamos a sua privacidade e estamos comprometidos em proteger seus dados pessoais e organizacionais.</p>
              <p><strong className="text-slate-200">2. Dados Coletados.</strong> Coletamos minimamente o estrito necessário: dados de conta (e-mail, nome, foto) e documentos que você faz upload voluntário para criar seu perfil de escrita ou base de conhecimento.</p>
              <p><strong className="text-slate-200">3. Uso dos Dados.</strong> Seus dados são usados exclusivamente para fornecer resultados customizados de inteligência artificial. A Ness não vende dados sob hipótese alguma.</p>
              <p><strong className="text-slate-200">4. IA e Segurança.</strong> Fragmentos de seus arquivos podem ser temporariamente submetidos a provedores de IA (Google Cloud Vertex AI). É estritamente vedado usar seus dados para treinar modelos fundacionais públicos.</p>
              <p><strong className="text-slate-200">5. Retenção.</strong> Você pode apagar seus documentos a qualquer tempo pela plataforma. Para deleção total de conta, contate o suporte da Ness.</p>
              <p className="pt-2">
                <Link href="/privacy" className="transition-colors underline" style={{ color: "#00ade8" }}>
                  Ver documento completo →
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Terms Accordion */}
        <div className="mb-10 rounded-xl overflow-hidden" style={{ background: "var(--color-surface-card)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <button
            onClick={() => setShowTerms(!showTerms)}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Termos de Serviço
            {showTerms ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
          {showTerms && (
            <div className="px-6 pb-6 text-xs text-slate-400 leading-relaxed space-y-4 animate-fade-in">
              <p><strong className="text-slate-200">1. Aceitação.</strong> Ao acessar a Gabi e seus módulos, o Usuário concorda integralmente com estes termos.</p>
              <p><strong className="text-slate-200">2. Natureza Consultiva.</strong> Quaisquer insights gerados pela Gabi não constituem conselhos jurídicos formais, laudos atuariais ou aconselhamentos finalísticos. Toda inferência deve ser validada por profissional humano qualificado.</p>
              <p><strong className="text-slate-200">3. Responsabilidades.</strong> O nível de acurácia depende diretamente da qualidade dos arquivos enviados. O Usuário compromete-se a não enviar documentos maliciosos ou sob litígio penal fora de sua alçada.</p>
              <p><strong className="text-slate-200">4. Proteção.</strong> É expressamente proibido tentar extrair código-fonte, aplicar ataques de injeção de prompt ou engenharia reversa na plataforma.</p>
              <p><strong className="text-slate-200">5. Disponibilidade.</strong> A Ness garante 99% de uptime regular, podendo o acesso ser temporariamente suspenso para atualizações ou contingências de segurança.</p>
              <p className="pt-2">
                <Link href="/terms" className="transition-colors underline" style={{ color: "#00ade8" }}>
                  Ver documento completo →
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-6 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacidade
            </Link>
            <span className="text-slate-700">&bull;</span>
            <Link href="/terms" className="hover:text-white transition-colors">
              Termos
            </Link>
            <span className="text-slate-700">&bull;</span>
            <Link href="/login" className="hover:text-white transition-colors">
              Login
            </Link>
          </div>
          <p className="text-[11px] text-slate-600">
            &copy; {new Date().getFullYear()} Ness. Todos os direitos reservados.
          </p>
          <p className="text-[10px] text-slate-700">
            powered by <span className="text-white" style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 500 }}>ness<span style={{ color: "#00ade8" }}>.</span></span>
          </p>
        </div>
      </footer>
    </div>
  )
}
