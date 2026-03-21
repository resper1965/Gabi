"use client"

import { useState, useEffect, useCallback } from "react"
import { gabi } from "@/lib/api"
import { 
  Users, Clock, FileText, Database, BookOpen, Download, Trash2, 
  Loader2, RefreshCw, CheckCircle2, XCircle, ChevronDown 
} from "lucide-react"
import { toast } from "sonner"
import NextImage from "next/image"
import { 
  UserInfo, Stats, SeedPack, ALL_MODULES, MODULE_LABELS, MODULE_COLORS, STATUS_CONFIG 
} from "./types"

interface AdminUsersTabProps {
  isSuperadmin: boolean
  refreshKey: number
}

export default function AdminUsersTab({ isSuperadmin, refreshKey }: AdminUsersTabProps) {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserInfo[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [seedPacks, setSeedPacks] = useState<SeedPack[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [seedLoading, setSeedLoading] = useState<string | null>(null)
  const [ingestResults, setIngestResults] = useState<Array<{ source: string; status: string; detail?: string }>>([])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const [u, s, packs] = await Promise.all([
        gabi.admin.users() as Promise<UserInfo[]>,
        gabi.admin.stats() as Promise<Stats>,
        gabi.admin.regulatoryPacks().catch(() => ({ packs: [] })) as Promise<{ packs: SeedPack[] }>,
      ])
      setUsers(u)
      setStats(s)
      setSeedPacks(packs.packs || [])
    } catch {
      toast.error("Erro ao carregar dados dos usuários")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers, refreshKey])

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
  
  const pendingUsers = users.filter(u => u.status === "pending")

  if (loading && users.length === 0 && !stats) {
    return (
       <div className="flex items-center justify-center py-12">
         <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
       </div>
    )
  }

  return (
    <div className="animate-fade-in-up">
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Usuários", value: stats.users, icon: Users, color: "var(--color-gabi-primary)" },
            { label: "Pendentes", value: stats.pending_users, icon: Clock, color: "#fbbf24" },
            { label: "Documentos", value: stats.documents.total, icon: FileText, color: "var(--color-mod-law)" },
            { label: "DB Size", value: `${stats.database_size_mb} MB`, icon: Database, color: "var(--color-mod-ntalk)" },
            { label: "Ghost Docs", value: stats.documents.ghost, icon: FileText, color: "var(--color-gabi-primary)" },
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
      {pendingUsers.length > 0 && (
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
        <table className="data-grid w-full">
          <thead>
            <tr><th>Usuário</th><th>Role</th><th>Status</th><th>Módulos</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const sc = STATUS_CONFIG[u.status] || STATUS_CONFIG.pending
              const SI = sc.icon === "CheckCircle2" ? CheckCircle2 : sc.icon === "XCircle" ? XCircle : Clock 
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
    </div>
  )
}
