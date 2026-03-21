"use client"
import { ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function FooterSection() {
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  return (
    <footer className="border-t border-slate-800 bg-surface-base px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
            <button
              onClick={() => setShowPrivacy(!showPrivacy)}
              className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-500 cursor-pointer"
              aria-expanded={showPrivacy}
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
              className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-500 cursor-pointer"
              aria-expanded={showTerms}
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

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-8 text-xs text-slate-500">
          <div className="flex items-center gap-6 font-medium uppercase tracking-wider">
            <Link href="/trust" className="text-emerald-400 hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900 rounded-xs">Trust Center</Link>
            <Link href="/privacy" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900 rounded-xs">Privacidade</Link>
            <Link href="/terms" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900 rounded-xs">Termos</Link>
            <Link href="/login" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900 rounded-xs">Login</Link>
          </div>
          
          <div className="flex items-center gap-2">
            <p>&copy; {new Date().getFullYear()} ness. Todos os direitos reservados.</p>
            <span className="hidden sm:inline">&bull;</span>
            <p>powered by <span className="brand-mark text-slate-300">ness<span className="text-[#00ade8]">.</span></span></p>
          </div>
        </div>
      </div>
    </footer>
  )
}
