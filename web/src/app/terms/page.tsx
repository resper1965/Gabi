import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar para a Home
        </Link>
        
        <h1 className="text-3xl font-bold text-white mb-8" style={{ fontFamily: "var(--font-ui)" }}>
          Termos de Serviço
        </h1>
        
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <p className="text-slate-500">Última atualização: 03 de Março de 2026</p>
          
          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">1. Aceitação dos Termos</h2>
            <p>Ao realizar o onboarding e acesso à plataforma Gabi. e seus módulos de produtividade estendida (gabi.writer, gabi.legal, gabi.care e afins), o Usuário concorda integralmente e sem ressalvas com as condições registradas neste Termo.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">2. Natureza Consultiva da Inteligência Artificial</h2>
            <p>A Gabi. é habilitada via Modelos de Linguagem Extensa (LLM) avançados e sistemas RAG. É crucial ressaltar que quaisquer insights, auditorias analíticas de apólices ou peças preliminarmente geradas <strong>não constituem conselhos jurídicos formais, laudos atuariais ou aconselhamentos finalísticos validos de per se</strong>. Toda inferência da IA serve para acelerar pesquisas e deverá, de forma mandatória, ser lida, julgada e rubricada por um profissional humano qualificado antes de qualquer envio ao escrutínio externo ou oficial.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">3. Responsabilidades pelo Upload (&quot;Garbage-in&quot;)</h2>
            <p>O nível de acurácia interativa depende diretamente da densidade e veracidade dos arquivos transferidos localmente para a aba de Conhecimento pelo Usuário. O Usuário compromete-se a não enviar de forma maliciosa ou ciente, documentos contendo infrações de Segredos de Estado, arquivos sob litígio penal fora de sua alçada, ou hardwares infecciosos.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">4. Proteção da Arquitetura Analítica</h2>
            <p>É expressamente defeso ao Usuário tentar aplicar extração de código-fonte, ataques de &quot;Prompt Injection&quot; maliciosos voltados a danificar o tensor (firewall algorítmico global do sistema) da Gabi, ou engenharia reversa para copiar a estrutura dos Agentes orquestrados pela arquitetura SaaS fornecida ao ambiente.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">5. Disponibilidade do Serviço</h2>
            <p>A ness. envidará esforços mercadológicos para garantir 99% de uptime no SLA regular do serviço web e vetorial, podendo o acesso à interface ser temporariamente suspenso para atualizações do modelo cerebral fundacional, desde que alertado sob notificação antecipada na plataforma ou sem pré-aviso caso seja contingência contra ataques e salvaguarda.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
