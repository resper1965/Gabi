import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar para a Home
        </Link>
        
        <h1 className="text-3xl font-bold text-white mb-8" style={{ fontFamily: "var(--font-ui)" }}>
          Política de Privacidade
        </h1>
        
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <p className="text-slate-500">Última atualização: 03 de Março de 2026</p>
          
          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">1. Introdução</h2>
            <p>Bem-vindo à Plataforma Gabi, operada pela ness. Respeitamos a sua privacidade e estamos comprometidos em proteger de forma rígida seus dados pessoais e organizacionais. Esta política detalha como coletamos, utilizamos e protegemos as suas informações no ecossistema de inteligência artificial.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">2. Dados que Coletamos</h2>
            <p className="mb-2">Coletamos minimamente o estrito necessário para operar nossa plataforma:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li><strong className="text-slate-200">Dados de Conta:</strong> Informações extraídas do login (como e-mail, nome e foto do perfil) vinculadas à organização.</li>
              <li><strong className="text-slate-200">Documentos Ingeridos:</strong> Arquivos (PDF, DOCX, TXT, etc.) que você faz upload voluntário para criar seu &quot;Style Signature&quot; (gabi.writer) ou para servir de contexto factual jurídico e de seguros (gabi.legal, gabi.care).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">3. Como Usamos Seus Dados</h2>
            <p>Seus dados são encriptados e usados exclusivamente para fornecer resultados customizados de inteligência artificial para a sua navegação (como responder chamados, buscar regulamentos na sua base de conhecimento e emular seu tom de escrita). <strong>A ness. não vende dados sob hipótese alguma.</strong></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">4. Processamento de IA e Segurança</h2>
            <p>Para fornecer a inteligência do sistema, os fragmentos (verificados em chunks vetoriais) de seus arquivos podem ser submetidos temporariamente a provedores robustos de LLM (como Google Cloud Vertex AI e infraestruturas Supabase). <strong>É estritamente vedado, em nossos contratos corporativos de provedor, usar seus escopos para treinar os modelos fundacionais públicos.</strong> Sua informação está blindada isoladamente.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">5. Retenção e Extinção de Base</h2>
            <p>Os administradores da interface possuem o pleno direito autoral mantido; você pode apagar seus documentos pelas abas da Plataforma a qualquer tempo (efetuando a purga vetorial atrelada). Para o término completo de licença de conta e deleção total (hard-delete), contate o suporte da ness. e tudo será criptograficamente eliminado.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
