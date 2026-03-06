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
 */
async function streamRequest(path: string, body: unknown): Promise<ReadableStreamDefaultReader<Uint8Array>> {
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
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }

  if (!res.body) throw new Error("No response body for stream")
  return res.body.getReader()
}

// ── gabi.writer ──

export const gabiWriter = {
  profiles: () => request("/api/ghost/profiles"),
  createProfile: (data: { name: string }) => request("/api/ghost/profiles", { method: "POST", body: JSON.stringify(data) }),
  extractStyle: (profileId: string) => request(`/api/ghost/profiles/${profileId}/extract-style`, { method: "POST" }),
  generate: (data: { profile_id: string; prompt: string; chat_history?: Array<{ role: string; content: string }> }) =>
    request("/api/ghost/generate", { method: "POST", body: JSON.stringify(data) }),
  generateStream: (data: { profile_id: string; prompt: string; chat_history?: Array<{ role: string; content: string }> }) =>
    streamRequest("/api/ghost/generate-stream", data),
  upload: (profileId: string, docType: string, file: File) =>
    uploadFile("/api/ghost/upload", file, { profile_id: profileId, doc_type: docType }),
  documents: (profileId?: string) =>
    request(`/api/ghost/documents${profileId ? `?profile_id=${profileId}` : ""}`),
  deleteDocument: (docId: string) =>
    request(`/api/ghost/documents/${docId}`, { method: "DELETE" }),
}

// ── gabi.legal ──

export const gabiLegal = {
  agent: (data: { agent: string; query: string; document_text?: string; chat_history?: ChatMessage[] }) =>
    request<AgentResponse>("/api/law/agent", { method: "POST", body: JSON.stringify(data) }),
  documents: () => request<DocumentInfo[]>("/api/law/documents"),
  alerts: () => request<AlertInfo[]>("/api/law/alerts"),
  upload: (docType: string, file: File, title?: string) =>
    uploadFile<UploadResult>("/api/law/upload", file, { doc_type: docType, ...(title ? { title } : {}) }),
  insights: (authority?: string) =>
    request<InsightInfo[]>(`/api/law/insights${authority ? `?authority=${authority}` : ""}`),
}

// ── gabi.data ──

export const gabiData = {
  ask: (data: { tenant_id: string; question: string; chat_history?: Array<{ role: string; content: string }>; summary?: string }) =>
    request("/api/ntalk/ask", { method: "POST", body: JSON.stringify(data) }),
  addTerm: (tenantId: string, term: string, definition: string) =>
    request("/api/ntalk/dictionary", { method: "POST", body: JSON.stringify({ tenant_id: tenantId, term, definition }) }),
  registerConnection: (data: { tenant_id: string; name: string; host: string; port?: number; db_name: string; username: string; secret_manager_ref: string }) =>
    request("/api/ntalk/connections", { method: "POST", body: JSON.stringify(data) }),
  syncSchema: (tenantId: string) =>
    request(`/api/ntalk/connections/${tenantId}/schema-sync`, { method: "POST" }),
}

// ── gabi.care → consolidated into gabi.legal ──
// Insurance methods now route through /api/law/* endpoints

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

// Unified export — 3 modules: writer, legal, data
export const gabi = {
  // Branded names
  writer: gabiWriter,
  legal: gabiLegal,
  data: gabiData,
  // Module names (aliases)
  ghost: gabiWriter,
  law: gabiLegal,
  ntalk: gabiData,
  // Backward compat: care/insightcare → legal
  care: gabiLegal,
  insightcare: gabiLegal,
  // Shared
  admin: gabiAdmin,
  auth: gabiAuth,
  chat: gabiChat,
}

