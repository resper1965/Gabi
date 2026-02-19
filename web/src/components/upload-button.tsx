"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, CheckCircle, AlertCircle, Loader2, X } from "lucide-react"

interface UploadButtonProps {
  onUpload: (file: File) => Promise<void>
  accept?: string
  moduleAccent?: string
  label?: string
  compact?: boolean
}

type UploadState = "idle" | "uploading" | "success" | "error"

export function UploadButton({
  onUpload,
  accept = ".pdf,.docx,.txt",
  moduleAccent = "var(--color-primary)",
  label = "Upload",
  compact = false,
}: UploadButtonProps) {
  const [state, setState] = useState<UploadState>("idle")
  const [error, setError] = useState<string>("")
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setState("uploading")
    setError("")
    try {
      await onUpload(file)
      setState("success")
      setTimeout(() => setState("idle"), 2500)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro no upload"
      setError(msg)
      setState("error")
      setTimeout(() => setState("idle"), 4000)
    }
  }, [onUpload])

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ""
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const icon = {
    idle: <Upload className="w-3.5 h-3.5" />,
    uploading: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    success: <CheckCircle className="w-3.5 h-3.5" />,
    error: <AlertCircle className="w-3.5 h-3.5" />,
  }[state]

  const stateStyles: Record<UploadState, React.CSSProperties> = {
    idle: { background: `color-mix(in srgb, ${moduleAccent} 15%, transparent)`, color: moduleAccent, border: `1px solid color-mix(in srgb, ${moduleAccent} 25%, transparent)` },
    uploading: { background: `color-mix(in srgb, ${moduleAccent} 10%, transparent)`, color: moduleAccent, border: `1px solid color-mix(in srgb, ${moduleAccent} 20%, transparent)`, opacity: 0.7 },
    success: { background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" },
    error: { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" },
  }

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        disabled={state === "uploading"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
          dragOver ? "ring-2 ring-offset-1 scale-105" : ""
        }`}
        style={{
          ...stateStyles[state],
          ...(dragOver ? { ringColor: moduleAccent } : {}),
        }}
        title={error || label}
      >
        {icon}
        {!compact && (
          <span>
            {state === "uploading" ? "Enviando..." : state === "success" ? "Enviado ✓" : state === "error" ? "Erro" : label}
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />
      {state === "error" && error && (
        <div className="absolute top-full mt-1 right-0 bg-red-950/90 text-red-300 text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-50 flex items-center gap-1">
          {error}
          <button onClick={() => setState("idle")} className="ml-1 cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}
