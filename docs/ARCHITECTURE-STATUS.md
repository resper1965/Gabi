# Gabi Platform — Architecture Status

> **Last Updated:** 2026-03-21
> **Source of Truth** — Consulte este documento antes de mencionar módulos ou features.

---

## Módulos e Status

| Módulo | Status | Detalhes |
|--------|--------|----------|
| **Law** (gabi.legal) | ✅ **ATIVO** | Módulo principal. Contém os 7 agentes de IA especializados. |
| **Ghost Writer** | 🔄 **INCORPORADO** | Foi unificado DENTRO do módulo Law. Não é mais um módulo separado. A funcionalidade de "redação baseada em estilos" faz parte dos 7 agentes (agente Redatora). |
| **nTalk / Data** (gabi.data) | ⏸️ **PAUSADO** | Módulo de SQL em linguagem natural está pausado. Não deve ser promovido como feature ativa. Backend existe mas está inativo comercialmente. |
| **InsightCare** (gabi.care) | 🔄 **INCORPORADO** | Funcionalidades de seguros foram incorporadas ao módulo Law como 3 dos 7 agentes (Anal. Coberturas, Anal. Sinistralidade, Consult. Regulatório). |

---

## Os 7 Agentes (Módulo Law Unificado)

| # | Agente | Origem | Especialidade |
|---|--------|--------|--------------|
| 1 | **Auditora** | Law | Analisa contratos, identifica riscos e cláusulas críticas |
| 2 | **Pesquisadora** | Law | Jurisprudência, legislação e regulamentação |
| 3 | **Redatora** | Ghost Writer | Pareceres e documentos — redação baseada no estilo do escritório |
| 4 | **Sentinela** | Law | Monitora obrigações, prazos, alertas regulatórios |
| 5 | **Anal. Coberturas** | InsightCare | Compara apólices, coberturas e exclusões |
| 6 | **Anal. Sinistralidade** | InsightCare | Loss ratio, PMPM, KPIs atuariais |
| 7 | **Consult. Regulatório** | InsightCare | Normas ANS/SUSEP, compliance de seguros |

---

## Navegação Frontend

| Página | Rota | Status |
|--------|------|--------|
| Dashboard | `/` | Ativo — mostra card Gabi (7 agentes) |
| Chat (Gabi) | `/chat` | Ativo — interface principal unificada |
| nTalk | `/ntalk` | Pausado — página existe mas módulo inativo |
| Docs | `/docs` | Ativo — documentação da plataforma |
| Admin | `/admin` | Ativo — apenas admins/superadmins |

---

## Regras para IA/Conteúdo

1. **NUNCA** mencionar "Ghost Writer" como feature separada → dizer "redação baseada em estilos" ou "agente Redatora"
2. **NUNCA** promover gabi.data/nTalk como feature ativa
3. **SEMPRE** falar dos "7 agentes de IA especializados" ao descrever a Gabi
4. O módulo Law é o produto principal — tudo roda via `/chat`
