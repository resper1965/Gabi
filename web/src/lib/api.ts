import { auth } from "./firebase"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ── Response Types ──

export interface AgentResponse {
  agent: string
  result: Record<string, unknown> | string
  response: unknown
  sources_used: number
  sources: Array<{ title: string; type: string }>
  dynamic_rag: boolean
  orchestration: { agents: string[]; reason: string } | null
  summary: string | null
}

export interface DocumentInfo {
  id: string
  filename: string
  title: string | null
  type: string
  chunks: number
  area_direito: string | null
  tema: string | null
  resumo_ia: string | null
}

export interface AlertInfo {
  id: string
  title: string
  source: string
  severity: string
  is_read: boolean
}

export interface UploadResult {
  document_id?: string
  filename: string
  chunk_count: number
  char_count?: number
  file_size?: number
  error?: string
  classification?: {
    tipo: string
    area_direito: string | null
    tema: string | null
    resumo_ia: string | null
  }
}

export interface InsightInfo {
  id: number
  doc_id: number
  authority: string
  tipo_ato: string
  numero: string
  resumo_executivo: string | null
  risco_nivel: string
  risco_justificativa: string | null
  analisado_em: string
  extra_data: Record<string, unknown>
}

export interface UserStats {
  total_users: number
  active_users: number
  pending_users: number
}

export interface ChatMessage {
  role: string
  content: string
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const user = auth.currentUser
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  }

  if (user) {
    const token = await user.getIdToken()
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }

  return res.json()
}

async function uploadFile<T = unknown>(path: string, file: File, params: Record<string, string> = {}): Promise<T> {
  const user = auth.currentUser
  const headers: Record<string, string> = {}

  if (user) {
    const token = await user.getIdToken()
    headers["Authorization"] = `Bearer ${token}`
  }

  // Build query string from params
  const qs = new URLSearchParams(params).toString()
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ""}`

  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch(url, { method: "POST", headers, body: formData })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Upload ${res.status}: ${body}`)
  }

  return res.json()
}

/**
 * Stream a POST request as SSE (Server-Sent Events).
 * Returns a reader that yields text chunks.
 * Accepts an optional AbortSignal to allow mid-stream cancellation.
 */
async function streamRequest(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const user = auth.currentUser
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (user) {
    const token = await user.getIdToken()
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }

  if (!res.body) throw new Error("No response body for stream")
  return res.body.getReader()
}

// ── Style Profiles (integrated into law module) ──

export const gabiStyle = {
  profiles: () => request("/api/law/style/profiles"),
  createProfile: (data: { name: string }) => request("/api/law/style/profiles", { method: "POST", body: JSON.stringify(data) }),
  extractStyle: (profileId: string) => request(`/api/law/style/profiles/${profileId}/extract-style`, { method: "POST" }),
  upload: (profileId: string, docType: string, file: File) =>
    uploadFile("/api/law/style/upload", file, { profile_id: profileId, doc_type: docType }),
  documents: (profileId?: string) =>
    request(`/api/law/style/documents${profileId ? `?profile_id=${profileId}` : ""}`),
  deleteDocument: (docId: string) =>
    request(`/api/law/style/documents/${docId}`, { method: "DELETE" }),
}

// ── gabi.legal ──

