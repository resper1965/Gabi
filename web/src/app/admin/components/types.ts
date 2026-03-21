export interface UserInfo {
  id: string; firebase_uid: string; email: string; name: string | null
  picture: string | null; role: string; status: string
  allowed_modules: string[]; is_active: boolean; created_at: string | null
}
export interface Stats {
  users: number; pending_users: number
  documents: { ghost: number; law: number; total: number }
  database_size_mb: number
}
export interface SeedPack {
  id: string; name: string; description: string; module: string
  dir: string; installed_count: number; last_updated: string | null
}
export interface PlatformOrgRow {
  id: string; name: string; cnpj: string | null; sector: string | null
  domain: string | null; plan: string; member_count: number
  ops_this_month: number; is_active: boolean; created_at: string
}
export interface FinOpsSummary {
  period: string; total_cost_usd: number; total_tokens: number
  total_requests: number; avg_cost_per_request: number
  projected_monthly_usd: number
  by_module: { module: string; cost_usd: number; tokens: number; requests: number }[]
  by_model: { model: string; cost_usd: number; requests: number }[]
  daily_burn: { day: string; cost_usd: number; requests: number }[]
}
export interface FinOpsOrg {
  org_id: string; org_name: string; cost_usd: number; tokens: number; requests: number
}

export const ALL_MODULES = ["law"]
export const MODULE_LABELS: Record<string, string> = { law: "Legal" }
export const MODULE_COLORS: Record<string, string> = {
  law: "var(--color-mod-law)",
}
export const PLAN_COLORS: Record<string, string> = {
  trial: "#fbbf24", starter: "#38bdf8", pro: "#818cf8", enterprise: "#f472b6",
}
export const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  approved: { color: "#34d399", bg: "rgba(52,211,153,0.1)", label: "Aprovado", icon: "CheckCircle2" },
  pending: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", label: "Pendente", icon: "Clock" },
  blocked: { color: "#f87171", bg: "rgba(248,113,113,0.1)", label: "Bloqueado", icon: "XCircle" },
}
