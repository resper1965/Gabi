import {
  PenTool,
  Scale,
  BarChart3,
  Radar,
  ShieldCheck,
  Building,
  Gavel,
  TrendingUp,
  Landmark,
} from "lucide-react"
import React from "react"

export const painPoints = [
  {
    before: "Ser pego de surpresa por novas instruções e resoluções",
    after: "A Gabi monitora diários oficiais e alerta proativamente sobre impactos operacionais",
    audience: "Compliance Officers & Jurídico",
    impact: "+80% Produtividade",
    icon: Radar,
    accent: "#10b981", // Emerald
    module: "monitoramento contínuo",
  },
  {
    before: "Horas perdidas revisando dezenas de páginas de contratos e apólices",
    after: "A IA cruza seu documento com a base regulatória e aponta riscos imediatamente",
    audience: "Bancos & Seguradoras",
    impact: "Auditoria em Segundos",
    icon: Scale,
    accent: "#f59e0b", // Amber
    module: "auditoria de contratos",
  },
  {
    before: "Busca exaustiva e fragmentada por normativos aplicáveis",
    after: "Pesquisa centralizada que retorna teses a favor e contra com citações exatas",
    audience: "Gestão de Riscos e Auditoria",
    impact: "Precisão Jurídica",
    icon: BarChart3,
    accent: "#8b5cf6", // Violet
    module: "pesquisa profunda",
  },
  {
    before: "Redação morosa de pareceres e relatórios do zero",
    after: "O Ghost Writer integrado redige a análise replicando o exato estilo do seu escritório",
    audience: "Escritórios de Advocacia",
    impact: "Zero Copy/Paste",
    icon: PenTool,
    accent: "#06b6d4", // Cyan
    module: "ghost writer corporativo",
  },
]

export const regulatoryAgencies = [
  { name: "BCB", full: "Banco Central do Brasil", desc: "Resoluções e circulares", color: "#f59e0b", featured: true },
  { name: "CMN", full: "Conselho Monetário Nacional", desc: "Mercado monetário e crédito", color: "#f59e0b", featured: false },
  { name: "CVM", full: "Comissão de Valores Mobiliários", desc: "Mercado de capitais e fundos", color: "#00ade8", featured: true },
  { name: "LGPD", full: "Lei Geral de Proteção de Dados", desc: "Privacidade e conformidade", color: "#8b5cf6", featured: false },
  { name: "ANS", full: "Agência Nacional de Saúde", desc: "Planos de saúde", color: "#f43f5e", featured: false },
  { name: "SUSEP", full: "Superintendência de Seguros", desc: "Seguros e previdência", color: "#f43f5e", featured: false },
  { name: "ANPD", full: "Autoridade Nac. Proteção de Dados", desc: "Guias de conformidade", color: "#8b5cf6", featured: false },
  { name: "ANEEL", full: "Agência Nac. Energia Elétrica", desc: "Setor elétrico", color: "#06b6d4", featured: false },
]

export const clientLogos = [
  { name: "Escritórios Top Tier", icon: Gavel },
  { name: "Bancos Múltiplos", icon: Building },
  { name: "Gestoras de Fundo", icon: TrendingUp },
  { name: "FIPs & FIIs", icon: Landmark },
  { name: "Asset Managers", icon: BarChart3 },
  { name: "Auditorias Tier 1", icon: ShieldCheck },
  { name: "Consultorias", icon: Building },
]

export type Testimonial = {
  quote: string;
  author: string;
  role: React.ReactNode;
  stars: number;
};

export const testimonials: Testimonial[] = [
  {
    quote: "A Gabi reduziu nosso tempo de análise normativa semanal de 40 horas para apenas 2. O nível de precisão jurídica em inferência contratual é inédito no mercado brasileiro.",
    author: "Ricardo S.",
    role: (
      <>
        Head de Compliance, <span className="text-transparent bg-slate-700 rounded-sm select-none blur-sm px-1">Banco Top 5</span>
      </>
    ),
    stars: 5,
  },
  {
    quote: "Toda a equipe usa a plataforma diariamente para consolidar pareceres. A IA não apenas encontra as leis do BCB/CVM, ela entende o jargão do escritório e rascunha com maestria.",
    author: "Amanda V.",
    role: (
      <>
        Sócia-Diretora, <span className="text-transparent bg-slate-700 rounded-sm select-none blur-sm px-1">Boutique Reg.</span>
      </>
    ),
    stars: 5,
  },
  {
    quote: "A gestão normativa de fundos de infraestrutura (FIP) era um gargalo operacional enorme. Hoje, a Gabi monitora as instruções da CVM e gera relatórios de impacto para os cotistas em minutos.",
    author: "Carlos M.",
    role: (
      <>
        Diretor de Compliance, <span className="text-transparent bg-slate-700 rounded-sm select-none blur-sm px-1">Asset Manager</span>
      </>
    ),
    stars: 5,
  },
]
