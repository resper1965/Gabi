"use client"

import { useState, useEffect, useCallback } from "react"
import { gabiPlatform } from "@/lib/api"
import { Building2, ChevronLeft, ChevronRight, Crown, Loader2, Power, PowerOff } from "lucide-react"
import { toast } from "sonner"
import { PlatformOrgRow, PLAN_COLORS } from "./types"

interface AdminOrgsTabProps {
  isSuperadmin: boolean
  refreshKey: number
}

export default function AdminOrgsTab({ isSuperadmin, refreshKey }: AdminOrgsTabProps) {
  const [orgs, setOrgs] = useState<PlatformOrgRow[]>([])
  const [orgsTotal, setOrgsTotal] = useState(0)
  const [orgsPage, setOrgsPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [changingPlan, setChangingPlan] = useState<string | null>(null)
  const [orgAction, setOrgAction] = useState<string | null>(null)
  const orgsLimit = 20

  const fetchOrgs = useCallback(async () => {
    if (!isSuperadmin) return
    setLoading(true)
    try {
      const res = await gabiPlatform.listOrgs(orgsLimit, orgsPage * orgsLimit) as { orgs: PlatformOrgRow[]; total: number }
      setOrgs(res.orgs)
      setOrgsTotal(res.total)
    } catch {
      toast.error("Erro ao carregar organizações")
    } finally {
      setLoading(false)
    }
  }, [isSuperadmin, orgsPage])

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs, refreshKey])

  const handleChangePlan = async (orgId: string, plan: string) => {
    setChangingPlan(orgId)
    try {
      await gabiPlatform.changePlan(orgId, plan)
      toast.success(`Plano → ${plan}`)
      fetchOrgs()
    } catch {
      toast.error("Erro ao alterar plano")
    } finally {
      setChangingPlan(null)
    }
  }

  const handleToggleOrg = async (orgId: string, active: boolean) => {
    setOrgAction(orgId)
    try {
      if (active) await gabiPlatform.deactivateOrg(orgId)
      else await gabiPlatform.activateOrg(orgId)
      toast.success(active ? "Org desativada" : "Org ativada")
      fetchOrgs()
    } catch {
      toast.error("Erro ao alterar status")
    } finally {
      setOrgAction(null)
    }
  }

  return (
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
              {orgsPage * orgsLimit + 1}–{Math.min((orgsPage + 1) * orgsLimit, Math.max(orgsTotal, 1))} de {orgsTotal}
            </span>
            <button onClick={() => setOrgsPage(Math.max(0, orgsPage - 1))} disabled={orgsPage === 0 || loading}
              className="p-1 rounded hover:bg-white/5 text-slate-500 disabled:opacity-30 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setOrgsPage(orgsPage + 1)} disabled={(orgsPage + 1) * orgsLimit >= orgsTotal || loading}
              className="p-1 rounded hover:bg-white/5 text-slate-500 disabled:opacity-30 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {loading && orgs.length === 0 ? (
           <div className="flex items-center justify-center py-12">
             <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
           </div>
        ) : (
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
            <tbody className={loading ? "opacity-50 pointer-events-none" : ""}>
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
        )}
      </div>
    </div>
  )
}
