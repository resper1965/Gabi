"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/auth-provider"
import { gabi, gabiPlatform } from "@/lib/api"
import {
  Users, FileText, Database, Shield, RefreshCw, Loader2,
  CheckCircle2, XCircle, Clock, ChevronDown, BookOpen, Download, Trash2, Search, Zap, Code,
  Building2, Crown, DollarSign, TrendingUp, BarChart3, ChevronLeft, ChevronRight,
  Activity, Flame, Power, PowerOff
} from "lucide-react"
import { toast } from "sonner"
import NextImage from "next/image"

/* ═══════════════════ TYPES ═══════════════════ */

interface UserInfo {
  id: string; firebase_uid: string; email: string; name: string | null
  picture: string | null; role: string; status: string
  allowed_modules: string[]; is_active: boolean; created_at: string | null
}
interface Stats {
  users: number; pending_users: number
  documents: { ghost: number; law: number; total: number }
  database_size_mb: number
}
interface SeedPack {
  id: string; name: string; description: string; module: string
  dir: string; installed_count: number; last_updated: string | null
}
interface PlatformOrgRow {
  id: string; name: string; cnpj: string | null; sector: string | null
  domain: string | null; plan: string; member_count: number
  ops_this_month: number; is_active: boolean; created_at: string
}
interface FinOpsSummary {
  period: string; total_cost_usd: number; total_tokens: number
  total_requests: number; avg_cost_per_request: number
  projected_monthly_usd: number
  by_module: { module: string; cost_usd: number; tokens: number; requests: number }[]
  by_model: { model: string; cost_usd: number; requests: number }[]
  daily_burn: { day: string; cost_usd: number; requests: number }[]
}
interface FinOpsOrg {
  org_id: string; org_name: string; cost_usd: number; tokens: number; requests: number
}

/* ═══════════════════ CONSTANTS ═══════════════════ */

const ALL_MODULES = ["ghost", "law", "ntalk"]
const MODULE_LABELS: Record<string, string> = { ghost: "Writer", law: "Legal", ntalk: "Data" }
const MODULE_COLORS: Record<string, string> = {
  ghost: "var(--color-mod-ghost)", law: "var(--color-mod-law)", ntalk: "var(--color-mod-ntalk)",
}
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: typeof Clock }> = {
  approved: { color: "#34d399", bg: "rgba(52,211,153,0.1)", label: "Aprovado", icon: CheckCircle2 },
  pending: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", label: "Pendente", icon: Clock },
  blocked: { color: "#f87171", bg: "rgba(248,113,113,0.1)", label: "Bloqueado", icon: XCircle },
}
const PLAN_COLORS: Record<string, string> = {
  trial: "#fbbf24", starter: "#38bdf8", pro: "#818cf8", enterprise: "#f472b6",
}

type AdminTab = "users" | "orgs" | "finops" | "rag"

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */

