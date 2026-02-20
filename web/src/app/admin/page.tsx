"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/auth-provider"
import { gabi } from "@/lib/api"
import {
  Users, FileText, Database, Shield, RefreshCw, Loader2,
  CheckCircle2, XCircle, Clock, ChevronDown,
} from "lucide-react"
import { toast } from "sonner"

interface UserInfo {
  id: string
  firebase_uid: string
  email: string
  name: string | null
  picture: string | null
  role: string
  status: string
  allowed_modules: string[]
  is_active: boolean
  created_at: string | null
}

interface Stats {
  users: number
  pending_users: number
  documents: { ghost: number; law: number; insightcare: number; total: number }
  database_size_mb: number
}

const ALL_MODULES = ["ghost", "law", "ntalk", "insightcare"]
const MODULE_LABELS: Record<string, string> = {
  ghost: "Writer",
  law: "Legal",
  ntalk: "Data",
  insightcare: "Care",
}
const MODULE_COLORS: Record<string, string> = {
  ghost: "var(--color-mod-ghost)",
  law: "var(--color-mod-law)",
  ntalk: "var(--color-mod-ntalk)",
  insightcare: "var(--color-mod-insightcare)",
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: typeof Clock }> = {
  approved: { color: "#34d399", bg: "rgba(52,211,153,0.1)", label: "Aprovado", icon: CheckCircle2 },
  pending: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", label: "Pendente", icon: Clock },
  blocked: { color: "#f87171", bg: "rgba(248,113,113,0.1)", label: "Bloqueado", icon: XCircle },
}

