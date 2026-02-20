"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/auth-provider"
import { gabi } from "@/lib/api"
import { Users, FileText, Database, Shield, RefreshCw, Loader2 } from "lucide-react"

interface UserInfo {
  id: string
  email: string
  name: string | null
  role: string
  is_active: boolean
  created_at: string | null
}

interface Stats {
  users: number
  documents: { ghost: number; law: number; insightcare: number; total: number }
  database_size_mb: number
}

const ROLES = ["user", "ghost", "law", "ntalk", "insightcare", "admin"]

const roleColors: Record<string, string> = {
  admin: "#ef4444",
  ghost: "var(--color-mod-ghost)",
  law: "var(--color-mod-law)",
  ntalk: "var(--color-mod-ntalk)",
  insightcare: "var(--color-mod-insightcare)",
  user: "#94a3b8",
}

export default function AdminPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserInfo[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

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
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRoleChange = async (userId: string, newRole: string) => {
    await gabi.admin.updateRole(userId, newRole)
    fetchData()
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

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in-up">
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
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Usuários", value: stats.users, icon: Users, color: "var(--color-gabi-primary)" },
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

      {/* Users Table */}
      <div className="rounded-[var(--radius-soft)] bg-[var(--color-surface-card)] tech-border overflow-hidden">
        <table className="data-grid">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nome</th>
              <th>Role</th>
              <th>Status</th>
              <th>Criado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="text-white">{u.email}</td>
                <td>{u.name || "—"}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="bg-transparent text-xs px-2 py-1 rounded border cursor-pointer"
                    style={{
                      color: roleColors[u.role] || "#94a3b8",
                      borderColor: `${roleColors[u.role] || "#94a3b8"}40`,
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} style={{ background: "#1a2332", color: "#e2e8f0" }}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className={`inline-flex items-center gap-1 text-xs ${u.is_active ? "text-green-400" : "text-red-400"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-green-400" : "bg-red-400"}`} />
                    {u.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="text-slate-500">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
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
