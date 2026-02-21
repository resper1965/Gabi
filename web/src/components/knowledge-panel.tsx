"use client"

import { useState, useEffect, useCallback } from "react"
import {
  PanelRightClose,
  PanelRightOpen,
  FileText,
  Trash2,
  Sparkles,
  Plus,
  ChevronDown,
  Loader2,
  CheckCircle,
} from "lucide-react"
import { gabi } from "@/lib/api"
import { MassUploadZone } from "./mass-upload-zone"
import { toast } from "sonner"

export interface GhostDocument {
  id: string
  filename: string
  doc_type: "style" | "content"
  chunk_count: number
  file_size: number
  profile_id: string | null
  created_at: string | null
}

export interface GhostProfile {
  id: string
  name: string
  samples: number
  has_signature: boolean
}

interface KnowledgePanelProps {
  isOpen: boolean
  onToggle: () => void
  moduleAccent?: string
  onProfileChange?: (profileId: string) => void
  activeProfileId?: string
}

export function KnowledgePanel({
  isOpen,
  onToggle,
  moduleAccent = "var(--color-mod-ghost)",
  onProfileChange,
  activeProfileId,
}: KnowledgePanelProps) {
  const [profiles, setProfiles] = useState<GhostProfile[]>([])
  const [documents, setDocuments] = useState<GhostDocument[]>([])
  const [profileId, setProfileId] = useState(activeProfileId || "")
  const [docType, setDocType] = useState<"style" | "content">("content")
  const [loading, setLoading] = useState(false)
  const [showNewProfile, setShowNewProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const fetchProfiles = useCallback(async () => {
    try {
      const data = (await gabi.writer.profiles()) as GhostProfile[]
      setProfiles(data)
      if (!profileId && data.length > 0) {
        setProfileId(data[0].id)
        onProfileChange?.(data[0].id)
      }
    } catch { /* silent */ }
  }, [profileId, onProfileChange])

  const fetchDocuments = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    try {
      const data = (await gabi.writer.documents(profileId)) as GhostDocument[]
      setDocuments(data)
    } catch { /* silent */ }
    setLoading(false)
  }, [profileId])

  useEffect(() => { void fetchProfiles() }, [fetchProfiles])
  useEffect(() => { if (profileId) void fetchDocuments() }, [profileId, fetchDocuments])

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return
    try {
      const res = (await gabi.writer.createProfile({ name: newProfileName.trim() })) as { id: string }
      setProfileId(res.id)
      onProfileChange?.(res.id)
      setNewProfileName("")
      setShowNewProfile(false)
      await fetchProfiles()
      toast.success("Perfil criado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro")
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    try {
      await gabi.writer.deleteDocument(docId)
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
      toast.success("Documento removido")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro")
    }
  }

  const handleExtractStyle = async () => {
    if (!profileId) return
    setExtracting(true)
    try {
      await gabi.writer.extractStyle(profileId)
      toast.success("✨ Style Signature extraída!")
      await fetchProfiles()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na extração")
    }
    setExtracting(false)
  }



  const styleDocs = documents.filter((d) => d.doc_type === "style")
  const contentDocs = documents.filter((d) => d.doc_type === "content")
  const currentProfile = profiles.find((p) => p.id === profileId)
  const hasStyleDocs = styleDocs.length > 0
  const hasSignature = currentProfile?.has_signature ?? false

  // Toggle button (always visible)
  const toggleButton = (
    <button
      onClick={onToggle}
      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer"
      title={isOpen ? "Fechar painel" : "Base de Conhecimento"}
    >
      {isOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
    </button>
  )

  if (!isOpen) return toggleButton

  return (
    <>
      {toggleButton}
      <div
        className="w-[320px] h-full flex flex-col animate-slide-in"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Header */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Base de Conhecimento
            </h3>
          </div>

          {/* Profile Selector */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg tech-border bg-[var(--color-surface-card)] text-sm cursor-pointer"
            >
              <span className="text-white truncate">
                {currentProfile?.name || "Selecione um perfil"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {profileOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--color-surface-raised)] rounded-lg tech-border shadow-lg overflow-hidden">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProfileId(p.id)
                      onProfileChange?.(p.id)
                      setProfileOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                      p.id === profileId ? "text-white bg-white/5" : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{p.name}</span>
                      {p.has_signature && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => { setShowNewProfile(true); setProfileOpen(false) }}
                  className="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  style={{ color: moduleAccent }}
                >
                  <Plus className="w-3 h-3" /> Novo perfil
                </button>
              </div>
            )}
          </div>

          {/* New profile inline form */}
          {showNewProfile && (
            <div className="mt-2 flex gap-1.5">
              <input
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProfile()}
                placeholder="Nome do perfil"
                className="flex-1 text-xs bg-black/20 rounded-lg px-3 py-1.5 text-white placeholder:text-slate-600 focus:outline-none tech-border"
                autoFocus
              />
              <button
                onClick={handleCreateProfile}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer"
                style={{ background: moduleAccent }}
              >
                Criar
              </button>
              <button
                onClick={() => setShowNewProfile(false)}
                className="px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Documents list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
            </div>
          ) : (
            <>
              {/* Style docs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                    Estilo ({styleDocs.length})
                  </span>
                </div>
                {styleDocs.length === 0 ? (
                  <p className="text-[11px] text-slate-600 italic">Nenhum documento de estilo</p>
                ) : (
                  <div className="space-y-1">
                    {styleDocs.map((doc) => (
                      <DocRow key={doc.id} doc={doc} onDelete={handleDeleteDoc} accent={moduleAccent} />
                    ))}
                  </div>
                )}
              </div>

              {/* Content docs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                    Conteúdo ({contentDocs.length})
                  </span>
                </div>
                {contentDocs.length === 0 ? (
                  <p className="text-[11px] text-slate-600 italic">Nenhum documento de conteúdo</p>
                ) : (
                  <div className="space-y-1">
                    {contentDocs.map((doc) => (
                      <DocRow key={doc.id} doc={doc} onDelete={handleDeleteDoc} accent={moduleAccent} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom: Upload zone + Extract */}
        <div className="px-4 py-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Extract Style button */}
          {hasStyleDocs && !hasSignature && (
            <button
              onClick={handleExtractStyle}
              disabled={extracting}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${moduleAccent}, color-mix(in srgb, ${moduleAccent} 70%, black))`,
                color: "white",
                opacity: extracting ? 0.6 : 1,
              }}
            >
              {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {extracting ? "Extraindo..." : "Extrair Estilo ✨"}
            </button>
          )}

          {hasSignature && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px]">
              <CheckCircle className="w-3 h-3" />
              Style Signature ativa
            </div>
          )}

          <MassUploadZone
            onUpload={async (file) => {
              const res = await gabi.writer.upload(profileId, docType, file)
              return res as { chunk_count?: number }
            }}
            docType={docType}
            docTypeOptions={[
              { key: "style", label: "✍️ Estilo" },
              { key: "content", label: "📚 Conteúdo" },
            ]}
            onDocTypeChange={(t) => setDocType(t as "style" | "content")}
            moduleAccent={moduleAccent}
            onComplete={fetchDocuments}
          />
        </div>
      </div>
    </>
  )
}

function DocRow({ doc, onDelete, accent }: { doc: GhostDocument; onDelete: (id: string) => void; accent: string }) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
      <FileText className="w-3 h-3 shrink-0" style={{ color: accent, opacity: 0.5 }} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-300 truncate">{doc.filename}</p>
        <p className="text-[9px] text-slate-600">{doc.chunk_count} chunks · {formatSize(doc.file_size)}</p>
      </div>
      <button
        onClick={() => onDelete(doc.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 transition-all cursor-pointer"
        title="Remover"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}
