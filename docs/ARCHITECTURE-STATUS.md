# Gabi Platform — Architecture Status

> **Last Updated:** 2026-03-21 (v1.3.0)
> **Source of Truth** — Consulte este documento antes de mencionar módulos ou features.

---

## Módulos e Status

| Módulo | Status | Detalhes |
|--------|--------|----------|
| **Law** (gabi.legal) | ✅ **ATIVO** | Módulo único. Contém os 7 agentes de IA especializados + style profiles. |
| **Ghost Writer** | ❌ **REMOVIDO** | Módulo deletado. Funcionalidade de estilo agora em `/api/law/style/*`. Agente Redatora é um dos 7 agentes. |
| **nTalk / Data** (gabi.data) | ⏸️ **PAUSADO** | Backend existe mas inativo. Frontend removido (sem página `/ntalk`). |
| **InsightCare** (gabi.care) | 🔄 **INCORPORADO** | Seguros incorporados ao Law como 3 dos 7 agentes. |

---

## Os 7 Agentes (Módulo Law Unificado)

| # | Agente | Especialidade |
|---|--------|--------------|
| 1 | **Auditora** | Analisa contratos, identifica riscos e cláusulas críticas |
| 2 | **Pesquisadora** | Jurisprudência, legislação e regulamentação |
| 3 | **Redatora** | Pareceres e documentos — redação baseada no estilo do escritório |
| 4 | **Sentinela** | Monitora obrigações, prazos, alertas regulatórios |
| 5 | **Anal. Coberturas** | Compara apólices, coberturas e exclusões |
| 6 | **Anal. Sinistralidade** | Loss ratio, PMPM, KPIs atuariais |
| 7 | **Consult. Regulatório** | Normas ANS/SUSEP, compliance de seguros |

---

## API Endpoints

| Prefixo | Função |
|---------|--------|
| `/api/law/*` | Agentes, documentos, alertas, insights, seguros |
| `/api/law/style/*` | Style profiles, upload de docs de estilo, extração |
| `/api/chat/*` | Histórico de sessões |
| `/api/admin/*` | Admin: users, analytics, regulatory |
| `/api/orgs/*` | Org management |
| `/api/platform/*` | Platform admin, FinOps |

---

## Navegação Frontend

| Página | Rota | Status |
|--------|------|--------|
| Dashboard | `/` | Ativo — card Gabi (7 agentes) |
| Chat (Gabi) | `/chat` | Ativo — interface principal unificada |
| Docs | `/docs` | Ativo — documentação da plataforma |
| Admin | `/admin` | Ativo — apenas admins/superadmins |
| Org | `/org` | Ativo — gestão de organização |

---

## Regras para IA/Conteúdo

1. **NUNCA** mencionar "Ghost Writer" como feature separada → dizer "redação baseada em estilos" ou "agente Redatora"
2. **NUNCA** promover gabi.data/nTalk como feature ativa
3. **SEMPRE** falar dos "7 agentes de IA especializados" ao descrever a Gabi
4. O módulo Law é o produto principal — tudo roda via `/chat`
5. Style profiles são acessados via `/api/law/style/*` (não mais `/api/ghost/*`)