export default function AdminPage() {
  const { profile } = useAuth()
  const isSuperadmin = profile?.role === "superadmin"

  // Tab state
  const [activeTab, setActiveTab] = useState<AdminTab>("users")
  const [loading, setLoading] = useState(true)

  // Users state
  const [users, setUsers] = useState<UserInfo[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  // RAG state
  const [seedPacks, setSeedPacks] = useState<SeedPack[]>([])
  const [seedLoading, setSeedLoading] = useState<string | null>(null)
  const [ingestResults, setIngestResults] = useState<Array<{ source: string; status: string; detail?: string }>>([])
  const [ragBases, setRagBases] = useState<{ law_documents: Record<string, unknown>[]; regulatory_insights: Record<string, unknown>[] } | null>(null)
  const [ragQuery, setRagQuery] = useState("")
  const [ragSimulation, setRagSimulation] = useState<{ intent?: Record<string, unknown>; did_retrieve?: boolean; chunks?: Record<string, unknown>[] } | null>(null)
  const [ragLoading, setRagLoading] = useState(false)

  // Orgs state
  const [orgs, setOrgs] = useState<PlatformOrgRow[]>([])
  const [orgsTotal, setOrgsTotal] = useState(0)
  const [orgsPage, setOrgsPage] = useState(0)
  const [changingPlan, setChangingPlan] = useState<string | null>(null)
  const [orgAction, setOrgAction] = useState<string | null>(null)
  const orgsLimit = 20

  // FinOps state
  const [finops, setFinops] = useState<FinOpsSummary | null>(null)
  const [finopsOrgs, setFinopsOrgs] = useState<FinOpsOrg[]>([])

  // ── Data fetchers ──

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const [u, s, packs, rag] = await Promise.all([
        gabi.admin.users() as Promise<UserInfo[]>,
        gabi.admin.stats() as Promise<Stats>,
        gabi.admin.regulatoryPacks().catch(() => ({ packs: [] })) as Promise<{ packs: SeedPack[] }>,
        gabi.admin.regulatoryBases().catch(() => ({ law_documents: [], regulatory_insights: [] })) as Promise<{ law_documents: Record<string, unknown>[]; regulatory_insights: Record<string, unknown>[] }>,
      ])
      setUsers(u); setStats(s); setSeedPacks(packs.packs || []); setRagBases(rag)
    } catch { toast.error("Erro ao carregar dados") }
    finally { setLoading(false) }
  }, [])

  const fetchOrgs = useCallback(async () => {
    if (!isSuperadmin) return
    setLoading(true)
    try {
      const res = await gabiPlatform.listOrgs(orgsLimit, orgsPage * orgsLimit) as { orgs: PlatformOrgRow[]; total: number }
      setOrgs(res.orgs); setOrgsTotal(res.total)
    } catch { toast.error("Erro ao carregar organizações") }
    finally { setLoading(false) }
  }, [isSuperadmin, orgsPage])

  const fetchFinOps = useCallback(async () => {
    if (!isSuperadmin) return
    setLoading(true)
    try {
      const [summary, byOrg] = await Promise.all([
        gabiPlatform.finopsSummary() as Promise<FinOpsSummary>,
        gabiPlatform.finopsByOrg() as Promise<{ orgs: FinOpsOrg[] }>,
      ])
      setFinops(summary); setFinopsOrgs(byOrg.orgs)
    } catch { toast.error("Erro ao carregar FinOps") }
    finally { setLoading(false) }
  }, [isSuperadmin])

  // Initial load + tab switching
  useEffect(() => {
    if (activeTab === "users" || activeTab === "rag") fetchUsers()
    else if (activeTab === "orgs") fetchOrgs()
    else if (activeTab === "finops") fetchFinOps()
  }, [activeTab, fetchUsers, fetchOrgs, fetchFinOps])

  // ── User actions ──

  const handleApprove = async (userId: string, modules: string[] = ALL_MODULES) => {
    setActionLoading(userId)
    try { await gabi.admin.approveUser(userId, modules); toast.success("Usuário aprovado"); fetchUsers() }
    catch { toast.error("Erro ao aprovar") }
    finally { setActionLoading(null) }
  }

  const handleBlock = async (userId: string) => {
    setActionLoading(userId)
    try { await gabi.admin.blockUser(userId); toast.success("Usuário bloqueado"); fetchUsers() }
    catch { toast.error("Erro ao bloquear") }
    finally { setActionLoading(null) }
  }

  const handleToggleModule = async (userId: string, current: string[], mod: string) => {
    const mods = current.includes(mod) ? current.filter(m => m !== mod) : [...current, mod]
    setActionLoading(userId)
    try { await gabi.admin.updateModules(userId, mods); fetchUsers() }
    catch { toast.error("Erro ao atualizar módulos") }
    finally { setActionLoading(null) }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId)
    try { await gabi.admin.updateRole(userId, newRole); toast.success("Role atualizada"); fetchUsers() }
    catch { toast.error("Erro ao atualizar role") }
    finally { setActionLoading(null) }
  }

  // ── Org actions ──

  const handleChangePlan = async (orgId: string, plan: string) => {
    setChangingPlan(orgId)
    try { await gabiPlatform.changePlan(orgId, plan); toast.success(`Plano → ${plan}`); fetchOrgs() }
    catch { toast.error("Erro ao alterar plano") }
    finally { setChangingPlan(null) }
  }

  const handleToggleOrg = async (orgId: string, active: boolean) => {
    setOrgAction(orgId)
    try {
      if (active) await gabiPlatform.deactivateOrg(orgId)
      else await gabiPlatform.activateOrg(orgId)
      toast.success(active ? "Org desativada" : "Org ativada"); fetchOrgs()
    } catch { toast.error("Erro ao alterar status") }
    finally { setOrgAction(null) }
  }

  // ── Auth guard ──

  if (profile?.role !== "admin" && profile?.role !== "superadmin") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Acesso restrito a administradores</p>
        </div>
      </div>
    )
  }

  const pendingUsers = users.filter(u => u.status === "pending")

  // ── Tab definitions ──
  const TABS: { key: AdminTab; label: string; icon: typeof Users; color: string; superOnly?: boolean }[] = [
    { key: "users", label: "Usuários", icon: Users, color: "var(--color-gabi-primary)" },
    { key: "orgs", label: "Organizações", icon: Building2, color: "#38bdf8", superOnly: true },
    { key: "finops", label: "FinOps", icon: DollarSign, color: "#34d399", superOnly: true },
    { key: "rag", label: "Acervo IA", icon: Zap, color: "#818cf8" },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão centralizada da plataforma</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === "orgs") fetchOrgs()
            else if (activeTab === "finops") fetchFinOps()
            else fetchUsers()
          }}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer bg-[#1E293B] text-slate-400 hover:text-white border border-[#334155] transition-all"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Atualizar
        </button>
      </div>

      {/* Stats Bar — only on Users tab */}
      {activeTab === "users" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Usuários", value: stats.users, icon: Users, color: "var(--color-gabi-primary)" },
            { label: "Pendentes", value: stats.pending_users, icon: Clock, color: "#fbbf24" },
            { label: "Documentos", value: stats.documents.total, icon: FileText, color: "var(--color-mod-law)" },
            { label: "DB Size", value: `${stats.database_size_mb} MB`, icon: Database, color: "var(--color-mod-ntalk)" },
            { label: "Ghost Docs", value: stats.documents.ghost, icon: FileText, color: "var(--color-mod-ghost)" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl bg-[#1E293B] border border-[#334155] p-4">
              <div className="flex items-center gap-2 mb-2">
                <c.icon className="w-4 h-4" style={{ color: c.color }} />
                <span className="text-xs text-slate-500 font-medium">{c.label}</span>
              </div>
              <p className="text-xl font-semibold">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending Alert */}
      {activeTab === "users" && pendingUsers.length > 0 && (
        <div className="mb-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              {pendingUsers.length} aguardando aprovação
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-3 py-1.5">
                <span className="text-xs text-white">{u.email}</span>
                <button onClick={() => handleApprove(u.id)} disabled={actionLoading === u.id}
                  className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50">
                  {actionLoading === u.id ? "..." : "Aprovar"}
                </button>
                <button onClick={() => handleBlock(u.id)} disabled={actionLoading === u.id}
                  className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer disabled:opacity-50">
                  Bloquear
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ TABS ══════════════ */}
      <div className="flex border-b border-[#334155] mb-6">
        {TABS.filter(t => !t.superOnly || isSuperadmin).map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === t.key ? "text-white" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
            style={{ borderBottomColor: activeTab === t.key ? t.color : "transparent" }}
          >
            <t.icon className="w-4 h-4" style={{ color: activeTab === t.key ? t.color : undefined }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB: USERS ══════════════ */}
      {activeTab === "users" && (
        <>
          {/* Regulatory Seed Packs */}
          {isSuperadmin && seedPacks.length > 0 && (() => {
            const ML: Record<string, string> = { law: "gabi.legal" }
            const MC: Record<string, string> = { law: "var(--color-mod-law)" }
            const groups = seedPacks.reduce((acc: Record<string, typeof seedPacks>, p) => {
              const k = p.module; if (!acc[k]) acc[k] = []; acc[k].push(p); return acc
            }, {})
            return (
              <div className="mb-6 rounded-2xl bg-[#1E293B] border border-[#334155] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold">Bases Regulatórias</h2>
                  <span className="text-[0.6rem] text-slate-500 ml-1">Seed Packs</span>
                </div>
                {Object.entries(groups).map(([mod, packs]) => (
                  <div key={mod} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[0.65rem] font-bold tracking-wider uppercase" style={{ color: MC[mod] }}>
                        {ML[mod] || mod}
                      </span>
                      <div className="flex-1 h-px opacity-20" style={{ background: MC[mod] }} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {packs.map((pack) => {
                        const installed = pack.installed_count > 0
                        return (
                          <div key={pack.id}
                            className={`rounded-lg p-3 flex flex-col gap-2 transition-colors ${installed ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-transparent border border-[#334155]'}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-semibold text-white">{pack.name?.split("—")[0]?.trim() || pack.id.toUpperCase()}</p>
                                  {installed && (
                                    <span className="text-[0.5rem] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium shrink-0">
                                      ✓ {pack.installed_count} docs
                                    </span>
                                  )}
                                </div>
                                <p className="text-[0.6rem] text-slate-500 mt-0.5 leading-relaxed">{pack.description}</p>
                              </div>
                            </div>
                            <div className="flex gap-1.5 mt-auto">
                              <button
                                onClick={async () => {
                                  setSeedLoading(pack.id)
                                  try {
                                    const res = await gabi.admin.seedRegulatory([pack.id]) as { results: Array<{ status: string; docs_created?: number; total_chunks?: number }> }
                                    const r = res.results?.[0]
                                    if (r?.status === "already_seeded") toast.info(`${pack.id.toUpperCase()} já instalado`)
                                    else toast.success(`${pack.id.toUpperCase()} instalado: ${r?.docs_created || 0} docs, ${r?.total_chunks || 0} chunks`)
                                    const fresh = await gabi.admin.regulatoryPacks() as { packs: typeof seedPacks }
                                    setSeedPacks(fresh.packs)
                                  } catch { toast.error(`Erro ao instalar ${pack.id}`) }
                                  finally { setSeedLoading(null) }
                                }}
                                disabled={seedLoading === pack.id}
                                className="flex items-center gap-1 text-[0.65rem] px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {seedLoading === pack.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                {installed ? "Reinstalar" : "Instalar"}
                              </button>
                              {installed && (
                                <button
                                  onClick={async () => {
                                    setSeedLoading(`rm-${pack.id}`)
                                    try {
                                      const res = await gabi.admin.removeSeedPack(pack.id) as { docs_deactivated: number }
                                      toast.success(`${pack.id.toUpperCase()} removido (${res.docs_deactivated} docs)`)
                                      const fresh = await gabi.admin.regulatoryPacks() as { packs: typeof seedPacks }
                                      setSeedPacks(fresh.packs)
                                    } catch { toast.error(`Erro ao remover ${pack.id}`) }
                                    finally { setSeedLoading(null) }
                                  }}
                                  disabled={seedLoading === `rm-${pack.id}`}
                                  className="flex items-center gap-1 text-[0.65rem] px-2 py-1 rounded bg-red-500/10 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {seedLoading === `rm-${pack.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                  Remover
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Ingestion Pipeline */}
          {isSuperadmin && (
            <div className="mb-6 rounded-2xl bg-[#1E293B] border border-[#334155] p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold">Ingestão Regulatória</h2>
                  <span className="text-[0.6rem] text-slate-500 ml-1">DOU + APIs oficiais</span>
                </div>
                <button
                  onClick={async () => {
                    setSeedLoading("ingest")
                    toast.info("Pipeline iniciado…")
                    try {
                      const res = await gabi.admin.triggerIngest() as { steps: Array<{ source: string; status: string; detail?: string }> }
                      const ok = (res.steps || []).filter(s => s.status === "ok").length
                      const err = (res.steps || []).filter(s => s.status === "error").length
                      if (err === 0) toast.success(`Pipeline: ${ok} fontes ok`)
                      else toast.warning(`Pipeline: ${ok} ok, ${err} erro`)
                      setIngestResults(res.steps || [])
                    } catch { toast.error("Erro no pipeline") }
                    finally { setSeedLoading(null) }
                  }}
                  disabled={seedLoading === "ingest"}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer disabled:opacity-50 font-medium"
                >
                  {seedLoading === "ingest" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Executar
                </button>
              </div>
              <p className="text-[0.65rem] text-slate-500 mb-3">BCB, CMN, CVM, SUSEP, ANS, ANPD, ANEEL</p>
              {ingestResults.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ingestResults.map((r, i) => (
                    <span key={i} className="text-[0.65rem] px-2 py-1 rounded-lg font-medium flex items-center gap-1"
                      style={{ color: r.status === "ok" ? "#34d399" : "#f87171", background: r.status === "ok" ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)" }}>
                      {r.status === "ok" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {r.source}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users Table */}
          <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden">
            <table className="data-grid">
              <thead>
                <tr><th>Usuário</th><th>Role</th><th>Status</th><th>Módulos</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const sc = STATUS_CONFIG[u.status] || STATUS_CONFIG.pending
                  const SI = sc.icon
                  const isExp = expandedUser === u.id
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          {typeof u.picture === 'string' && u.picture.trim().length > 0 ? (
                            <NextImage src={u.picture} alt="" width={24} height={24} unoptimized className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[0.5rem] font-bold text-slate-400">
                              {(u.email || "?").slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-white text-sm">{u.email}</p>
                            {u.name && <p className="text-[0.65rem] text-slate-500">{u.name}</p>}
                          </div>
                        </div>
                      </td>
                      <td>
                        {isSuperadmin ? (
                          <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-transparent text-xs px-2 py-1 rounded border border-slate-700 cursor-pointer text-slate-300">
                            {["user", "admin", "superadmin"].map(r => <option key={r} value={r} style={{ background: "#1a2332" }}>{r}</option>)}
                          </select>
                        ) : <span className="text-xs text-slate-400">{u.role}</span>}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium" style={{ color: sc.color, background: sc.bg }}>
                          <SI className="w-3 h-3" />{sc.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 flex-wrap">
                          {u.status === "approved" && (u.allowed_modules || []).length > 0 ? (
                            (u.allowed_modules || []).map((mod) => (
                              <button key={mod} onClick={() => handleToggleModule(u.id, u.allowed_modules || [], mod)}
                                className="text-[0.6rem] px-1.5 py-0.5 rounded font-medium cursor-pointer transition-all hover:opacity-70"
                                style={{ color: MODULE_COLORS[mod] || "#94a3b8", background: `${MODULE_COLORS[mod] || "#94a3b8"}15`, border: `1px solid ${MODULE_COLORS[mod] || "#94a3b8"}30` }}
                                title={`Remover ${MODULE_LABELS[mod] || mod}`}>{MODULE_LABELS[mod] || mod}</button>
                            ))
                          ) : u.status === "approved" ? <span className="text-[0.6rem] text-slate-600">Nenhum módulo</span>
                            : <span className="text-[0.6rem] text-slate-600">—</span>}
                          {u.status === "approved" && (
                            <div className="relative">
                              <button onClick={() => setExpandedUser(isExp ? null : u.id)}
                                className="text-[0.6rem] w-5 h-5 rounded flex items-center justify-center bg-[#1E293B] border border-[#334155] text-slate-500 hover:text-white cursor-pointer transition-colors" title="Módulos">
                                <ChevronDown className={`w-3 h-3 transition-transform ${isExp ? "rotate-180" : ""}`} />
                              </button>
                              {isExp && (
                                <div className="absolute top-7 right-0 z-10 bg-[#1E293B] border border-[#334155] rounded-xl shadow-xl p-2 min-w-[120px]">
                                  {ALL_MODULES.filter(m => !(u.allowed_modules || []).includes(m)).map((mod) => (
                                    <button key={mod} onClick={() => { handleToggleModule(u.id, u.allowed_modules || [], mod); setExpandedUser(null) }}
                                      className="block w-full text-left text-xs px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer transition-colors"
                                      style={{ color: MODULE_COLORS[mod] }}>+ {MODULE_LABELS[mod]}</button>
                                  ))}
                                  {ALL_MODULES.filter(m => !(u.allowed_modules || []).includes(m)).length === 0 && (
                                    <p className="text-xs text-slate-600 px-2 py-1">Todos ativos</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {u.status === "pending" && (
                            <>
                              <button onClick={() => handleApprove(u.id)} disabled={actionLoading === u.id}
                                className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50">Aprovar</button>
                              <button onClick={() => handleBlock(u.id)} disabled={actionLoading === u.id}
                                className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer disabled:opacity-50">Bloquear</button>
                            </>
                          )}
                          {u.status === "blocked" && (
                            <button onClick={() => handleApprove(u.id)} disabled={actionLoading === u.id}
                              className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50">Desbloquear</button>
                          )}
                          {u.status === "approved" && (
                            <button onClick={() => handleBlock(u.id)} disabled={actionLoading === u.id}
                              className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50">Bloquear</button>
                          )}
                          {actionLoading === u.id && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {users.length === 0 && !loading && (
                  <tr><td colSpan={5} className="text-center text-slate-600 py-8">Nenhum usuário</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════ TAB: ORGS ══════════════ */}
      {activeTab === "orgs" && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden">
            <div className="p-4 border-b border-[#334155] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold">Organizações</h2>
                <span className="text-xs text-slate-500">({orgsTotal})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {orgsPage * orgsLimit + 1}–{Math.min((orgsPage + 1) * orgsLimit, orgsTotal)} de {orgsTotal}
                </span>
                <button onClick={() => setOrgsPage(Math.max(0, orgsPage - 1))} disabled={orgsPage === 0}
                  className="p-1 rounded hover:bg-white/5 text-slate-500 disabled:opacity-30 cursor-pointer">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setOrgsPage(orgsPage + 1)} disabled={(orgsPage + 1) * orgsLimit >= orgsTotal}
                  className="p-1 rounded hover:bg-white/5 text-slate-500 disabled:opacity-30 cursor-pointer">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <table className="data-grid w-full">
              <thead>
                <tr>
                  <th>Organização</th>
                  <th>Plano</th>
                  <th>Membros</th>
                  <th>Ops/mês</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <div>
                        <p className="text-sm text-white font-medium">{org.name}</p>
                        <p className="text-[0.65rem] text-slate-500">{org.sector || "—"} · {org.cnpj || "Sem CNPJ"}</p>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ color: PLAN_COLORS[org.plan] || "#94a3b8", background: `${PLAN_COLORS[org.plan] || "#94a3b8"}15` }}>
                        <Crown className="w-3 h-3 inline mr-1" />{org.plan}
                      </span>
                    </td>
                    <td><span className="text-sm">{org.member_count}</span></td>
                    <td><span className="text-sm">{org.ops_this_month.toLocaleString("pt-BR")}</span></td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${org.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {org.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <select value={org.plan} onChange={(e) => handleChangePlan(org.id, e.target.value)}
                          disabled={changingPlan === org.id}
                          className="bg-transparent text-xs px-2 py-1 rounded border border-slate-700 cursor-pointer text-slate-300 disabled:opacity-50">
                          {["trial", "starter", "pro", "enterprise"].map((p) => (
                            <option key={p} value={p} style={{ background: "#1a2332" }}>{p}</option>
                          ))}
                        </select>
                        <button onClick={() => handleToggleOrg(org.id, org.is_active)} disabled={orgAction === org.id}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${org.is_active ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                          title={org.is_active ? "Desativar" : "Ativar"}>
                          {orgAction === org.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : org.is_active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orgs.length === 0 && !loading && (
                  <tr><td colSpan={6} className="text-center text-slate-600 py-8">Nenhuma organização</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: FINOPS ══════════════ */}
      {activeTab === "finops" && (
        <div className="space-y-6 animate-fade-in">
          {/* FinOps Stats Cards */}
          {finops && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Custo Mensal", value: `$${finops.total_cost_usd.toFixed(2)}`, icon: DollarSign, color: "#34d399" },
                  { label: "Projeção 30d", value: `$${finops.projected_monthly_usd.toFixed(2)}`, icon: TrendingUp, color: "#fbbf24" },
                  { label: "Requisições", value: finops.total_requests.toLocaleString("pt-BR"), icon: Activity, color: "#38bdf8" },
                  { label: "Custo/req", value: `$${finops.avg_cost_per_request.toFixed(4)}`, icon: Flame, color: "#f472b6" },
                ].map((c) => (
                  <div key={c.label} className="rounded-2xl bg-[#1E293B] border border-[#334155] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <c.icon className="w-4 h-4" style={{ color: c.color }} />
                      <span className="text-xs text-slate-500 font-medium">{c.label}</span>
                    </div>
                    <p className="text-2xl font-semibold">{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Daily Burn Chart */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 rounded-2xl bg-[#1E293B] border border-[#334155] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold">Burn Rate Diário (7 dias)</h2>
                  </div>
                  <div className="flex items-end gap-1 h-40">
                    {finops.daily_burn.length > 0 ? finops.daily_burn.map((d) => {
                      const maxCost = Math.max(0.001, ...finops.daily_burn.map(x => x.cost_usd))
                      const h = (d.cost_usd / maxCost) * 100
                      return (
                        <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
                            style={{ height: `${h}%`, minHeight: d.cost_usd > 0 ? 4 : 0, background: "linear-gradient(to top, #34d399, #059669)" }} />
                          <span className="text-[0.5rem] text-slate-600 mt-auto">
                            {new Date(d.day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          </span>
                          <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-[#0f172a] border border-[#334155] rounded-lg px-2 py-1 text-[0.6rem] whitespace-nowrap">
                            <span className="text-emerald-400 font-medium">${d.cost_usd.toFixed(4)}</span>
                            <span className="text-slate-500 ml-1">({d.requests} reqs)</span>
                          </div>
                        </div>
                      )
                    }) : (
                      <div className="flex-1 flex items-center justify-center h-full text-slate-600 text-sm">Sem dados</div>
                    )}
                  </div>
                </div>

                {/* By Module breakdown */}
                <div className="rounded-2xl bg-[#1E293B] border border-[#334155] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold">Custo por Módulo</h2>
                  </div>
                  <div className="space-y-3">
                    {finops.by_module.length > 0 ? finops.by_module.map((m) => {
                      const pct = finops.total_cost_usd > 0 ? (m.cost_usd / finops.total_cost_usd) * 100 : 0
                      return (
                        <div key={m.module}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium" style={{ color: MODULE_COLORS[m.module] }}>
                              gabi.{MODULE_LABELS[m.module]?.toLowerCase() || m.module}
                            </span>
                            <span className="text-xs text-slate-500">${m.cost_usd.toFixed(4)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: MODULE_COLORS[m.module] || "#94a3b8" }} />
                          </div>
                        </div>
                      )
                    }) : <p className="text-xs text-slate-600">Sem dados</p>}
                  </div>
                  {finops.by_model.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-[#334155]">
                      <h3 className="text-xs text-slate-500 font-medium mb-2">Por Modelo</h3>
                      {finops.by_model.map((m) => (
                        <div key={m.model} className="flex justify-between text-xs py-1">
                          <span className="text-slate-400 truncate max-w-[130px]">{m.model.replace("gemini-", "").replace("-preview-05-06", "")}</span>
                          <span className="text-white font-medium">${m.cost_usd.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cost by Org */}
              {finopsOrgs.length > 0 && (
                <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden">
                  <div className="p-4 border-b border-[#334155] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-semibold">Custo por Organização</h2>
                  </div>
                  <table className="data-grid w-full">
                    <thead>
                      <tr><th>Organização</th><th>Requisições</th><th>Tokens</th><th>Custo (USD)</th></tr>
                    </thead>
                    <tbody>
                      {finopsOrgs.filter(o => o.requests > 0).map((org) => (
                        <tr key={org.org_id}>
                          <td className="text-sm text-white font-medium">{org.org_name}</td>
                          <td className="text-sm">{org.requests.toLocaleString("pt-BR")}</td>
                          <td className="text-sm">{org.tokens.toLocaleString("pt-BR")}</td>
                          <td>
                            <span className="text-sm font-medium text-emerald-400">${org.cost_usd.toFixed(4)}</span>
                          </td>
                        </tr>
                      ))}
                      {finopsOrgs.filter(o => o.requests > 0).length === 0 && (
                        <tr><td colSpan={4} className="text-center text-slate-600 py-8">Sem uso registrado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          {!finops && !loading && (
            <div className="text-center py-12 text-slate-600">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum dado de FinOps disponível</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB: RAG ══════════════ */}
      {activeTab === "rag" && (
        <div className="space-y-6 animate-fade-in">
          {/* RAG Simulator */}
          <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden">
            <div className="p-5 border-b border-[#334155] bg-[#1a2332]/50">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">RAG Simulator</h2>
                <span className="text-[0.65rem] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">Preview Neural</span>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault(); if (!ragQuery.trim()) return
                setRagLoading(true)
                try { const res = await gabi.admin.simulateRag(ragQuery, "law") as Record<string, unknown>; setRagSimulation(res) }
                catch { toast.error("Falha ao simular busca") }
                finally { setRagLoading(false) }
              }} className="flex gap-2">
                <input type="text" value={ragQuery} onChange={e => setRagQuery(e.target.value)}
                  placeholder="Ex: Como funciona o crédito rural segundo o CMN?"
                  className="flex-1 bg-transparent border border-[#334155] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  disabled={ragLoading} />
                <button type="submit" disabled={ragLoading || !ragQuery.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                  {ragLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Auditar Busca"}
                </button>
              </form>
            </div>
            {ragSimulation && (
              <div className="p-5">
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 bg-slate-900/50 rounded-lg p-4 border border-[#334155]">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> Intent</div>
                    <code className="text-xs text-emerald-400">{JSON.stringify(ragSimulation.intent, null, 2)}</code>
                  </div>
                  <div className="flex-1 bg-slate-900/50 rounded-lg p-4 border border-[#334155]">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Database className="w-3 h-3" /> Vector Match</div>
                    <div className="text-sm text-white">
                      Chunks: <strong className="text-emerald-400">{ragSimulation.chunks?.length || 0}</strong>
                    </div>
                  </div>
                </div>
                {ragSimulation.chunks && ragSimulation.chunks.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2"><Code className="w-3 h-3" /> Raw Chunks</h3>
                    {ragSimulation.chunks.map((ck: Record<string, unknown>, idx: number) => (
                      <div key={idx} className="bg-slate-900 rounded-lg p-4 border border-[#334155]/50 text-xs">
                        <div className="flex items-center gap-2 mb-2 text-emerald-300">
                          <span className="font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded">#{idx+1}</span>
                          <span className="truncate max-w-[300px]">{ck.metadata?.source || "Doc"}</span>
                          {ck.distance !== undefined && <span className="ml-auto text-emerald-400">Score: {(1 - ck.distance).toFixed(3)}</span>}
                        </div>
                        <p className="text-slate-300 leading-relaxed max-h-[150px] overflow-y-auto">{ck.page_content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RAG Catalog */}
          <div className="rounded-2xl bg-[#1E293B] border border-[#334155] overflow-hidden">
            <div className="p-5 border-b border-[#334155] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Acervo Regulatório (Global)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-grid w-full text-left">
                <thead><tr><th>Autoridade</th><th>Títlo / Norma</th><th>Tipo</th><th>Status IA</th></tr></thead>
                <tbody>
                  {ragBases?.regulatory_insights.map((insight: Record<string, unknown>, i: number) => (
                    <tr key={`reg-${i}`}>
                      <td className="text-white text-xs font-medium">{insight.authority || 'BACEN'}</td>
                      <td>
                        <p className="text-sm text-white">{insight.tipo_ato} {insight.numero}</p>
                        <p className="text-[0.65rem] text-slate-500 max-w-sm truncate">{insight.resumo_executivo}</p>
                      </td>
                      <td><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[0.65rem]">Insight (Risco: {insight.risco_nivel})</span></td>
                      <td><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[0.65rem] flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> Indexado</span></td>
                    </tr>
                  ))}
                  {ragBases?.law_documents.map((doc: Record<string, unknown>) => (
                    <tr key={`law-${doc.id}`}>
                      <td className="text-slate-400 text-xs font-medium">Seed Pack</td>
                      <td><p className="text-sm text-slate-300">{doc.title}</p></td>
                      <td><span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-400 text-[0.65rem]">{doc.doc_type || 'PDF'}</span></td>
                      <td><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[0.65rem] flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> Indexado</span></td>
                    </tr>
                  ))}
                  {(!ragBases?.law_documents.length && !ragBases?.regulatory_insights.length) && (
                    <tr><td colSpan={4} className="text-center text-slate-500 py-8 text-sm">Acervo vazio</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
