"use client"

import Link from "next/link"
import { 
  ShieldCheck, 
  Lock, 
  Server, 
  Database, 
  FileCheck, 
  EyeOff,
  Code2,
  AlertCircle,
  Bug,
  TestTube,
  ScanSearch,
  Container,
  FileCode2,
  Gauge,
  GitBranch,
  CheckCircle2
} from "lucide-react"

export default function TrustCenterPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] selection:bg-[#0369A1] selection:text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      
      {/* ── Hero ── */}
      <section className="relative px-6 pt-24 pb-16 border-b border-white/5 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full pointer-events-none opacity-30" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 60%)" }} />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Centro de Confiança & Segurança</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Segurança Nível Enterprise.<br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-cyan-400">Privacidade by Design.</span>
          </h1>
          
          <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
            A Gabi foi construída para atender aos rigorosos padrões de compliance de bancos, instituições de saúde e governos. Seus dados estão protegidos pelas melhores tecnologias do mundo.
          </p>
        </div>
      </section>

      {/* ── Live Status ── */}
      <section className="px-6 py-8 border-b border-white/5 bg-slate-900/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">System Uptime</span>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xl font-bold text-emerald-400">99.99%</span>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">WAF Protection</span>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xl font-bold text-emerald-400">Ativo</span>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Encrypted At Rest</span>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-white" />
              <span className="text-xl font-bold text-white">AES-256</span>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">In Transit</span>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-white" />
              <span className="text-xl font-bold text-white">TLS 1.3</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Certifications & Privacy ── */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-10 text-center">Conformidade e Certificações</h2>
        <div className="grid md:grid-cols-3 gap-6">
          
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
            <FileCheck className="w-8 h-8 text-[#00ade8] mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">LGPD e GDPR</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Arquitetura voltada para privacidade. Implementamos o &quot;Direito ao Esquecimento&quot; com exclusões definitivas e sem uso de dados para perfilamento secundário. Toda infraestrutura está majoritariamente no Brasil (SouthAmerica-East1).
            </p>
            <Link href="/privacy" className="text-xs font-bold text-[#00ade8] hover:underline uppercase tracking-wide">
              Ler Política de Privacidade →
            </Link>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
            <Server className="w-8 h-8 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">ISO 27001 & ISO 27701</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sistema de gestão de segurança da informação (ISMS) e privacidade (PIMS) baseados nas melhores normas internacionais. Estamos ativamente implementando os controles do Anexo A para garantir melhoria contínua de risco.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
            <EyeOff className="w-8 h-8 text-amber-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Zero-Training de IA</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Nossos acordos de infraestrutura garantem que <strong>zero dados corporativos ou prompts</strong> são utilizados para treinar os modelos fundacionais do Vertex AI/Gemini. Seus documentos são processados de forma efêmera e isolada.
            </p>
          </div>

        </div>
      </section>

      {/* ── App Security (SSDLC & OWASP) ── */}
      <section className="px-6 py-20 border-t border-white/5 bg-[#020617]">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Arquitetura Defensiva</h2>
            <p className="text-slate-400">Proteção ativa e passiva em todas as camadas da aplicação.</p>
          </div>

          <div className="space-y-4">
            <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 flex gap-4 items-start">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-bold text-white mb-2">Proteção contra OWASP Top 10</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Utilizamos WAF na borda (Google Cloud Armor) com regras prontas para barrar Injeção SQL, Cross-Site Scripting (XSS), Server-Side Request Forgery (SSRF) e injeções de prompt direto na camada de rede, antes mesmo de atingir nossa infraestrutura central.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 flex gap-4 items-start">
              <Code2 className="w-6 h-6 text-cyan-400 shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-bold text-white mb-2">SSDLC Integrado (CI/CD)</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  O ciclo de vida seguro de desenvolvimento (SSDLC) da Gabi inclui análises automatizadas de SAST, DAST e SCA em cada commit. Nenhum pacote com vulnerabilidade crítica conhecida (&quot;CVE&quot;) chega ao ambiente de produção.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 flex gap-4 items-start">
              <Lock className="w-6 h-6 text-violet-400 shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-bold text-white mb-2">Isolamento Multi-Tenant Avançado</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Aplicação de Row-Level Security (RLS) no PostgreSQL e segregação de buckets. Uma barreira arquitetural que assegura que, mesmo em cenários de falha na aplicação, os dados de um cliente jamais vazem para outro locatário.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security Testing Pipeline ── */}
      <section className="px-6 py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
              <TestTube className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Pipeline de Segurança Automatizado</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">10 Verificações em Cada Deploy</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Cada push ao repositório aciona automaticamente uma bateria de 10 scanners de segurança independentes.
              Nada chega a produção sem passar por todos.
            </p>
          </div>

          {/* ── Execution Flow ── */}
          <div className="mb-12 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-mono text-slate-500 uppercase">git push → Cloud Build Pipeline</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Tests + Coverage", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
                { label: "Bandit SAST", color: "bg-red-500/20 text-red-400 border-red-500/30" },
                { label: "Semgrep SAST", color: "bg-red-500/20 text-red-400 border-red-500/30" },
                { label: "pip-audit SCA", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
                { label: "Gitleaks", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
                { label: "Checkov IaC", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
                { label: "Ruff Lint", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
              ].map((step, i) => (
                <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${step.color}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {step.label}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 my-4">
              <span className="h-px flex-1 bg-slate-700" />
              <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Build → Scan → Deploy</span>
              <span className="h-px flex-1 bg-slate-700" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Trivy API Image", color: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
                { label: "Trivy Web Image", color: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
                { label: "OWASP ZAP DAST", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
              ].map((step, i) => (
                <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${step.color}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {step.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Tool Cards ── */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-red-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Bug className="w-5 h-5 text-red-400" />
                <h4 className="font-bold text-white">SAST</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Bandit</strong> (Python) + <strong className="text-slate-300">Semgrep</strong> (multi-linguagem) analisam estaticamente cada linha de código em busca de vulnerabilidades, seguindo OWASP e CWE.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <ScanSearch className="w-5 h-5 text-rose-400" />
                <h4 className="font-bold text-white">DAST</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">OWASP ZAP</strong> executa testes dinâmicos contra o ambiente de staging após cada deploy, simulando ataques reais em runtime.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-orange-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <FileCheck className="w-5 h-5 text-orange-400" />
                <h4 className="font-bold text-white">SCA</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">pip-audit</strong> verifica todas as dependências contra o banco nacional de vulnerabilidades (NVD) em busca de CVEs conhecidos.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Container className="w-5 h-5 text-teal-400" />
                <h4 className="font-bold text-white">Container Security</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Trivy</strong> escaneia ambas as imagens Docker (API + Web) em busca de vulnerabilidades HIGH/CRITICAL no SO e pacotes.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <FileCode2 className="w-5 h-5 text-purple-400" />
                <h4 className="font-bold text-white">IaC Security</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Checkov</strong> audita Dockerfiles e configurações de infraestrutura contra mais de 1.000 políticas de segurança de cloud.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-yellow-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Lock className="w-5 h-5 text-yellow-400" />
                <h4 className="font-bold text-white">Secrets Detection</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Gitleaks</strong> examina todo o histórico git para garantir que nenhuma credencial, API key ou segredo foi commitado acidentalmente.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Gauge className="w-5 h-5 text-blue-400" />
                <h4 className="font-bold text-white">Code Quality</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Ruff</strong> aplica mais de 700 regras de lint (PEP 8, pyflakes, isort, pyupgrade) com velocidade 10-100x superior a ferramentas tradicionais.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <TestTube className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-white">Tests + Coverage</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">199 testes automatizados</strong> (unit + integration) com relatório de cobertura. Testes de segurança dedicados validam BOLA, rate limiting e SQL injection.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Contact & DPO ── */}
      <section className="px-6 py-20 border-t border-white/5 max-w-4xl mx-auto text-center">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-4">Portal de Exposição Coordenada & Contato</h2>
        <p className="text-slate-400 text-sm max-w-2xl mx-auto mb-8 leading-relaxed">
          Nós apoiamos a comunidade white-hat. Se encontrar qualquer falha de segurança nos nossos domínios, por favor faça a submissão de forma responsável para o nosso Security Team antes de divulgar publicamente.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-700">
            <span className="block text-xs uppercase text-slate-500 font-bold mb-1">Time de Segurança</span>
            <a href="mailto:security@ness.com.br" className="text-[#00ade8] font-semibold hover:underline">security@ness.com.br</a>
          </div>
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-700">
            <span className="block text-xs uppercase text-slate-500 font-bold mb-1">Data Protection Officer (DPO)</span>
            <a href="mailto:dpo@ness.com.br" className="text-[#00ade8] font-semibold hover:underline">dpo@ness.com.br</a>
          </div>
        </div>

        <div className="mt-16">
          <Link href="/landing" className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-sm font-bold text-slate-300 border border-slate-700 hover:bg-slate-800 transition-all">
            Voltar para Gabi
          </Link>
        </div>
      </section>

    </div>
  )
}