export const gabiLegal = {
  agent: (data: { agent: string; query: string; document_text?: string; chat_history?: ChatMessage[]; style_profile_id?: string }) =>
    request<AgentResponse>("/api/law/agent", { method: "POST", body: JSON.stringify(data) }),
  agentStream: (data: { agent: string; query: string; document_text?: string; chat_history?: ChatMessage[]; style_profile_id?: string }, signal?: AbortSignal) =>
    streamRequest("/api/law/agent-stream", data, signal),
  documents: () => request<DocumentInfo[]>("/api/law/documents"),
  alerts: () => request<AlertInfo[]>("/api/law/alerts"),
  upload: (file: File, docType?: string, title?: string) =>
    uploadFile<UploadResult>("/api/law/upload", file, {
      ...(docType ? { doc_type: docType } : {}),
      ...(title ? { title } : {}),
    }),
  presentation: async (documentIds: string[], title?: string): Promise<Blob> => {
    const user = auth.currentUser
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (user) headers["Authorization"] = `Bearer ${await user.getIdToken()}`
    const res = await fetch(`${API_BASE}/api/law/presentation`, {
      method: "POST",
      headers,
      body: JSON.stringify({ document_ids: documentIds, ...(title ? { title } : {}) }),
    })
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
    return res.blob()
  },
  insights: (authority?: string) =>
    request<InsightInfo[]>(`/api/law/insights${authority ? `?authority=${authority}` : ""}`),
  insightStats: () =>
    request<{
      total_docs: number
      total_insights: number
      risk_counts: { Alto: number; "Médio": number; Baixo: number }
      authority_counts: Record<string, number>
      new_7d: number
      last_update: string | null
      timeline: Array<{ label: string; week_start: string; week_end: string; alto: number; medio: number; baixo: number; total: number }>
    }>("/api/law/insights/stats"),
}

// ── Admin ──

export const gabiAdmin = {
  users: () => request("/api/admin/users"),
  stats: () => request("/api/admin/stats"),
  analytics: () => request("/api/admin/analytics"),
  updateRole: (userId: string, role: string) =>
    request(`/api/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  approveUser: (userId: string, allowedModules: string[]) =>
    request(`/api/admin/users/${userId}/approve`, { method: "PATCH", body: JSON.stringify({ allowed_modules: allowedModules }) }),
  blockUser: (userId: string) =>
    request(`/api/admin/users/${userId}/block`, { method: "PATCH" }),
  updateModules: (userId: string, allowedModules: string[]) =>
    request(`/api/admin/users/${userId}/modules`, { method: "PATCH", body: JSON.stringify({ allowed_modules: allowedModules }) }),
  updateStatus: (userId: string, isActive: boolean) =>
    request(`/api/admin/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ is_active: isActive }) }),
  // Regulatory Seed Packs
  regulatoryPacks: () => request("/api/admin/regulatory/packs"),
  seedRegulatory: (packs: string[], force = false) =>
    request("/api/admin/regulatory/seed", { method: "POST", body: JSON.stringify({ packs, force }) }),
  removeSeedPack: (packId: string) =>
    request(`/api/admin/regulatory/seed/${packId}`, { method: "DELETE" }),
  // Regulatory Ingestion Pipeline
  triggerIngest: () =>
    request("/api/admin/regulatory/ingest", { method: "POST" }),
  // RAG Knowledge Manager
  regulatoryBases: () =>
    request<{ law_documents: Record<string, unknown>[]; regulatory_insights: Record<string, unknown>[] }>("/api/admin/regulatory/bases"),
  simulateRag: (query: string, module = "law") =>
    request("/api/admin/regulatory/simulate-rag", { method: "POST", body: JSON.stringify({ query, module }) }),
}

// ── Chat History ──

export const gabiChat = {
  sessions: (module?: string) => request(`/api/chat/sessions${module ? `?module=${module}` : ""}`),
  messages: (sessionId: string) => request(`/api/chat/sessions/${sessionId}/messages`),
  exportMd: (sessionId: string) => request<{ markdown: string; title: string }>(`/api/chat/sessions/${sessionId}/export`),
  deleteSession: (sessionId: string) => request(`/api/chat/sessions/${sessionId}`, { method: "DELETE" }),
}

// ── Auth ──

export const gabiAuth = {
  me: () => request("/api/auth/me"),
}

// ── Org Management ──

export interface OrgInfo {
  id: string
  name: string
  cnpj: string | null
  sector: string | null
  domain: string | null
  plan: string
  is_active: boolean
  trial_expires_at: string | null
  members: Array<{ id: string; email: string; role: string; joined_at: string | null }>
  modules: Array<{ module: string; enabled: boolean }>
  usage: { ops_count: number; month: string } | null
  limits: { max_seats: number; max_ops_month: number; max_concurrent: number } | null
}

