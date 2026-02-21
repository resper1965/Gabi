"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react"
import { toast } from "sonner"

interface UploadItem {
  file: File
  status: "pending" | "uploading" | "done" | "error"
  error?: string
}

interface MassUploadZoneProps {
  /** Generic upload handler — receives a file, returns anything with optional chunk_count */
  onUpload: (file: File) => Promise<{ chunk_count?: number; [key: string]: unknown }>
  /** Optional doc type toggle labels */
  docType?: string
  docTypeOptions?: { key: string; label: string }[]
  onDocTypeChange?: (type: string) => void
  moduleAccent?: string
  onComplete?: () => void
  /** File accept filter */
  accept?: string
  /** Description text below the drop zone */
  acceptLabel?: string
}

const MAX_CONCURRENT = 3

export function MassUploadZone({
  onUpload,
  docType,
  docTypeOptions,
  onDocTypeChange,
  moduleAccent = "var(--color-mod-ghost)",
  onComplete,
  accept = ".pdf,.docx,.txt,.md",
  acceptLabel = "PDF, DOCX, TXT, MD — múltiplos arquivos",
}: MassUploadZoneProps) {
  const [queue, setQueue] = useState<UploadItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processQueue = useCallback(async (items: UploadItem[]) => {
    setIsProcessing(true)
    const results = { success: 0, failed: 0, totalChunks: 0 }

    // Process in batches of MAX_CONCURRENT
    for (let i = 0; i < items.length; i += MAX_CONCURRENT) {
      const batch = items.slice(i, i + MAX_CONCURRENT)

      await Promise.all(
        batch.map(async (item) => {
          const idx = items.indexOf(item)
          setQueue((prev) =>
            prev.map((q, j) => (j === idx ? { ...q, status: "uploading" } : q))
          )

          try {
            const res = await onUpload(item.file)
            results.success++
            results.totalChunks += res.chunk_count || 0
            setQueue((prev) =>
              prev.map((q, j) => (j === idx ? { ...q, status: "done" } : q))
            )
          } catch (e) {
            results.failed++
            const msg = e instanceof Error ? e.message : "Erro"
            setQueue((prev) =>
              prev.map((q, j) => (j === idx ? { ...q, status: "error", error: msg } : q))
            )
          }
        })
      )
    }

    setIsProcessing(false)

    // Summary toast
    if (results.failed === 0) {
      toast.success(`✅ ${results.success} documentos indexados (${results.totalChunks} chunks)`)
    } else {
      toast.warning(`${results.success} OK, ${results.failed} falharam`)
    }

    // Clear queue after 3s delay
    setTimeout(() => {
      setQueue([])
      onComplete?.()
    }, 3000)
  }, [onUpload, onComplete])

  const addFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const newItems: UploadItem[] = Array.from(files).map((file) => ({
      file,
      status: "pending" as const,
    }))
    setQueue(newItems)
    processQueue(newItems)
  }, [processQueue])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const done = queue.filter((q) => q.status === "done").length
  const total = queue.length

  return (
    <div className="space-y-3">
      {/* Doc type toggle */}
      {onDocTypeChange && docTypeOptions && docTypeOptions.length > 0 && (
        <div className="flex gap-1 p-0.5 rounded-lg bg-black/20">
          {docTypeOptions.map((t) => (
            <button
              key={t.key}
              onClick={() => onDocTypeChange(t.key)}
              className={`flex-1 text-xs py-1.5 px-3 rounded-md font-medium transition-all duration-200 cursor-pointer ${
                docType === t.key
                  ? "text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
              style={docType === t.key ? { background: `color-mix(in srgb, ${moduleAccent} 25%, transparent)` } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all duration-250 cursor-pointer ${
          dragOver
            ? "scale-[1.02] border-opacity-100"
            : "border-opacity-30 hover:border-opacity-60"
        }`}
        style={{
          borderColor: moduleAccent,
          background: dragOver ? `color-mix(in srgb, ${moduleAccent} 8%, transparent)` : "transparent",
        }}
      >
        <Upload
          className={`w-6 h-6 mx-auto mb-2 transition-transform ${dragOver ? "scale-110" : ""}`}
          style={{ color: moduleAccent, opacity: 0.6 }}
        />
        <p className="text-xs text-slate-400 mb-0.5">
          Arraste arquivos aqui ou <span className="underline" style={{ color: moduleAccent }}>clique</span>
        </p>
        <p className="text-[10px] text-slate-600">{acceptLabel}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={(e) => { addFiles(e.target.files); if (inputRef.current) inputRef.current.value = "" }}
        className="hidden"
      />

      {/* Upload queue */}
      {queue.length > 0 && (
        <div className="space-y-1.5">
          {/* Progress summary */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
            <span>{done}/{total} completos</span>
            {isProcessing && <Loader2 className="w-3 h-3 animate-spin" style={{ color: moduleAccent }} />}
          </div>

          {/* Overall progress bar */}
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${total > 0 ? (done / total) * 100 : 0}%`,
                background: moduleAccent,
              }}
            />
          </div>

          {/* File list */}
          <div className="max-h-[140px] overflow-y-auto space-y-1">
            {queue.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg bg-white/[0.03]"
              >
                <FileText className="w-3 h-3 shrink-0 text-slate-600" />
                <span className="flex-1 truncate text-slate-400">{item.file.name}</span>
                <span className="text-slate-600 shrink-0">{formatSize(item.file.size)}</span>
                {item.status === "uploading" && <Loader2 className="w-3 h-3 animate-spin" style={{ color: moduleAccent }} />}
                {item.status === "done" && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                {item.status === "error" && (
                  <span title={item.error}>
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
