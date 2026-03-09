"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { gabiOrg, type BillingInfo } from "@/lib/api"
import { Sparkles, ArrowRight } from "lucide-react"

/**
 * Trial expiration banner.
 * Shows when < 14 days remaining on trial.
 * Dismissible per session.
 */
export function TrialBanner() {
  const { profile } = useAuth()
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!profile?.org_id) return
    gabiOrg.billing()
      .then(setBilling)
      .catch(() => {}) // silent fail
  }, [profile?.org_id])

  // Don't show if: no org, no billing, no trial, dismissed, or trial > 14 days
  if (!billing || billing.trial_days_remaining === null || billing.trial_days_remaining > 14 || dismissed) {
    return null
  }

  const isUrgent = billing.trial_days_remaining <= 3
  const color = isUrgent ? "#ef4444" : "#fbbf24"

  return (
    <div
      className="mx-4 mt-3 mb-0 rounded-xl px-4 py-2.5 flex items-center gap-3 border animate-fade-in"
      style={{
        background: `${color}08`,
        borderColor: `${color}25`,
      }}
    >
      <Sparkles className="w-4 h-4 shrink-0" style={{ color }} />
      <p className="text-xs flex-1" style={{ color }}>
        {billing.trial_days_remaining === 0
          ? "Trial expirado"
          : `Trial expira em ${billing.trial_days_remaining} dia${billing.trial_days_remaining !== 1 ? "s" : ""}`}
      </p>
      <Link
        href="/org/billing"
        className="text-[0.65rem] font-medium px-2 py-1 rounded-lg flex items-center gap-1 transition-colors hover:opacity-80"
        style={{ color, background: `${color}15` }}
      >
        Upgrade <ArrowRight className="w-3 h-3" />
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="text-slate-600 hover:text-slate-400 text-xs cursor-pointer"
      >
        ✕
      </button>
    </div>
  )
}