export interface PlatformOrgInfo {
  id: string
  name: string
  cnpj: string | null
  sector: string | null
  domain: string | null
  plan: string
  member_count: number
  ops_this_month: number
  trial_expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface PlatformStats {
  total_orgs: number
  total_users: number
  ops_this_month: number
  active_sessions: number
}

export interface PlanInfo {
  id: string
  name: string
  max_seats: number
  max_ops_month: number
  max_concurrent: number
  price_brl: number
  is_trial: boolean
}

export interface BillingInfo {
  plan: PlanInfo
  org_name: string
  trial_days_remaining: number | null
  trial_expires_at: string | null
  current_usage: { ops_count: number; month: string }
  members_count: number
}

export const gabiOrg = {
  getMyOrg: () => request<{ org: OrgInfo | null }>("/api/orgs/me"),
  createOrg: (data: { name: string; modules?: string[]; sector?: string; cnpj?: string }) =>
    request("/api/orgs", { method: "POST", body: JSON.stringify(data) }),
  updateOrg: (data: { name?: string; cnpj?: string; sector?: string; domain?: string }) =>
    request("/api/orgs/me", { method: "PATCH", body: JSON.stringify(data) }),
  sendInvite: (data: { email: string; role?: string }) =>
    request("/api/orgs/invite", { method: "POST", body: JSON.stringify(data) }),
  joinByToken: (token: string) =>
    request("/api/orgs/join", { method: "POST", body: JSON.stringify({ token }) }),
  getUsage: () => request("/api/orgs/usage"),
  // Billing
  listPlans: () => request<PlanInfo[]>("/api/orgs/plans"),
  billing: () => request<BillingInfo>("/api/orgs/billing"),
  upgrade: (planName: string) =>
    request("/api/orgs/upgrade", { method: "POST", body: JSON.stringify({ plan_name: planName }) }),
}

// ── Platform Admin ──

export const gabiPlatform = {
  stats: () => request<PlatformStats>("/api/platform/stats"),
  listOrgs: (limit = 50, offset = 0) =>
    request<{ orgs: PlatformOrgInfo[]; total: number; limit: number; offset: number }>(
      `/api/platform/orgs?limit=${limit}&offset=${offset}`
    ),
  provisionOrg: (data: { org_name: string; owner_email: string; plan?: string; modules?: string[]; sector?: string; cnpj?: string }) =>
    request("/api/platform/orgs", { method: "POST", body: JSON.stringify(data) }),
  changePlan: (orgId: string, planName: string) =>
    request(`/api/platform/orgs/${orgId}/plan`, { method: "PATCH", body: JSON.stringify({ plan_name: planName }) }),
  getOrg: (orgId: string) =>
    request(`/api/platform/orgs/${orgId}`),
  deactivateOrg: (orgId: string) =>
    request(`/api/platform/orgs/${orgId}/deactivate`, { method: "PATCH" }),
  activateOrg: (orgId: string) =>
    request(`/api/platform/orgs/${orgId}/activate`, { method: "PATCH" }),
  getOrgMembers: (orgId: string) =>
    request(`/api/platform/orgs/${orgId}/members`),
  // FinOps
  finopsSummary: () =>
    request("/api/platform/finops/summary"),
  finopsByOrg: () =>
    request("/api/platform/finops/by-org"),
}

// Unified export — law module (7 agents) + shared services
export const gabi = {
  // Core
  legal: gabiLegal,
  style: gabiStyle,
  // Aliases
  law: gabiLegal,
  writer: gabiStyle,
  // Shared
  admin: gabiAdmin,
  auth: gabiAuth,
  chat: gabiChat,
  org: gabiOrg,
  platform: gabiPlatform,
}