export default function AdminPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserInfo[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [u, s] = await Promise.all([
        gabi.admin.users() as Promise<UserInfo[]>,
        gabi.admin.stats() as Promise<Stats>,
      ])
      setUsers(u)
      setStats(s)
    } catch {
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleApprove = async (userId: string, modules: string[] = ALL_MODULES) => {
    setActionLoading(userId)
    try {
      await gabi.admin.approveUser(userId, modules)
      toast.success("Usuário aprovado com sucesso")
      fetchData()
    } catch {
      toast.error("Erro ao aprovar usuário")
    } finally {
      setActionLoading(null)
    }
  }

  const handleBlock = async (userId: string) => {
    setActionLoading(userId)
    try {
      await gabi.admin.blockUser(userId)
      toast.success("Usuário bloqueado")
      fetchData()
    } catch {
      toast.error("Erro ao bloquear usuário")
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleModule = async (userId: string, currentModules: string[], module: string) => {
    const newModules = currentModules.includes(module)
      ? currentModules.filter(m => m !== module)
      : [...currentModules, module]
    setActionLoading(userId)
    try {
      await gabi.admin.updateModules(userId, newModules)
      fetchData()
    } catch {
      toast.error("Erro ao atualizar módulos")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId)
    try {
      await gabi.admin.updateRole(userId, newRole)
      toast.success("Role atualizada")
      fetchData()
    } catch {
      toast.error("Erro ao atualizar role")
    } finally {
      setActionLoading(null)
    }
  }

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

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão de usuários e sistema</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer bg-white/5 text-slate-400 hover:text-white transition-all duration-200"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Usuários", value: stats.users, icon: Users, color: "var(--color-gabi-primary)" },
            { label: "Pendentes", value: stats.pending_users, icon: Clock, color: "#fbbf24" },
            { label: "Documentos", value: stats.documents.total, icon: FileText, color: "var(--color-mod-law)" },
            { label: "DB Size", value: `${stats.database_size_mb} MB`, icon: Database, color: "var(--color-mod-ntalk)" },
            { label: "Ghost Docs", value: stats.documents.ghost, icon: FileText, color: "var(--color-mod-ghost)" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-[var(--radius-soft)] bg-[var(--color-surface-card)] tech-border p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
                <span className="text-xs text-slate-500 font-medium">{card.label}</span>
              </div>
              <p className="text-xl font-semibold">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending Users Alert */}
      {pendingUsers.length > 0 && (
        <div className="mb-6 rounded-[var(--radius-soft)] bg-amber-500/5 border border-amber-500/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              {pendingUsers.length} usuário{pendingUsers.length > 1 ? "s" : ""} aguardando aprovação
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-3 py-1.5">
                <span className="text-xs text-white">{u.email}</span>
                <button
                  onClick={() => handleApprove(u.id)}
                  disabled={actionLoading === u.id}
                  className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {actionLoading === u.id ? "..." : "Aprovar"}
                </button>
                <button
                  onClick={() => handleBlock(u.id)}
                  disabled={actionLoading === u.id}
                  className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Bloquear
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-[var(--radius-soft)] bg-[var(--color-surface-card)] tech-border overflow-hidden">
        <table className="data-grid">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Role</th>
              <th>Status</th>
              <th>Módulos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const statusCfg = STATUS_CONFIG[u.status] || STATUS_CONFIG.pending
              const StatusIcon = statusCfg.icon
              const isExpanded = expandedUser === u.id

              return (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {u.picture ? (
                        <img src={u.picture} alt="" className="w-6 h-6 rounded-full" />
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
                    {profile?.role === "superadmin" ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-transparent text-xs px-2 py-1 rounded border border-slate-700 cursor-pointer text-slate-300"
                      >
                        <option value="user" style={{ background: "#1a2332" }}>user</option>
                        <option value="admin" style={{ background: "#1a2332" }}>admin</option>
                        <option value="superadmin" style={{ background: "#1a2332" }}>superadmin</option>
                      </select>
                    ) : (
                      <span className="text-xs text-slate-400">{u.role}</span>
                    )}
                  </td>
                  <td>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium"
                      style={{ color: statusCfg.color, background: statusCfg.bg }}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 flex-wrap">
                      {u.status === "approved" && (u.allowed_modules || []).length > 0 ? (
                        (u.allowed_modules || []).map((mod) => (
                          <button
                            key={mod}
                            onClick={() => handleToggleModule(u.id, u.allowed_modules || [], mod)}
                            className="text-[0.6rem] px-1.5 py-0.5 rounded font-medium cursor-pointer transition-all hover:opacity-70"
                            style={{
                              color: MODULE_COLORS[mod] || "#94a3b8",
                              background: `${MODULE_COLORS[mod] || "#94a3b8"}15`,
                              border: `1px solid ${MODULE_COLORS[mod] || "#94a3b8"}30`,
                            }}
                            title={`Clique para remover ${MODULE_LABELS[mod] || mod}`}
                          >
                            {MODULE_LABELS[mod] || mod}
                          </button>
                        ))
                      ) : u.status === "approved" ? (
                        <span className="text-[0.6rem] text-slate-600">Nenhum módulo</span>
                      ) : (
                        <span className="text-[0.6rem] text-slate-600">—</span>
                      )}
                      {u.status === "approved" && (
                        <div className="relative">
                          <button
                            onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                            className="text-[0.6rem] w-5 h-5 rounded flex items-center justify-center bg-white/5 text-slate-500 hover:text-white cursor-pointer transition-colors"
                            title="Adicionar módulo"
                          >
                            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                          {isExpanded && (
                            <div className="absolute top-7 right-0 z-10 bg-[var(--color-surface-card)] tech-border rounded-lg shadow-xl p-2 min-w-[120px]">
                              {ALL_MODULES.filter(m => !(u.allowed_modules || []).includes(m)).map((mod) => (
                                <button
                                  key={mod}
                                  onClick={() => { handleToggleModule(u.id, u.allowed_modules || [], mod); setExpandedUser(null) }}
                                  className="block w-full text-left text-xs px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer transition-colors"
                                  style={{ color: MODULE_COLORS[mod] }}
                                >
                                  + {MODULE_LABELS[mod]}
                                </button>
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
                          <button
                            onClick={() => handleApprove(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleBlock(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Bloquear
                          </button>
                        </>
                      )}
                      {u.status === "blocked" && (
                        <button
                          onClick={() => handleApprove(u.id)}
                          disabled={actionLoading === u.id}
                          className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Desbloquear
                        </button>
                      )}
                      {u.status === "approved" && u.email !== "resper@ness.com.br" && (
                        <button
                          onClick={() => handleBlock(u.id)}
                          disabled={actionLoading === u.id}
                          className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Bloquear
                        </button>
                      )}
                      {actionLoading === u.id && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
                    </div>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="text-center text-slate-600 py-8">
                  Nenhum usuário cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
