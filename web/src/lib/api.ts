import { auth } from "./firebase"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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

// ── gabi.writer ──

export const gabiWriter = {
  profiles: () => request("/api/ghost/profiles"),
  createProfile: (name: string) => request("/api/ghost/profiles", { method: "POST", body: JSON.stringify({ name }) }),
  extractStyle: (profileId: string) => request(`/api/ghost/profiles/${profileId}/extract-style`, { method: "POST" }),
  generate: (data: { profile_id: string; prompt: string; chat_history?: Array<{ role: string; content: string }> }) =>
    request("/api/ghost/generate", { method: "POST", body: JSON.stringify(data) }),
  upload: (profileId: string, docType: string, file: File) =>
    uploadFile("/api/ghost/upload", file, { profile_id: profileId, doc_type: docType }),
}

// ── gabi.legal ──

export const gabiLegal = {
  agent: (data: { agent: string; query: string; document_text?: string; chat_history?: Array<{ role: string; content: string }> }) =>
    request("/api/law/agent", { method: "POST", body: JSON.stringify(data) }),
  documents: () => request("/api/law/documents"),
  alerts: () => request("/api/law/alerts"),
  upload: (docType: string, file: File, title?: string) =>
    uploadFile("/api/law/upload", file, { doc_type: docType, ...(title ? { title } : {}) }),
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

// ── gabi.care ──

export const gabiCare = {
  chat: (data: { tenant_id: string; agent: string; question: string; client_id?: string; chat_history?: Array<{ role: string; content: string }>; summary?: string }) =>
    request("/api/insightcare/chat", { method: "POST", body: JSON.stringify(data) }),
  clients: (tenantId: string) => request(`/api/insightcare/clients/${tenantId}`),
  policies: (tenantId: string, clientId?: string) => request(`/api/insightcare/policies/${tenantId}${clientId ? `?client_id=${clientId}` : ""}`),
  documents: (tenantId: string) => request(`/api/insightcare/documents/${tenantId}`),
  upload: (tenantId: string, docType: string, file: File, clientId?: string) =>
    uploadFile("/api/insightcare/upload", file, { tenant_id: tenantId, doc_type: docType, ...(clientId ? { client_id: clientId } : {}) }),
}

// ── Admin ──

export const gabiAdmin = {
  users: () => request("/api/admin/users"),
  stats: () => request("/api/admin/stats"),
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
}

// ── Auth ──

export const gabiAuth = {
  me: () => request("/api/auth/me"),
}

// Unified export
export const gabi = {
  writer: gabiWriter,
  legal: gabiLegal,
  data: gabiData,
  care: gabiCare,
  admin: gabiAdmin,
  auth: gabiAuth,
  ghost: gabiWriter,
  law: gabiLegal,
  ntalk: gabiData,
  insightcare: gabiCare,
}
