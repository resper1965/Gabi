"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/auth-provider"
import { gabiOrg, type PlanInfo, type BillingInfo } from "@/lib/api"
import {
  Crown, Users, BarChart3, Wifi, Loader2, CheckCircle2,
  ArrowUp, Sparkles, Shield, Zap
} from "lucide-react"
import { toast } from "sonner"

const PLAN_META: Record<string, { color: string; icon: typeof Crown; desc: string }> = {
  trial:      { color: "#fbbf24", icon: Sparkles, desc: "14 dias grátis para explorar" },
  starter:    { color: "#38bdf8", icon: Zap,      desc: "Para times pequenos" },
  pro:        { color: "#818cf8", icon: Crown,     desc: "Para empresas em crescimento" },
  enterprise: { color: "#f472b6", icon: Shield,    desc: "Personalizado, sem limites" },
}

export default function BillingPage() {
  const { profile } = useAuth()
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [plans, setPlans] = useState<PlanInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [b, p] = await Promise.all([gabiOrg.billing(), gabiOrg.listPlans()])
      setBilling(b)
      setPlans(p)
    } catch {
      toast.error("Erro ao carregar billing")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleUpgrade = async (planName: string) => {
    setUpgrading(planName)
    try {
      await gabiOrg.upgrade(planName)
      toast.success(`Plano alterado para ${planName}!`)
      fetchData()
    } catch {
      toast.error("Erro ao alterar plano")
    } finally { setUpgrading(null) }
  }

  if (!profile?.org_id) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500 text-sm">Crie uma organização primeiro.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!billing) return null

  const currentPlan = billing.plan
  const opsPercent = currentPlan.max_ops_month > 0
    ? Math.min(100, (billing.current_usage.ops_count / currentPlan.max_ops_month) * 100) : 0

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Planos & Billing</h1>
        <p className="text-slate-500 text-sm mt-1">{billing.org_name}</p>
      </div>

      {/* Trial Banner */}
      {billing.trial_days_remaining !== null && (
        <div
          className="mb-6 rounded-2xl p-5 border"
          style={{
            background: billing.trial_days_remaining <= 7
              ? "rgba(239,68,68,0.05)" : "rgba(251,191,36,0.05)",
            borderColor: billing.trial_days_remaining <= 7
              ? "rgba(239,68,68,0.2)" : "rgba(251,191,36,0.2)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5"
                style={{ color: billing.trial_days_remaining <= 7 ? "#ef4444" : "#fbbf24" }}
              />
              <div>
                <p className="text-sm font-medium"
                  style={{ color: billing.trial_days_remaining <= 7 ? "#ef4444" : "#fbbf24" }}
                >
                  {billing.trial_days_remaining === 0
                    ? "Trial expirado"
                    : `Trial expira em ${billing.trial_days_remaining} dia${billing.trial_days_remaining !== 1 ? "s" : ""}`
                  }
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Faça upgrade para manter acesso completo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="rounded-2xl bg-[#1E293B] border border-[#334155] p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `${PLAN_META[currentPlan.name]?.color || "#94a3b8"}15`,
                border: `1px solid ${PLAN_META[currentPlan.name]?.color || "#94a3b8"}30`,
              }}
            >
              <Crown className="w-5 h-5" style={{ color: PLAN_META[currentPlan.name]?.color }} />
            </div>
            <div>
              <p className="text-lg font-semibold">
                Plano {currentPlan.name.charAt(0).toUpperCase() + currentPlan.name.slice(1)}
              </p>
              <p className="text-xs text-slate-500">{PLAN_META[currentPlan.name]?.desc}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: PLAN_META[currentPlan.name]?.color }}>
              {currentPlan.price_brl === 0 ? "Grátis" : `R$ ${currentPlan.price_brl.toFixed(0)}`}
            </p>
            {currentPlan.price_brl > 0 && <p className="text-xs text-slate-500">/mês</p>}
          </div>
        </div>

        {/* Usage Bar */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3 h-3 text-slate-500" />
              <span className="text-xs text-slate-500">Membros</span>
            </div>
            <p className="text-sm font-medium">
              {billing.members_count} / {currentPlan.max_seats === 0 ? "∞" : currentPlan.max_seats}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3 h-3 text-slate-500" />
              <span className="text-xs text-slate-500">Ops este mês</span>
            </div>
            <p className="text-sm font-medium">
              {billing.current_usage.ops_count} / {currentPlan.max_ops_month === 0 ? "∞" : currentPlan.max_ops_month}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Wifi className="w-3 h-3 text-slate-500" />
              <span className="text-xs text-slate-500">Sessões</span>
            </div>
            <p className="text-sm font-medium">
              {currentPlan.max_concurrent === 0 ? "∞" : currentPlan.max_concurrent} simultâneas
            </p>
          </div>
        </div>

        {/* Usage progress */}
        {currentPlan.max_ops_month > 0 && (
          <div className="mt-4">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${opsPercent}%`,
                  background: opsPercent > 80 ? "#ef4444" : opsPercent > 50 ? "#fbbf24" : "var(--color-gabi-primary)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Plan Comparison Grid */}
      <h2 className="text-lg font-semibold mb-4">Comparar planos</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {plans.filter(p => !p.is_trial).map((plan) => {
          const meta = PLAN_META[plan.name] || PLAN_META.starter
          const isCurrent = plan.name === currentPlan.name
          const PlanIcon = meta.icon

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 transition-all ${
                isCurrent
                  ? "border-opacity-50 bg-opacity-5"
                  : "border-[#334155] bg-[#1E293B] hover:border-slate-500"
              }`}
              style={{
                borderColor: isCurrent ? meta.color : undefined,
                background: isCurrent ? `${meta.color}08` : undefined,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <PlanIcon className="w-5 h-5" style={{ color: meta.color }} />
                <h3 className="text-sm font-semibold">{plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}</h3>
                {isCurrent && (
                  <span className="text-[0.6rem] px-2 py-0.5 rounded-full font-medium"
                    style={{ color: meta.color, background: `${meta.color}15` }}
                  >
                    Atual
                  </span>
                )}
              </div>

              <p className="text-2xl font-bold mb-1" style={{ color: meta.color }}>
                {plan.price_brl === 0 ? "Grátis" : `R$ ${plan.price_brl.toFixed(0)}`}
              </p>
              <p className="text-xs text-slate-500 mb-4">{meta.desc}</p>

              <ul className="space-y-2 text-xs text-slate-400 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: meta.color }} />
                  {plan.max_seats === 0 ? "Membros ilimitados" : `${plan.max_seats} membros`}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: meta.color }} />
                  {plan.max_ops_month === 0 ? "Ops ilimitadas" : `${plan.max_ops_month.toLocaleString()} ops/mês`}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: meta.color }} />
                  {plan.max_concurrent === 0 ? "Sessões ilimitadas" : `${plan.max_concurrent} sessões simultâneas`}
                </li>
              </ul>

              {!isCurrent && (
                <button
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={upgrading === plan.name}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${meta.color}, color-mix(in srgb, ${meta.color} 70%, black))`,
                    boxShadow: `0 4px 20px ${meta.color}30`,
                  }}
                >
                  {upgrading === plan.name ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                  {plan.price_brl > currentPlan.price_brl ? "Upgrade" : "Alterar"}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
